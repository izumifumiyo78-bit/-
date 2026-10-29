// ---------------------------------------------------------------------------
// crowd.js : up to 30,000 people, one quad each.
//
// At the distance a crowd is ever seen (40-120 m) a cylindrically billboarded
// quad with a per-pixel silhouette is indistinguishable from a modelled body,
// and it costs 2 triangles instead of 400. Everything about a spectator --
// pose, shirt, skin, hair, bobbing phase, when they leap up, when their phone
// flash goes off -- is derived in the shader from one instance seed.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makePerimeter, seatRows, BOWL } from './bowl.js';
import { litFragment, litVertex, SHADOW_VERT, litUniforms } from './shaderlib.js';

export function createCrowd(env, opts = {}) {
  const tier = Math.max(0, Math.min(2, opts.tier | 0));
  const skip = tier >= 2 ? 1 : tier >= 1 ? 3 : 6;        // seats per spectator
  const perimeter = makePerimeter();
  const rows = seatRows();
  const pitchStep = BOWL.seatPitch * skip;

  const pos = [];
  const seed = [];
  const p = {};
  for (const r of rows) {
    const n = Math.floor(perimeter.total / pitchStep);
    for (let i = 0; i < n; i++) {
      const t = (i + (r.row % 2) * 0.5) / n;
      // vomitories, and the press box behind the halfway line
      const arc = t * perimeter.total;
      if (Math.abs(((arc / BOWL.seatPitch) % 26) - 13) < 0.7) continue;
      if (Math.random() < 0.075) continue;                // empty seats
      perimeter.at(t, p);
      pos.push(p.x + p.nx * r.u, p.y + p.ny * r.u, r.v + 0.30);
      seed.push(Math.random(), Math.random(), Math.random(), r.tier);
    }
  }
  const count = seed.length / 4;

  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seed), 4));
  geo.instanceCount = count;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 10), 200);

  const uniforms = litUniforms(env.uniforms(), {
    uExcite: { value: 0.25 },     // 0 = bored, 1 = goal just went in
    uWave: { value: -99 },        // mexican wave phase (-99 = off)
    uHome1: { value: new THREE.Vector3(0.2, 0.3, 0.8) },
    uHome2: { value: new THREE.Vector3(0.9, 0.9, 0.9) },
    uAway1: { value: new THREE.Vector3(0.7, 0.15, 0.15) },
    uAway2: { value: new THREE.Vector3(0.1, 0.1, 0.1) },
  });

  const mat = new THREE.ShaderMaterial({
    uniforms,
    lights: true,
    transparent: false,
    side: THREE.DoubleSide,
    vertexShader: litVertex(/* glsl */`
      attribute vec3 aPos;
      attribute vec4 aSeed;
      uniform float uExcite;
      uniform float uWave;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vStand;
    `) + /* glsl */`
      void main(){
        vUv = uv;
        vSeed = aSeed;
        float id = aSeed.x + aSeed.y*7.0;
        // bored sway, excited bounce, and a travelling wave when one is called
        float phase = uTime*(1.8 + aSeed.y*1.4) + id*6.28;
        float excite = clamp(uExcite + aSeed.z*0.25, 0.0, 1.4);
        float wavePos = atan(aPos.y, aPos.x*0.8);
        float wave = uWave < -90.0 ? 0.0
          : exp(-pow((wavePos - uWave)*2.2, 2.0));
        float stand = clamp(excite*1.1 - 0.25 + wave, 0.0, 1.0);
        float hop = max(sin(phase*1.6), 0.0)*stand*0.22;
        vStand = stand;

        vec3 c = aPos;
        c.z += hop + stand*0.26;
        float h = mix(0.95, 1.30, stand) + aSeed.y*0.12;
        float w = 0.62 + aSeed.x*0.10;

        // cylindrical billboard: yaw to the camera, never pitch
        vec3 toCam = uCamPos - c;
        vec2 f = normalize(vec2(toCam.x, toCam.y) + 1e-5);
        vec3 right = vec3(-f.y, f.x, 0.0);
        vec3 sway = right*sin(phase*0.7)*0.035*(1.0 - stand*0.5);
        vec3 wp = c + right*(uv.x - 0.5)*w + vec3(0.0, 0.0, (uv.y - 0.5)*h) + sway;

        vWorld = wp;
        vNormalW = vec3(f, 0.35);
        vec4 worldPosition = vec4(wp, 1.0);
        vec3 transformedNormal = normalMatrix*vec3(f, 0.35);
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*worldPosition;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      uniform vec3 uHome1; uniform vec3 uHome2;
      uniform vec3 uAway1; uniform vec3 uAway2;
      uniform float uExcite;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vStand;
    `) + /* glsl */`
      void main(){
        vec2 uvv = vUv;
        float x = (uvv.x - 0.5)*2.0;         // -1..1 across the body
        float y = uvv.y;                      // 0 = seat, 1 = top of head

        // --- silhouette ---------------------------------------------------
        float headY = 0.82;
        float head = step(length(vec2(x*1.9, (y-headY)*1.55)), 0.26);
        float shoulderW = 0.80 + vSeed.x*0.12;
        float body = step(abs(x), shoulderW*(1.0 - smoothstep(0.55, 0.92, y)*0.45))
                   * step(y, headY - 0.055) * step(0.02, y);
        // arms up when standing: two raised columns either side of the head
        float arms = 0.0;
        if (vStand > 0.45){
          float ax = abs(abs(x) - 0.72);
          arms = step(ax, 0.17)*step(0.45, y)*step(y, 1.0);
        }
        float mask = clamp(head + body + arms, 0.0, 1.0);
        if (mask < 0.5) discard;

        // --- who is this -------------------------------------------------
        float home = step(vWorld.x, 0.0);
        float endness = smoothstep(26.0, 62.0, abs(vWorld.x));
        vec3 kitA = mix(uAway1, uHome1, home);
        vec3 kitB = mix(uAway2, uHome2, home);
        float pick = fract(vSeed.x*13.37 + vSeed.y*7.11);
        vec3 shirt = pick < 0.34 + endness*0.42 ? kitA
                   : pick < 0.52 + endness*0.30 ? kitB
                   : vec3(0.055, 0.058, 0.065) + vec3(hash12(vSeed.xy*31.0), hash12(vSeed.yz*17.0), hash12(vSeed.zx*23.0))*0.22;
        vec3 skinTone = mix(vec3(0.42, 0.28, 0.21), vec3(0.72, 0.52, 0.40), fract(vSeed.z*5.77));
        skinTone = mix(skinTone, vec3(0.16, 0.10, 0.07), step(0.72, fract(vSeed.z*5.77 + 0.3))*0.8);
        vec3 hair = mix(vec3(0.03, 0.025, 0.02), vec3(0.22, 0.16, 0.08), fract(vSeed.y*9.1));

        vec3 alb = shirt;
        if (head > 0.5){
          float hairLine = step(y, headY + 0.02 + 0.10*fract(vSeed.x*3.1));
          alb = hairLine > 0.5 ? skinTone : hair;
        }
        if (arms > 0.5 && head < 0.5 && body < 0.5) alb = mix(skinTone, shirt, step(y, 0.72));

        // Folds, and a deliberately cheap shade: this shader runs for every
        // pixel of thirty thousand people, so it gets a Lambert term, a
        // hemisphere ambient and one summed floodlight -- not the full BRDF,
        // not a shadow lookup (the stands are outside the shadow frustum).
        alb *= 0.84 + 0.22*hash12(floor(vec2(x*6.0, y*9.0)) + vSeed.xy*17.0);
        float curve = sqrt(max(1.0 - x*x*0.85, 0.0));

        vec3 P = vWorld;
        vec3 N = normalize(vec3(vNormalW.xy, 0.55) + vec3(x*0.8, 0.0, 0.0));
        vec3 V = normalize(uCamPos - P);
        float ao = (0.45 + 0.55*curve)*mix(0.55, 1.0, smoothstep(0.0, 0.5, y));
        float NoL = max(dot(N, uSunDir), 0.0);
        vec3 col = alb*RECIPROCAL_PI*uSunColor*NoL*curve;
        col += alb*skyIrradiance(N)*ao;
        if (uNight > 0.01){
          // one lumped rig: the stands are far enough that four is wasted
          vec3 lp = uFlood[0].xyz;
          vec3 d = lp - P;
          float att = uFlood[0].w*26000.0/max(dot(d, d), 64.0);
          col += alb*RECIPROCAL_PI*uFloodColor*att*0.5*uNight*ao*max(dot(N, normalize(d)), 0.25);
        }

        // --- phone flashes -------------------------------------------------
        // Only worth drawing at night, and rare enough to read as individual
        // pops rather than static.
        float flashRate = uNight*(0.00035 + uExcite*0.0016);
        float slot = floor(uTime*6.0);
        float fl = step(1.0 - flashRate, hash12(vec2(slot, vSeed.x*521.0 + vSeed.y*77.0)));
        col += vec3(1.0, 0.96, 0.88)*fl*step(y, 0.72)*step(0.48, y)*22.0;

        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.name = 'crowd';
  mesh.receiveShadow = true;

  let excite = 0.25;
  return {
    mesh,
    count,
    /** excitement 0..1, plus an optional mexican wave sweep. */
    update(dt, target) {
      excite += (target - excite) * Math.min(1, dt * 2.2);
      uniforms.uExcite.value = excite;
      if (uniforms.uWave.value > -90) {
        uniforms.uWave.value += dt * 1.7;
        if (uniforms.uWave.value > 4.2) uniforms.uWave.value = -99;
      }
    },
    startWave() { if (uniforms.uWave.value < -90) uniforms.uWave.value = -3.4; },
    setTeams(home, away) {
      const c = (hex) => new THREE.Color(hex).convertSRGBToLinear();
      const h1 = c(home.c1), h2 = c(home.c2);
      const a1 = c(away.away1 || away.c1), a2 = c(away.away2 || away.c2);
      uniforms.uHome1.value.set(h1.r, h1.g, h1.b);
      uniforms.uHome2.value.set(h2.r, h2.g, h2.b);
      uniforms.uAway1.value.set(a1.r, a1.g, a1.b);
      uniforms.uAway2.value.set(a2.r, a2.g, a2.b);
    },
  };
}

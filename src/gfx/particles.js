// ---------------------------------------------------------------------------
// particles.js : divots, dust, spray, confetti, rain and the ball's streak.
//
// The pool is pure GPU: a particle's whole life is a closed-form function of
// (spawn position, spawn velocity, age), so emitting costs one attribute
// write and simulating costs nothing. Rain is the same trick with a wrapped
// domain that follows the camera.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { ENV_UNIFORMS, litFragment, litVertex, litUniforms } from './shaderlib.js';

export const PT = { CLOD: 0, DUST: 1, SPRAY: 2, CONFETTI: 3, SPARK: 4 };

export function createParticles(env, opts = {}) {
  const MAX = opts.tier >= 2 ? 3072 : opts.tier >= 1 ? 1024 : 384;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;

  const aP0 = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const aV0 = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const aData = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
  const aCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
  for (const a of [aP0, aV0, aData, aCol]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aP0', aP0);
  geo.setAttribute('aV0', aV0);
  geo.setAttribute('aData', aData);
  geo.setAttribute('aCol', aCol);
  geo.instanceCount = MAX;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const mat = new THREE.ShaderMaterial({
    uniforms: litUniforms(env.uniforms()),
    lights: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: litVertex(/* glsl */`
      attribute vec3 aP0;
      attribute vec3 aV0;
      attribute vec4 aData;   // t0, life, size, type
      attribute vec4 aCol;    // rgb, seed
      varying vec2 vUv;
      varying vec4 vCol;
      varying float vType;
      varying float vAge;
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `) + /* glsl */`
      void main(){
        vUv = uv; vCol = aCol; vType = aData.w;
        float age = uTime - aData.x;
        float life = max(aData.y, 1e-3);
        vAge = age/life;
        if (age < 0.0 || age > life){
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vWorld = vec3(0.0); vNormalW = vec3(0.0,0.0,1.0);
          return;
        }
        // ballistic with linear drag, closed form
        float k = vType < 0.5 ? 0.9 : vType < 1.5 ? 2.6 : vType < 2.5 ? 1.1 : 1.9;
        float e = (1.0 - exp(-k*age))/k;
        vec3 p = aP0 + aV0*e + vec3(0.0, 0.0, -9.81)*(age*e*0.5);
        // dust rises and spreads; confetti flutters
        if (vType > 0.5 && vType < 1.5) p.z += age*0.35;
        if (vType > 2.5 && vType < 3.5){
          p.x += sin(age*3.1 + aCol.w*6.28)*0.35;
          p.y += cos(age*2.7 + aCol.w*6.28)*0.35;
        }
        p.z = max(p.z, vType < 0.5 ? 0.012 : 0.0);

        float grow = vType > 0.5 && vType < 1.5 ? (1.0 + vAge*3.4) : 1.0;
        float size = aData.z*grow*(1.0 - smoothstep(0.75, 1.0, vAge)*0.6);

        // billboard, with spin for the solid types
        vec3 toCam = normalize(uCamPos - p);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam) + 1e-5);
        vec3 up = cross(toCam, right);
        float spin = (aCol.w - 0.5)*age*(vType > 2.5 ? 9.0 : 4.0);
        vec2 q = (uv - 0.5)*size;
        vec2 r = vec2(q.x*cos(spin) - q.y*sin(spin), q.x*sin(spin) + q.y*cos(spin));
        vec3 wp = p + right*r.x + up*r.y;
        vWorld = wp;
        vNormalW = toCam;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      varying vec2 vUv;
      varying vec4 vCol;
      varying float vType;
      varying float vAge;
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `) + /* glsl */`
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c)*2.0;
        float a = 1.0;
        vec3 alb = vCol.rgb;
        if (vType < 0.5){                       // grass clod: ragged chunk
          float edge = 0.55 + 0.45*fbm(vUv*6.0 + vCol.w*31.0, 2);
          if (d > edge) discard;
          a = 1.0;
        } else if (vType < 1.5){                // dust: soft puff
          a = exp(-d*d*2.6)*(1.0 - vAge)*0.55;
          alb *= 1.0 + vAge*0.4;
        } else if (vType < 2.5){                // spray droplet
          if (d > 0.9) discard;
          a = (1.0 - vAge*0.7)*0.8;
        } else if (vType < 3.5){                // confetti / streamer
          if (abs(c.x) > 0.42 || abs(c.y) > 0.16) discard;
          a = 1.0;
        } else {                                 // spark
          a = exp(-d*d*5.0);
        }
        a *= smoothstep(1.0, 0.82, vAge);
        if (a < 0.01) discard;

        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = N;
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = 0.8; s.metal = 0.0; s.ao = 1.0; s.spec = 0.6;
        vec3 col;
        if (vType > 3.5){
          col = alb*6.0;
        } else {
          float shadow = getShadowMask();
          col = alb*RECIPROCAL_PI*uSunColor*mix(0.35, 1.0, shadow)*1.4;
          col += skyIrradiance(vec3(0.0,0.0,1.0))*alb*0.5;
          col += floodLights(s)*0.8;
        }
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.name = 'particles';

  let head = 0;
  let now = 0;
  const api = {
    mesh,
    setTime(t) { now = t; },
    emit(type, x, y, z, vx, vy, vz, size, life, r, g, b) {
      const i = head; head = (head + 1) % MAX;
      aP0.array[i * 3] = x; aP0.array[i * 3 + 1] = y; aP0.array[i * 3 + 2] = z;
      aV0.array[i * 3] = vx; aV0.array[i * 3 + 1] = vy; aV0.array[i * 3 + 2] = vz;
      aData.array[i * 4] = now; aData.array[i * 4 + 1] = life;
      aData.array[i * 4 + 2] = size; aData.array[i * 4 + 3] = type;
      aCol.array[i * 4] = r; aCol.array[i * 4 + 1] = g; aCol.array[i * 4 + 2] = b;
      aCol.array[i * 4 + 3] = Math.random();
      api.dirty = true;
    },
    dirty: false,
    /** A boot scuffing the turf: clods, dust and (when wet) spray. */
    kickSpray(x, y, dx, dy, power, wet) {
      const n = Math.min(10, 3 + Math.round(power * 6));
      for (let i = 0; i < n; i++) {
        const sp = 1.4 + Math.random() * 3.4 * power;
        const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
        api.emit(PT.CLOD, x, y, 0.03,
          -Math.cos(a) * sp, -Math.sin(a) * sp, 1.6 + Math.random() * 3.2 * power,
          0.045 + Math.random() * 0.055, 0.8 + Math.random() * 0.5,
          0.055 + Math.random() * 0.05, 0.11 + Math.random() * 0.06, 0.03);
      }
      api.emit(PT.DUST, x, y, 0.05, -dx * 0.5, -dy * 0.5, 0.5,
        0.35 + power * 0.3, 0.75, 0.10, 0.11, 0.085);
      if (wet > 0.35) {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * 6.283;
          api.emit(PT.SPRAY, x, y, 0.04,
            Math.cos(a) * (1 + Math.random() * 3), Math.sin(a) * (1 + Math.random() * 3),
            2 + Math.random() * 3, 0.03 + Math.random() * 0.03, 0.55,
            0.55, 0.62, 0.70);
        }
      }
    },
    /** Confetti and streamers when one goes in. */
    celebrate(x, y) {
      const cols = [[0.9, 0.2, 0.25], [0.95, 0.85, 0.2], [0.2, 0.55, 0.95], [0.95, 0.95, 0.95], [0.25, 0.85, 0.45]];
      for (let i = 0; i < 160; i++) {
        const a = Math.random() * 6.283;
        const r = Math.random() * 14;
        const c = cols[(Math.random() * cols.length) | 0];
        api.emit(PT.CONFETTI,
          x + Math.cos(a) * r, y + Math.sin(a) * r, 14 + Math.random() * 10,
          (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5, -0.5 - Math.random(),
          0.16 + Math.random() * 0.12, 7 + Math.random() * 4, c[0], c[1], c[2]);
      }
    },
    flush() {
      if (!api.dirty) return;
      aP0.needsUpdate = true; aV0.needsUpdate = true;
      aData.needsUpdate = true; aCol.needsUpdate = true;
      api.dirty = false;
    },
  };
  return api;
}

// --- rain ------------------------------------------------------------------
export function createRain(env, opts = {}) {
  const N = opts.tier >= 2 ? 9000 : opts.tier >= 1 ? 3500 : 1200;
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = Math.random();
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geo.instanceCount = N;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const uniforms = Object.assign(env.uniforms(), { uRain: { value: 0 } });
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      attribute vec4 aSeed;
      uniform float uRain;
      varying float vA;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        float SPAN = 62.0;
        float H = 30.0;
        float fall = 22.0 + aSeed.z*11.0;
        // a column of rain that follows the camera, wrapped in all three axes
        vec3 c = uCamPos;
        float t = uTime*fall + aSeed.w*1000.0;
        vec3 p;
        p.x = c.x + (fract(aSeed.x + uTime*0.02) - 0.5)*SPAN*2.0;
        p.y = c.y + (fract(aSeed.y*1.7 + uTime*0.013) - 0.5)*SPAN*2.0;
        p.z = H - mod(t, H);
        // wind shear
        p.xy += uWind*(H - p.z)*0.10;
        float len = 0.55 + aSeed.z*0.9;
        vec3 toCam = normalize(uCamPos - p);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam) + 1e-5);
        vec3 wp = p + right*(uv.x-0.5)*0.016 + vec3(0.0,0.0,1.0)*(uv.y-0.5)*len
                + vec3(uWind*0.06, 0.0)*(uv.y-0.5)*len;
        // fade the column out at its edge so the box never shows itself
        float far = length(p.xy - uCamPos.xy)/SPAN;
        vA = uRain*(0.25 + 0.75*aSeed.z)*(1.0 - smoothstep(0.45, 1.0, far));
        if (uRain < 0.01){ gl_Position = vec4(2.0,2.0,2.0,1.0); return; }
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      varying float vA;
      varying vec2 vUv;
      void main(){
        float a = vA*(1.0 - abs(vUv.x-0.5)*2.0)*smoothstep(0.0, 0.3, vUv.y);
        vec3 lit = (uSkyHorizon*2.5 + uFloodColor*uNight*0.18);
        gl_FragColor = vec4(lit*a*1.6, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  mesh.name = 'rain';
  return {
    mesh,
    set(v) { uniforms.uRain.value = v; },
  };
}

// --- ball streak -----------------------------------------------------------
export function createBallTrail(env) {
  const SEG = 26;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(SEG * 2 * 3);
  const uv = new Float32Array(SEG * 2 * 2);
  const idx = [];
  for (let i = 0; i < SEG; i++) {
    uv[(i * 2) * 2] = i / (SEG - 1); uv[(i * 2) * 2 + 1] = 0;
    uv[(i * 2 + 1) * 2] = i / (SEG - 1); uv[(i * 2 + 1) * 2 + 1] = 1;
    if (i + 1 < SEG) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const uniforms = Object.assign(env.uniforms(), { uAmt: { value: 0 } });
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      uniform float uAmt;
      varying vec2 vUv;
      void main(){
        float a = uAmt*pow(vUv.x, 2.2)*(1.0 - abs(vUv.y-0.5)*2.0);
        vec3 c = mix(uSkyHorizon*1.2, uFloodColor, uNight)*0.5 + vec3(0.25);
        gl_FragColor = vec4(c*a*0.9, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.name = 'balltrail';

  const hist = [];
  const tmp = new THREE.Vector3();
  const side = new THREE.Vector3();
  return {
    mesh,
    update(ball, camPos) {
      const sp = Math.hypot(ball.vx, ball.vy, ball.vz);
      hist.push(ball.x, ball.y, ball.z);
      while (hist.length > SEG * 3) hist.shift();
      const amt = Math.max(0, Math.min(1, (sp - 13) / 20));
      uniforms.uAmt.value = amt;
      mesh.visible = amt > 0.02;
      if (!mesh.visible) { hist.length = 0; return; }
      const count = hist.length / 3;
      for (let i = 0; i < SEG; i++) {
        const j = Math.max(0, count - SEG + i);
        const x = hist[j * 3] || ball.x, y = hist[j * 3 + 1] || ball.y, z = hist[j * 3 + 2] || ball.z;
        tmp.set(x - camPos.x, y - camPos.y, z - camPos.z);
        // ribbon width across the view direction
        const nx = hist[Math.min(j + 1, count - 1) * 3] - x;
        const ny = hist[Math.min(j + 1, count - 1) * 3 + 1] - y;
        const nz = hist[Math.min(j + 1, count - 1) * 3 + 2] - z;
        side.set(nx, ny, nz).cross(tmp);
        if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
        side.normalize().multiplyScalar(0.055 * (0.35 + i / SEG));
        pos[(i * 2) * 3] = x - side.x;
        pos[(i * 2) * 3 + 1] = y - side.y;
        pos[(i * 2) * 3 + 2] = z - side.z;
        pos[(i * 2 + 1) * 3] = x + side.x;
        pos[(i * 2 + 1) * 3 + 1] = y + side.y;
        pos[(i * 2 + 1) * 3 + 2] = z + side.z;
      }
      geo.getAttribute('position').needsUpdate = true;
    },
  };
}

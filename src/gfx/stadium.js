// ---------------------------------------------------------------------------
// stadium.js : the bowl, the seats, the roof and the steel.
//
// Generated from bowl.js: one swept grid for the terraces (with the seats
// drawn analytically in the fragment shader, including section tifo), one for
// the cantilever roof, plus trusses, dugouts and corner flags. Concrete gets
// a real aggregate/stain treatment because flat grey concrete is the fastest
// way to make a render look like a 2003 tech demo.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { BOWL, makePerimeter, makeProfile } from './bowl.js';
import { litFragment, litVertex, SHADOW_VERT, litUniforms } from './shaderlib.js';

const PERIM_SEGS = 288;

function sweep(perimeter, profile, segs, flipUp = false) {
  const V = profile.length;
  const pos = new Float32Array(segs * V * 3);
  const nrm = new Float32Array(segs * V * 3);
  const uvs = new Float32Array(segs * V * 2);
  const inf = new Float32Array(segs * V * 3);   // arc metres, tier, row
  const idx = [];
  const p0 = {};
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    perimeter.at(t, p0);
    for (let j = 0; j < V; j++) {
      const s = profile[j];
      const k = (i * V + j);
      pos[k * 3] = p0.x + p0.nx * s.u;
      pos[k * 3 + 1] = p0.y + p0.ny * s.u;
      pos[k * 3 + 2] = s.v;
      // surface normal from the profile slope, rotated into the sweep frame
      const prev = profile[Math.max(j - 1, 0)], next = profile[Math.min(j + 1, V - 1)];
      const du = next.u - prev.u, dv = next.v - prev.v;
      const dl = Math.hypot(du, dv) || 1;
      // profile-space normal (-dv, du) faces the inside of the bowl: up on a
      // tread, toward the pitch on a riser.
      let nu = -dv / dl, nv = du / dl;
      if (flipUp && nv < 0) { nu = -nu; nv = -nv; }
      let nx = p0.nx * nu, ny = p0.ny * nu, nz = nv;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nrm[k * 3] = nx / nl; nrm[k * 3 + 1] = ny / nl; nrm[k * 3 + 2] = nz / nl;
      uvs[k * 2] = t * perimeter.total;
      uvs[k * 2 + 1] = s.v;
      inf[k * 3] = t * perimeter.total;
      inf[k * 3 + 1] = s.tier;
      inf[k * 3 + 2] = s.row;
    }
  }
  for (let i = 0; i < segs - 1; i++) {
    for (let j = 0; j < V - 1; j++) {
      const a = i * V + j, b = a + V;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setAttribute('aInfo', new THREE.BufferAttribute(inf, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Shared boilerplate for an opaque, shadow-receiving world-space material. */
function worldMaterial(env, { vertex = '', fragment = '', uniforms = {}, extraVert = '', side, instanced = false } = {}) {
  // An InstancedMesh needs the instance transform applied by hand: three only
  // injects it for its own materials, never for a raw ShaderMaterial.
  const model = instanced ? 'modelMatrix*instanceMatrix' : 'modelMatrix';
  const nrmMat = instanced ? 'mat3(modelMatrix*instanceMatrix)' : 'mat3(modelMatrix)';
  const nrmView = instanced ? 'normalMatrix*(mat3(instanceMatrix)*nor)' : 'normalMatrix*nor';
  return new THREE.ShaderMaterial({
    uniforms: litUniforms(env.uniforms(), uniforms),
    lights: true,
    side: side || THREE.FrontSide,
    vertexShader: litVertex(extraVert) + /* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main(){
        vec3 pos = position;
        vec3 nor = normal;
        ${vertex}
        vec4 wp = ${model}*vec4(pos, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(${nrmMat}*nor);
        vec4 worldPosition = wp;
        vec3 transformedNormal = ${nrmView};
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `) + fragment,
  });
}

// --- concrete / seating ----------------------------------------------------
const CONCRETE_FRAG = /* glsl */`
  uniform vec3 uHome1; uniform vec3 uHome2;
  uniform vec3 uAway1; uniform vec3 uAway2;
  attributeHack
  varying vec3 vInfo;
  void main(){
    vec3 P = vWorld;
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamPos - P);
    float arc = vInfo.x, tier = vInfo.y;

    // --- concrete -----------------------------------------------------
    float grain = fbm(P.xy*vec2(2.1, 2.1) + P.z*1.7, 4);
    vec3 agg = voronoi(P.xy*7.0 + P.z*3.0);
    vec3 conc = mix(vec3(0.112, 0.115, 0.122), vec3(0.052, 0.054, 0.060), grain*0.8);
    conc = mix(conc, vec3(0.090, 0.086, 0.074), smoothstep(0.08, 0.0, agg.x)*0.5);
    // water staining runs down the risers
    float stain = smoothstep(0.35, 0.9, fbm(vec2(arc*0.6, P.z*1.1), 4))*(1.0 - abs(N.z));
    conc = mix(conc, conc*0.55, stain*0.6);
    vec3 alb = conc;
    float rough = 0.86 - grain*0.08;
    float ao = mix(0.55, 1.0, smoothstep(0.0, 6.0, P.z))*mix(0.7, 1.0, abs(N.z));

    // --- seats --------------------------------------------------------
    if (tier >= 0.0){
      float seat = arc/${BOWL.seatPitch.toFixed(3)};
      float si = floor(seat);
      float sf = fract(seat);
      float aisle = step(0.986, fract(si/26.0 + 0.5));   // vomitory gaps
      // section colour: ends take the two sets of club colours, sides mix
      float endness = smoothstep(32.0, 70.0, abs(P.x));
      float home = step(P.x, 0.0);
      vec3 base = mix(vec3(0.045, 0.048, 0.055),
                      mix(mix(uAway1, uAway2, 0.35), mix(uHome1, uHome2, 0.35), home),
                      endness*0.85);
      // tifo blocks: big chequers of the club colours up in the tiers
      float blockA = step(0.5, mod(floor(arc/9.0) + floor(P.z/3.2), 2.0));
      base = mix(base, mix(base, home > 0.5 ? uHome2 : uAway2, 0.75), blockA*endness*0.45);
      float shell = 1.0 - smoothstep(0.30, 0.46, abs(sf-0.5));
      shell *= 1.0 - aisle;
      float backrest = smoothstep(0.0, 0.25, fract(P.z/0.42));
      vec3 seatCol = base*(0.75 + 0.45*shell)*(0.8 + 0.3*backrest);
      float m = shell*step(0.3, abs(N.z) + 0.3);
      alb = mix(alb, seatCol, m*0.92);
      rough = mix(rough, 0.42, m);
      ao *= mix(1.0, 0.72, m);
    }

    Surface s;
    s.P = P; s.N = N; s.V = V; s.albedo = alb;
    s.rough = clamp(rough, 0.05, 1.0); s.metal = 0.0; s.ao = ao; s.spec = 1.0;
    float shadow = getShadowMask();
    vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
    col += ambientLight(s);
    col += floodLights(s)*(0.35 + 0.65*shadow);
    col = applyFog(col, P, V);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ROOF_FRAG = /* glsl */`
  varying vec3 vInfo;
  void main(){
    vec3 P = vWorld;
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamPos - P);
    bool under = N.z < 0.0 || dot(N, V) < 0.0;
    float panel = step(0.5, mod(floor(vInfo.x/4.0), 2.0));
    vec3 alb = mix(vec3(0.185, 0.195, 0.210), vec3(0.150, 0.158, 0.172), panel);
    float rib = smoothstep(0.08, 0.0, abs(fract(vInfo.x/1.35)-0.5)-0.42);
    alb = mix(alb, vec3(0.085, 0.090, 0.100), rib*0.8);
    float rough = mix(0.46, 0.30, rib);
    if (under) alb *= 0.34;
    Surface s;
    s.P = P; s.N = N; s.V = V; s.albedo = alb;
    s.rough = rough; s.metal = 0.25; s.ao = under ? 0.45 : 1.0; s.spec = 1.0;
    float shadow = getShadowMask();
    vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
    col += ambientLight(s);
    col += floodLights(s)*0.6;
    // the inner lip carries an LED strip: cheap, and it reads as "modern"
    float lip = smoothstep(1.2, 0.0, vInfo.z);
    col += vec3(0.65, 0.78, 1.0)*lip*uNight*1.4;
    col = applyFog(col, P, V);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createStadium(env, opts = {}) {
  const group = new THREE.Group();
  group.name = 'stadium';
  const perimeter = makePerimeter();
  const profile = makeProfile();
  const segs = opts.tier >= 2 ? PERIM_SEGS : 192;

  const clubColor = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const colors = {
    uHome1: { value: new THREE.Vector3(0.1, 0.2, 0.6) },
    uHome2: { value: new THREE.Vector3(0.9, 0.9, 0.95) },
    uAway1: { value: new THREE.Vector3(0.6, 0.1, 0.12) },
    uAway2: { value: new THREE.Vector3(0.1, 0.1, 0.12) },
  };

  // --- terraces ------------------------------------------------------------
  const standGeo = sweep(perimeter, profile, segs);
  const standMat = worldMaterial(env, {
    uniforms: colors,
    extraVert: 'attribute vec3 aInfo;\nvarying vec3 vInfo;',
    vertex: 'vInfo = aInfo;',
    fragment: CONCRETE_FRAG.replace('attributeHack', ''),
    side: THREE.DoubleSide,
  });
  const stands = new THREE.Mesh(standGeo, standMat);
  stands.receiveShadow = true;
  stands.name = 'stands';
  group.add(stands);

  // --- roof ----------------------------------------------------------------
  // Cantilever: from the back of the upper tier, inward over the seats, with
  // a slight rise so the underside catches the floodlights.
  const top = profile[profile.length - 1];
  const roofProfile = [];
  const tipU = BOWL.moat + BOWL.lower.rows * BOWL.lower.tread * 0.52;
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const u = THREE.MathUtils.lerp(top.u + 2.2, tipU, f);
    const v = top.v + 4.0 + Math.pow(1 - f, 1.4) * 2.2 - f * 0.6;
    roofProfile.push({ u, v, tier: -1, row: -1, face: 'tread', tip: f });
  }
  const roofGeo = sweep(perimeter, roofProfile, segs, true);
  {
    // bake the cantilever parameter into aInfo.z so the shader can find the lip
    const inf = roofGeo.getAttribute('aInfo');
    const V = roofProfile.length;
    for (let i = 0; i < segs; i++) {
      for (let j = 0; j < V; j++) inf.setZ(i * V + j, (1 - j / (V - 1)) * 2.0);
    }
    inf.needsUpdate = true;
  }
  const roofMat = worldMaterial(env, {
    extraVert: 'attribute vec3 aInfo;\nvarying vec3 vInfo;',
    vertex: 'vInfo = aInfo;',
    fragment: ROOF_FRAG,
    side: THREE.DoubleSide,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.castShadow = !!opts.roofShadow;
  roof.name = 'roof';
  group.add(roof);

  // --- roof trusses --------------------------------------------------------
  const trussMat = worldMaterial(env, {
    instanced: true,
    fragment: /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = vec3(0.075, 0.080, 0.090);
        s.rough = 0.38; s.metal = 0.72; s.ao = 0.7; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*0.7;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const trussCount = opts.tier >= 2 ? 72 : 44;
  const beam = new THREE.BoxGeometry(1, 1, 1);
  const trusses = new THREE.InstancedMesh(beam, trussMat, trussCount * 3);
  const mt = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pp = {};
  let ti = 0;
  for (let i = 0; i < trussCount; i++) {
    const t = i / trussCount;
    perimeter.at(t, pp);
    const ang = Math.atan2(pp.ny, pp.nx);
    const inner = new THREE.Vector3(pp.x + pp.nx * tipU, pp.y + pp.ny * tipU, top.v + 5.4);
    const outer = new THREE.Vector3(pp.x + pp.nx * (top.u + 2.2), pp.y + pp.ny * (top.u + 2.2), top.v + 4.2);
    // main beam
    const mid = inner.clone().lerp(outer, 0.5);
    const len = inner.distanceTo(outer);
    q.setFromEuler(new THREE.Euler(0, 0, ang));
    sc.set(len, 0.34, 0.5);
    mt.compose(mid, q, sc);
    trusses.setMatrixAt(ti++, mt);
    // vertical hanger + diagonal
    for (let s2 = 0; s2 < 2; s2++) {
      const f = 0.3 + s2 * 0.4;
      const base = inner.clone().lerp(outer, f);
      const h = 1.4 + s2 * 0.5;
      mt.compose(new THREE.Vector3(base.x, base.y, base.z + h * 0.5), q, sc.set(0.26, 0.26, h));
      trusses.setMatrixAt(ti++, mt);
    }
  }
  trusses.count = ti;
  trusses.name = 'trusses';
  group.add(trusses);

  // --- pitch-side wall + photographers' moat ------------------------------
  const wallMat = worldMaterial(env, {
    fragment: /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        float g = fbm(P.xy*3.0 + P.z*2.0, 3);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.065,0.070,0.078), vec3(0.030,0.032,0.038), g);
        s.rough = 0.80; s.metal = 0.0; s.ao = mix(0.45, 1.0, smoothstep(0.0, 1.6, P.z)); s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*0.8;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  // --- dugouts -------------------------------------------------------------
  const dugout = new THREE.Group();
  for (const side of [-1, 1]) {
    const g2 = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(9.0, 2.6, 1.9), wallMat);
    shell.position.set(side * 13.5, -(PITCH.halfW + 5.2), 0.95);
    g2.add(shell);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.12, 1.1), wallMat);
    glass.position.set(side * 13.5, -(PITCH.halfW + 3.95), 1.5);
    g2.add(glass);
    dugout.add(g2);
  }
  group.add(dugout);

  // --- corner flags --------------------------------------------------------
  const flagMat = worldMaterial(env, {
    uniforms: {},
    extraVert: 'varying vec2 vFlagUv;',
    vertex: /* glsl */`
      vFlagUv = uv;
      float w = uv.x;
      pos.y += sin(uTime*7.0 + uv.x*5.0)*0.10*w*w;
      pos.z += sin(uTime*5.3 + uv.x*7.0)*0.05*w;
    `,
    fragment: /* glsl */`
      varying vec2 vFlagUv;
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.55,0.12,0.03), vec3(0.62,0.52,0.03), step(0.5, fract(vFlagUv.x*2.0)));
        s.rough = 0.72; s.metal = 0.0; s.ao = 1.0; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  const poleMat = worldMaterial(env, {
    fragment: /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = vec3(0.42,0.44,0.46);
        s.rough = 0.35; s.metal = 0.1; s.ao = 1.0; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const poleGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.5, 8);
  poleGeo.rotateX(Math.PI / 2);
  const flagGeo = new THREE.PlaneGeometry(0.45, 0.30, 6, 2);
  flagGeo.rotateX(Math.PI / 2);          // stand it up in the XZ plane
  flagGeo.translate(0.225, 0, 0);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(sx * PITCH.halfL, sy * PITCH.halfW, 0.75);
      pole.castShadow = true;
      group.add(pole);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(sx * PITCH.halfL, sy * PITCH.halfW, 1.35);
      flag.rotation.z = sx > 0 ? (sy > 0 ? 2.3 : 3.9) : (sy > 0 ? 0.8 : -0.8);
      group.add(flag);
    }
  }

  return {
    group,
    perimeter,
    profile,
    roofTop: top,
    tipU,
    setTeams(home, away) {
      const h1 = clubColor(home.c1), h2 = clubColor(home.c2);
      const a1 = clubColor(away.away1 || away.c1), a2 = clubColor(away.away2 || away.c2);
      colors.uHome1.value.set(h1.r, h1.g, h1.b);
      colors.uHome2.value.set(h2.r, h2.g, h2.b);
      colors.uAway1.value.set(a1.r, a1.g, a1.b);
      colors.uAway2.value.set(a2.r, a2.g, a2.b);
    },
  };
}

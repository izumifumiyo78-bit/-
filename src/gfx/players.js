// ---------------------------------------------------------------------------
// players.js : 22 footballers, 15 draw calls.
//
// Every limb type is one InstancedMesh; the rig (rig.js) produces joint
// positions on the CPU and each instance matrix maps a normalised, tapered
// capsule onto a bone. The kits are generated in the shader -- pattern, collar,
// piping, squad number, woven fabric normal, sheen, sweat and mud -- from a
// handful of per-instance attributes, so a club's strip costs no memory and
// every player can look different.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { litFragment, litVertex, SHADOW_VERT, litUniforms } from './shaderlib.js';
import { poseOf, J } from './rig.js';

// --- geometry --------------------------------------------------------------
/** Tapered capsule: unit length along +Z, unit radius at z=0. */
function boneGeo(taper = 0.75, radial = 10, rings = 4, cap0 = 1, cap1 = 1, squash = 1) {
  const pos = [], nrm = [], uvs = [], idx = [];
  const rows = [];
  const capSteps = 3;
  for (let i = capSteps; i >= 1; i--) {
    const a = (i / capSteps) * Math.PI * 0.5;
    rows.push({ z: -Math.sin(a) * cap0 * 0.9, r: Math.cos(a), nz: -Math.sin(a), v: 0 });
  }
  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    rows.push({ z: v, r: 1 + (taper - 1) * v, nz: 0, v });
  }
  for (let i = 1; i <= capSteps; i++) {
    const a = (i / capSteps) * Math.PI * 0.5;
    rows.push({ z: 1 + Math.sin(a) * cap1 * 0.9 * taper, r: taper * Math.cos(a), nz: Math.sin(a), v: 1 });
  }
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let s = 0; s <= radial; s++) {
      const th = (s / radial) * Math.PI * 2;
      const cx = Math.cos(th) * squash, sy = Math.sin(th);
      pos.push(cx * row.r, sy * row.r, row.z);
      const nl = Math.hypot(cx, sy, row.nz) || 1;
      nrm.push(cx / nl, sy / nl, row.nz / nl);
      uvs.push(s / radial, row.v);
    }
  }
  const W = radial + 1;
  for (let r = 0; r < rows.length - 1; r++) {
    for (let s = 0; s < radial; s++) {
      const a = r * W + s, b = a + W;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/** Torso: elliptical cross-section with a waist, chest and shoulder flare. */
function torsoGeo(radial = 16) {
  const profile = [
    [0.00, 0.98, 1.00], [0.14, 0.90, 0.98], [0.32, 0.92, 1.02],
    [0.52, 1.02, 1.06], [0.72, 1.12, 1.04], [0.88, 1.05, 0.95],
    [1.00, 0.62, 0.80],
  ];
  const pos = [], nrm = [], uvs = [], idx = [];
  const DEPTH = 0.66;
  for (let r = 0; r < profile.length; r++) {
    const [v, rad, dep] = profile[r];
    for (let s = 0; s <= radial; s++) {
      const th = (s / radial) * Math.PI * 2;
      const x = Math.cos(th) * rad * DEPTH * dep;
      const y = Math.sin(th) * rad;
      pos.push(x, y, v);
      const nx = Math.cos(th) / (DEPTH * dep), ny = Math.sin(th);
      const prev = profile[Math.max(r - 1, 0)], next = profile[Math.min(r + 1, profile.length - 1)];
      const slope = (next[1] - prev[1]) / Math.max(next[0] - prev[0], 1e-3);
      const nl = Math.hypot(nx, ny, -slope) || 1;
      nrm.push(nx / nl, ny / nl, -slope / nl);
      uvs.push(s / radial, v);
    }
  }
  const W = radial + 1;
  for (let r = 0; r < profile.length - 1; r++) {
    for (let s = 0; s < radial; s++) {
      const a = r * W + s, b = a + W;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

// --- squad number texture (drawn once, at runtime, never loaded) -----------
function makeNumberTexture() {
  const CELL = 96, H = 128;
  const c = document.createElement('canvas');
  c.width = CELL * 10; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, H);
  g.fillStyle = '#ffffff';
  g.font = `900 ${Math.round(H * 0.92)}px "Arial Black", Impact, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let d = 0; d < 10; d++) g.fillText(String(d), CELL * d + CELL / 2, H * 0.52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// --- shared shader pieces --------------------------------------------------
const INSTANCE_ATTRS = /* glsl */`
  attribute vec4 aColA;   // shirt primary rgb, pattern id
  attribute vec4 aColB;   // shirt secondary rgb, squad number
  attribute vec4 aColC;   // shorts rgb, sweat 0..1
  attribute vec4 aColD;   // socks rgb, mud 0..1
  attribute vec4 aColE;   // skin rgb, hair style
  attribute vec4 aColF;   // hair rgb, user highlight
  attribute vec4 aFlags;  // isGK, speed, seed, team
`;

const FABRIC = /* glsl */`
  // Woven cloth: warp and weft at right angles, plus a little slub noise.
  vec3 weaveNormal(vec2 uv, vec3 N, vec3 T, vec3 B, float scale, float amp){
    float warp = sin(uv.x*scale*6.2831);
    float weft = sin(uv.y*scale*6.2831*1.12);
    float slub = fbm(uv*scale*0.45, 2) - 0.5;
    vec3 n = normalize(N + T*(warp*amp + slub*amp*0.6) + B*(weft*amp));
    return n;
  }
  // Charlie sheen lobe on top of a wrapped diffuse: reads as cloth, not vinyl.
  vec3 clothShade(Surface s, vec3 L, vec3 radiance, vec3 sheenColor, float sheenRough){
    vec3 H = normalize(L+s.V);
    float NoL = max(dot(s.N, L), 0.0);
    float NoV = max(dot(s.N, s.V), 1e-4);
    float NoH = max(dot(s.N, H), 0.0);
    float VoH = max(dot(s.V, H), 0.0);
    float wrap = wrapDiffuse(dot(s.N, L), 0.22);
    vec3 diff = s.albedo*RECIPROCAL_PI*wrap;
    float Ds = D_Charlie(NoH, sheenRough);
    float Vs = V_Ashikhmin(NoV, NoL);
    vec3 sheen = sheenColor*Ds*Vs;
    float a = max(s.rough*s.rough, 2e-3);
    vec3 F = F_Schlick(vec3(0.035), VoH);
    vec3 spec = F*D_GGX(NoH, a)*V_SmithGGX(NoV, NoL, a);
    return (diff + sheen + spec*0.6)*radiance*max(NoL, 0.0001);
  }
`;

function instancedVertex(extra, body) {
  return litVertex(INSTANCE_ATTRS + /* glsl */`
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec2 vUv;
    varying vec4 vA; varying vec4 vB; varying vec4 vC;
    varying vec4 vD; varying vec4 vE; varying vec4 vF; varying vec4 vFl;
    ${extra}
  `) + /* glsl */`
    void main(){
      vUv = uv;
      vA = aColA; vB = aColB; vC = aColC; vD = aColD; vE = aColE; vF = aColF; vFl = aFlags;
      vec3 pos = position;
      vec3 nor = normal;
      ${body}
      vec4 wp = modelMatrix*instanceMatrix*vec4(pos, 1.0);
      mat3 im = mat3(instanceMatrix);
      vWorld = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix)*(im*nor));
      vec4 worldPosition = wp;
      vec3 transformedNormal = normalMatrix*(im*nor);
      ${SHADOW_VERT}
      gl_Position = projectionMatrix*viewMatrix*wp;
    }
  `;
}

function instancedFragment(body, extra = '') {
  return litFragment(/* glsl */`
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec2 vUv;
    varying vec4 vA; varying vec4 vB; varying vec4 vC;
    varying vec4 vD; varying vec4 vE; varying vec4 vF; varying vec4 vFl;
    ${FABRIC}
    ${extra}
  `) + body;
}

// The tangent frame for a bone: u runs around, v runs along.
const BONE_FRAME = /* glsl */`
  vec3 N = normalize(vNormalW);
  vec3 up = normalize(vec3(0.0, 0.0, 1.0));
  vec3 T = normalize(cross(up, N) + 1e-5);
  vec3 B = cross(N, T);
`;

export function createPlayers(env, opts = {}) {
  const MAX = 24;
  const tier = opts.tier | 0;
  const radial = tier >= 2 ? 12 : 8;
  const group = new THREE.Group();
  group.name = 'players';

  const attrs = {
    aColA: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aColB: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aColC: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aColD: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aColE: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aColF: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
    aFlags: new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4),
  };
  for (const k in attrs) attrs[k].setUsage(THREE.DynamicDrawUsage);

  const numTex = makeNumberTexture();
  const shared = () => litUniforms(env.uniforms(), { uNum: { value: numTex } });

  const withAttrs = (g) => {
    const c = g.clone();
    for (const k in attrs) c.setAttribute(k, attrs[k]);
    return c;
  };

  // --- materials -----------------------------------------------------------
  const shirtMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', /* glsl */`
      // the shirt is loose: the hem and the back flutter with pace and wind
      float loose = smoothstep(0.55, 0.0, pos.z)*0.6 + smoothstep(0.35, 0.95, pos.z)*0.25;
      float sp = aFlags.y;
      float f = sin(pos.z*9.0 - uTime*(7.0 + sp*2.5) + aFlags.z*6.28)
              * (0.012 + sp*0.0075 + length(uWind)*0.006);
      pos += nor*f*loose;
    `),
    fragmentShader: instancedFragment(/* glsl */`
      uniform sampler2D uNum;
      void main(){
        vec3 P = vWorld;
        ${BONE_FRAME}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        float pattern = vA.w;
        vec3 c1 = vA.xyz, c2 = vB.xyz;
        float back = smoothstep(0.18, 0.32, abs(u - 0.5));   // 1 on the back/front midline

        // --- kit pattern -------------------------------------------------
        vec3 alb = c1;
        if (pattern < 0.5){                      // plain, with a tonal panel
          alb = mix(c1, c1*0.86, smoothstep(0.45, 0.55, abs(u-0.5)));
        } else if (pattern < 1.5){                // vertical stripes
          float s = step(0.5, fract(u*10.0));
          alb = mix(c1, c2, s);
        } else if (pattern < 2.5){                // hoops
          float s = step(0.5, fract(v*7.0));
          alb = mix(c1, c2, s);
        } else if (pattern < 3.5){                // sash
          float d = abs(fract(u + v*0.85 + 0.25) - 0.5);
          alb = mix(c2, c1, smoothstep(0.10, 0.16, d));
        } else {                                  // halves
          alb = mix(c1, c2, step(0.5, fract(u + 0.25)));
        }
        // collar + sleeve trim + hem piping
        float collar = smoothstep(0.90, 0.97, v);
        alb = mix(alb, c2, collar*0.9);
        alb = mix(alb, c2*0.9, smoothstep(0.055, 0.0, v)*0.8);

        // --- squad number on the back ------------------------------------
        float num = vB.w;
        if (num > 0.5){
          vec2 nuv = vec2((u - 0.5)*3.4 + 0.5, (v - 0.46)*2.6);
          float tens = floor(num/10.0);
          float ones = mod(num, 10.0);
          float glyph = 0.0;
          if (tens < 0.5){
            if (nuv.x > 0.25 && nuv.x < 0.75 && nuv.y > 0.0 && nuv.y < 1.0)
              glyph = texture2D(uNum, vec2((ones + (nuv.x-0.25)*2.0)/10.0, 1.0-nuv.y)).r;
          } else {
            if (nuv.x > 0.06 && nuv.x < 0.94 && nuv.y > 0.0 && nuv.y < 1.0){
              float which = step(0.5, nuv.x);
              float local = (nuv.x - (which > 0.5 ? 0.5 : 0.06))/0.44;
              float d = mix(tens, ones, which);
              glyph = texture2D(uNum, vec2((d + local)/10.0, 1.0-nuv.y)).r;
            }
          }
          // printed vinyl: slightly glossier than the cloth around it
          float lum = dot(c1, vec3(0.299, 0.587, 0.114));
          vec3 numCol = lum > 0.22 ? vec3(0.02) : vec3(0.78);
          alb = mix(alb, numCol, glyph*step(0.5, 1.0 - step(0.42, abs(u-0.5))));
        }

        // --- fabric ------------------------------------------------------
        float px = max(length(vec2(dFdx(vUv.x), dFdy(vUv.x))), 1e-5);
        float micro = 1.0 - smoothstep(0.004, 0.03, px);
        vec3 Nw = weaveNormal(vUv*vec2(1.0, 2.0), N, T, B, 190.0, 0.055*micro);
        // folds that follow the body
        float fold = fbmS(vec2(u*9.0, v*14.0) + vFl.z*17.0, 3);
        Nw = normalize(Nw + T*fold*0.22 + B*fold*0.12);
        alb *= 0.93 + 0.14*fbm(vUv*vec2(14.0, 22.0) + vFl.z*5.0, 3);
        alb *= 1.0 - max(fold, 0.0)*0.10;

        // --- sweat + mud --------------------------------------------------
        float sweat = vC.w;
        float sweatMask = smoothstep(0.45, 0.95, fbm(vUv*vec2(5.0, 7.0) + 3.1, 3))
                        * (smoothstep(0.75, 0.35, v) + smoothstep(0.55, 0.95, v)*0.6);
        sweatMask = clamp(sweatMask*sweat*1.6, 0.0, 1.0);
        float mud = clamp(vD.w*smoothstep(0.42, 0.0, v)*fbm(vUv*11.0, 3)*2.2, 0.0, 1.0);
        alb = mix(alb, alb*0.45, sweatMask);
        alb = mix(alb, vec3(0.075, 0.055, 0.038), mud*0.85);

        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = mix(0.68, 0.30, sweatMask) + mud*0.2;
        s.metal = 0.0;
        s.ao = 0.78 + 0.22*v;
        s.spec = 1.0 + sweatMask*2.0;
        float shadow = getShadowMask();
        vec3 sheenCol = vec3(0.085)*(1.0 + 1.6*sweatMask);
        vec3 col = clothShade(s, uSunDir, uSunColor*shadow, sheenCol, 0.32);
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `),
  });

  const clothPart = (colorExpr, roughExpr, extras = '') => new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', /* glsl */`
      float f = sin(pos.z*11.0 - uTime*8.0 + aFlags.z*6.28)*0.006*aFlags.y;
      pos += nor*f*smoothstep(0.7, 0.0, pos.z);
    `),
    fragmentShader: instancedFragment(/* glsl */`
      void main(){
        vec3 P = vWorld;
        ${BONE_FRAME}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        vec3 alb = ${colorExpr};
        ${extras}
        float px = max(length(vec2(dFdx(vUv.x), dFdy(vUv.x))), 1e-5);
        float micro = 1.0 - smoothstep(0.004, 0.03, px);
        vec3 Nw = weaveNormal(vUv*vec2(1.0, 3.0), N, T, B, 150.0, 0.05*micro);
        float fold = fbmS(vec2(u*11.0, v*18.0) + vFl.z*9.0, 3);
        Nw = normalize(Nw + T*fold*0.25);
        alb *= 0.92 + 0.15*fbm(vUv*vec2(12.0, 26.0), 3);
        float mud = clamp(vD.w*fbm(vUv*13.0, 3)*2.0*smoothstep(0.8, 0.1, v), 0.0, 1.0);
        alb = mix(alb, vec3(0.070, 0.052, 0.036), mud*0.9);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = ${roughExpr}; s.metal = 0.0; s.ao = 0.80 + 0.2*v; s.spec = 1.0 + vC.w;
        float shadow = getShadowMask();
        vec3 col = clothShade(s, uSunDir, uSunColor*shadow, vec3(0.075), 0.34);
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `),
  });

  // shorts: body colour with a side stripe; socks: colour with a turnover top
  const shortsMat = clothPart('mix(vC.xyz, vA.xyz, step(0.47, abs(u-0.5))*0.55)', '0.66');
  const socksMat = clothPart('mix(vD.xyz, vA.xyz, smoothstep(0.80, 0.92, v)*0.85)', '0.72',
    'alb = mix(alb, vD.xyz*0.75, step(0.5, fract(v*6.0))*0.10);');

  const skinFrag = (extras) => instancedFragment(/* glsl */`
    void main(){
      vec3 P = vWorld;
      ${BONE_FRAME}
      vec3 V = normalize(uCamPos - P);
      float u = vUv.x, v = vUv.y;
      vec3 skin = vE.xyz;
      vec3 alb = skin;
      float roughv = 0.52;
      ${extras}
      // skin has pores, not a mirror finish
      vec3 Nw = normalize(N + T*(fbmS(vUv*vec2(60.0, 90.0), 2)*0.06));
      alb *= 0.95 + 0.10*fbm(vUv*vec2(30.0, 40.0), 2);
      Surface s;
      s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
      s.rough = roughv - vC.w*0.18; s.metal = 0.0; s.ao = 0.84; s.spec = 1.0 + vC.w*1.8;
      float shadow = getShadowMask();
      // wrapped diffuse + a warm transmission term: the cheap subsurface trick
      float NoL = dot(s.N, uSunDir);
      vec3 col = s.albedo*RECIPROCAL_PI*wrapDiffuse(NoL, 0.45)*uSunColor*shadow;
      col += vec3(0.26, 0.085, 0.045)*s.albedo*max(0.0, 0.28-abs(NoL))*uSunColor*0.30*shadow;
      vec3 H = normalize(uSunDir+V);
      float a = max(s.rough*s.rough, 2e-3);
      col += F_Schlick(vec3(0.028*s.spec), max(dot(V,H),0.0))
           * D_GGX(max(dot(s.N,H),0.0), a)*V_SmithGGX(max(dot(s.N,V),1e-4), max(NoL,0.0), a)
           * uSunColor*max(NoL, 0.0)*shadow;
      col += ambientLight(s);
      col += floodLights(s)*(0.35 + 0.65*shadow);
      col = applyFog(col, P, V);
      gl_FragColor = vec4(col, 1.0);
    }
  `);

  const skinMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', ''),
    fragmentShader: skinFrag(''),
  });

  // sleeve: shirt colour over the shoulder, skin below the cuff
  const sleeveMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', ''),
    fragmentShader: skinFrag(/* glsl */`
      float cuff = vFl.x > 0.5 ? 0.92 : 0.58;           // keepers wear long sleeves
      float isShirt = 1.0 - smoothstep(cuff - 0.06, cuff, v);
      vec3 shirt = mix(vA.xyz, vB.xyz, smoothstep(0.86, 1.0, v)*0.7);
      alb = mix(alb, shirt, isShirt);
      roughv = mix(roughv, 0.66, isShirt);
    `),
  });

  const faceMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', ''),
    fragmentShader: skinFrag(/* glsl */`
      // the face: brow shadow, eye sockets, mouth line, hairline at the back
      float front = cos((u - 0.0)*6.2831);         // 1 at u=0 (facing forward)
      float eye = smoothstep(0.55, 0.85, front)*smoothstep(0.06, 0.0, abs(v - 0.60));
      float brow = smoothstep(0.45, 0.9, front)*smoothstep(0.05, 0.0, abs(v - 0.66));
      float mouth = smoothstep(0.75, 1.0, front)*smoothstep(0.035, 0.0, abs(v - 0.45));
      alb = mix(alb, alb*0.30, clamp(eye*1.2, 0.0, 1.0));
      alb = mix(alb, alb*0.62, brow*0.7);
      alb = mix(alb, alb*0.55, mouth*0.8);
      alb = mix(alb, vF.xyz, smoothstep(0.62, 0.95, 1.0-front)*smoothstep(0.52, 0.78, v)*0.85);
      roughv = 0.44;
    `),
  });

  const hairMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', /* glsl */`
      // hair style: the cap is scaled and flattened per player
      float style = vE.w;
      pos.xy *= mix(0.96, 1.12, style);
      pos.z *= mix(0.72, 1.18, style);
      pos += nor*fbm(uv*vec2(14.0, 9.0) + style*7.0, 3)*0.07*style;
    `),
    fragmentShader: instancedFragment(/* glsl */`
      void main(){
        vec3 P = vWorld;
        ${BONE_FRAME}
        vec3 V = normalize(uCamPos - P);
        vec3 alb = vF.xyz;
        float strand = fbm(vUv*vec2(130.0, 34.0), 3);
        alb *= 0.72 + 0.55*strand;
        vec3 Nw = normalize(N + T*(strand-0.5)*0.5);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = 0.36; s.metal = 0.0; s.ao = 0.7; s.spec = 1.4;
        float shadow = getShadowMask();
        // anisotropic-ish highlight along the strand direction
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `),
  });

  const bootMat = new THREE.ShaderMaterial({
    uniforms: shared(), lights: true,
    vertexShader: instancedVertex('', ''),
    fragmentShader: instancedFragment(/* glsl */`
      void main(){
        vec3 P = vWorld;
        ${BONE_FRAME}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        float seed = vFl.z;
        vec3 bootCol = mix(vec3(0.015, 0.016, 0.020), vA.xyz*0.55,
                           step(0.55, fract(seed*3.77)));
        bootCol = mix(bootCol, vec3(0.55, 0.52, 0.03), step(0.82, fract(seed*7.13))*0.8);
        vec3 alb = bootCol;
        // sole, plus a trim flash down the side
        alb = mix(alb, vec3(0.16, 0.16, 0.17), smoothstep(0.10, 0.0, v)*0.9);
        float trim = smoothstep(0.06, 0.0, abs(fract(u+0.25)-0.5)-0.18);
        alb = mix(alb, vec3(0.85, 0.85, 0.88), trim*0.25);
        // grass stain + mud
        float stain = fbm(vUv*vec2(18.0, 9.0), 3);
        alb = mix(alb, vec3(0.055, 0.085, 0.030), smoothstep(0.55, 0.9, stain)*0.5);
        alb = mix(alb, vec3(0.060, 0.044, 0.030), clamp(vD.w*1.4, 0.0, 1.0)*0.8);
        vec3 Nw = normalize(N + T*(fbmS(vUv*vec2(45.0, 30.0), 2)*0.1));
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = mix(0.22, 0.52, stain); s.metal = 0.0; s.ao = 0.7; s.spec = 2.2;
        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `),
  });

  // --- meshes --------------------------------------------------------------
  const boneG = withAttrs(boneGeo(0.74, radial, 3, 1, 0.9));
  const boneSlim = withAttrs(boneGeo(0.82, radial, 2, 0.9, 1.0));
  const torsoG = withAttrs(torsoGeo(tier >= 2 ? 20 : 12));
  const headG = withAttrs(boneGeo(0.96, radial + 2, 3, 1.1, 1.05, 0.88));
  const hairG = withAttrs(boneGeo(0.90, radial + 2, 2, 0.2, 1.15, 0.9));
  const bootG = withAttrs(boneGeo(0.58, radial, 2, 0.6, 0.45, 1.25));
  const handG = withAttrs(boneGeo(0.85, 8, 1, 1.0, 1.0, 0.8));

  const mk = (geo, mat, name) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.castShadow = true;
    m.receiveShadow = false;
    m.frustumCulled = false;
    m.name = name;
    m.count = 0;
    group.add(m);
    return m;
  };

  const parts = {
    torso: mk(torsoG, shirtMat, 'torso'),
    head: mk(headG, faceMat, 'head'),
    hair: mk(hairG, hairMat, 'hair'),
    thighL: mk(boneG, shortsMat, 'thighL'),
    thighR: mk(boneG, shortsMat, 'thighR'),
    shinL: mk(boneSlim, socksMat, 'shinL'),
    shinR: mk(boneSlim, socksMat, 'shinR'),
    armUL: mk(boneG, sleeveMat, 'armUL'),
    armUR: mk(boneG, sleeveMat, 'armUR'),
    armLL: mk(boneSlim, skinMat, 'armLL'),
    armLR: mk(boneSlim, skinMat, 'armLR'),
    handL: mk(handG, skinMat, 'handL'),
    handR: mk(handG, skinMat, 'handR'),
    bootL: mk(bootG, bootMat, 'bootL'),
    bootR: mk(bootG, bootMat, 'bootR'),
  };

  // --- per-frame scratch ---------------------------------------------------
  const joints = new Float32Array(J.COUNT * 3);
  const info = {};
  const m4 = new THREE.Matrix4();
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), D = new THREE.Vector3();
  const q = new THREE.Quaternion(), qRoll = new THREE.Quaternion();
  const basisX = new THREE.Vector3(), basisY = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);

  /** Map the unit bone geometry onto the segment a->b with radius r. */
  function boneMatrix(ax, ay, az, bx, by, bz, r, rollRef) {
    A.set(ax, ay, az); Bv.set(bx, by, bz);
    D.subVectors(Bv, A);
    const len = D.length() || 1e-4;
    D.divideScalar(len);
    q.setFromUnitVectors(zAxis, D);
    if (rollRef) {
      // align the geometry's +X with the reference direction (shirt front)
      basisX.set(1, 0, 0).applyQuaternion(q);
      basisY.set(0, 1, 0).applyQuaternion(q);
      const ang = Math.atan2(rollRef.dot(basisY), rollRef.dot(basisX));
      q.multiply(qRoll.setFromAxisAngle(zAxis, ang));
    }
    m4.compose(A, q, sc.set(r, r, len));
    return m4;
  }

  const fwdRef = new THREE.Vector3();
  const colorCache = new Map();
  const lin = (hex) => {
    let c = colorCache.get(hex);
    if (!c) { c = new THREE.Color(hex).convertSRGBToLinear(); colorCache.set(hex, c); }
    return c;
  };

  const SKINS = ['#f2cfa8', '#e3b084', '#c88e5e', '#9c663c', '#6f452a', '#4a2f1d'];
  const HAIRS = ['#120d0a', '#2b1f17', '#4a3222', '#8a6a3f', '#c9a85f', '#0d0d0d', '#5a1f12'];
  const PATTERNS = { plain: 0, stripes: 1, hoops: 2, sash: 3, halves: 4 };

  let squadKey = '';

  function setSquads(world) {
    const key = world.teams.map((t) => t.club.id + t.kit).join('|');
    if (key === squadKey) return;
    squadKey = key;
    const ps = world.players;
    for (let i = 0; i < ps.length && i < MAX; i++) {
      const p = ps[i];
      const team = world.teams[p.team];
      const club = team.club;
      const away = team.kit === 1;
      const gk = p.isGK;
      const c1 = gk ? (away ? '#1d2630' : '#2bd07a') : (away ? club.away1 : club.c1);
      const c2 = gk ? (away ? '#49566a' : '#0d7a45') : (away ? club.away2 : club.c2);
      const c3 = gk ? (away ? '#121820' : '#0f3f27') : (away ? club.away2 : (club.c3 || club.c2));
      const c4 = gk ? c1 : (away ? club.away1 : club.c1);
      const pat = gk ? 0 : (PATTERNS[club.pat] !== undefined ? PATTERNS[club.pat] : 0);
      const seed = (p.uid * 2654435761) % 1000 / 1000;
      const sk = lin(SKINS[Math.floor(seed * 971) % SKINS.length]);
      const ha = lin(HAIRS[Math.floor(seed * 613) % HAIRS.length]);
      const A1 = lin(c1), A2 = lin(c2), A3 = lin(c3), A4 = lin(c4);
      const set4 = (a, i2, x, y, z, w) => {
        a.array[i2 * 4] = x; a.array[i2 * 4 + 1] = y; a.array[i2 * 4 + 2] = z; a.array[i2 * 4 + 3] = w;
      };
      set4(attrs.aColA, i, A1.r, A1.g, A1.b, pat);
      set4(attrs.aColB, i, A2.r, A2.g, A2.b, p.shirt || 0);
      set4(attrs.aColC, i, A3.r, A3.g, A3.b, 0);
      set4(attrs.aColD, i, A4.r, A4.g, A4.b, 0);
      set4(attrs.aColE, i, sk.r, sk.g, sk.b, seed);
      set4(attrs.aColF, i, ha.r, ha.g, ha.b, 0);
      set4(attrs.aFlags, i, gk ? 1 : 0, 0, seed, p.team);
    }
    for (const k in attrs) attrs[k].needsUpdate = true;
  }

  function update(world, t, turf) {
    const ps = world.players;
    const n = Math.min(ps.length, MAX);
    for (const k in parts) parts[k].count = n;

    for (let i = 0; i < n; i++) {
      const p = ps[i];
      poseOf(p, t, joints, info);
      const g = (j, c) => joints[j * 3 + c];
      fwdRef.set(info.fx, info.fy, 0);

      const torsoR = 0.168;
      parts.torso.setMatrixAt(i, boneMatrix(
        g(J.pelvis, 0), g(J.pelvis, 1), g(J.pelvis, 2),
        g(J.neck, 0), g(J.neck, 1), g(J.neck, 2), torsoR, fwdRef));
      parts.head.setMatrixAt(i, boneMatrix(
        g(J.neck, 0), g(J.neck, 1), g(J.neck, 2),
        g(J.crown, 0), g(J.crown, 1), g(J.crown, 2), 0.105, fwdRef));
      parts.hair.setMatrixAt(i, boneMatrix(
        g(J.neck, 0) + (g(J.crown, 0) - g(J.neck, 0)) * 0.45,
        g(J.neck, 1) + (g(J.crown, 1) - g(J.neck, 1)) * 0.45,
        g(J.neck, 2) + (g(J.crown, 2) - g(J.neck, 2)) * 0.45,
        g(J.crown, 0), g(J.crown, 1), g(J.crown, 2), 0.108, fwdRef));

      const legR = 0.078, shinR = 0.058, armR = 0.050, foreR = 0.042;
      parts.thighL.setMatrixAt(i, boneMatrix(g(J.hipL, 0), g(J.hipL, 1), g(J.hipL, 2),
        g(J.kneeL, 0), g(J.kneeL, 1), g(J.kneeL, 2), legR, null));
      parts.thighR.setMatrixAt(i, boneMatrix(g(J.hipR, 0), g(J.hipR, 1), g(J.hipR, 2),
        g(J.kneeR, 0), g(J.kneeR, 1), g(J.kneeR, 2), legR, null));
      parts.shinL.setMatrixAt(i, boneMatrix(g(J.kneeL, 0), g(J.kneeL, 1), g(J.kneeL, 2),
        g(J.ankL, 0), g(J.ankL, 1), g(J.ankL, 2), shinR, null));
      parts.shinR.setMatrixAt(i, boneMatrix(g(J.kneeR, 0), g(J.kneeR, 1), g(J.kneeR, 2),
        g(J.ankR, 0), g(J.ankR, 1), g(J.ankR, 2), shinR, null));
      parts.armUL.setMatrixAt(i, boneMatrix(g(J.shL, 0), g(J.shL, 1), g(J.shL, 2),
        g(J.elbL, 0), g(J.elbL, 1), g(J.elbL, 2), armR, null));
      parts.armUR.setMatrixAt(i, boneMatrix(g(J.shR, 0), g(J.shR, 1), g(J.shR, 2),
        g(J.elbR, 0), g(J.elbR, 1), g(J.elbR, 2), armR, null));
      parts.armLL.setMatrixAt(i, boneMatrix(g(J.elbL, 0), g(J.elbL, 1), g(J.elbL, 2),
        g(J.wriL, 0), g(J.wriL, 1), g(J.wriL, 2), foreR, null));
      parts.armLR.setMatrixAt(i, boneMatrix(g(J.elbR, 0), g(J.elbR, 1), g(J.elbR, 2),
        g(J.wriR, 0), g(J.wriR, 1), g(J.wriR, 2), foreR, null));
      const handR = p.isGK ? 0.062 : 0.048;
      parts.handL.setMatrixAt(i, boneMatrix(g(J.wriL, 0), g(J.wriL, 1), g(J.wriL, 2),
        g(J.fingL, 0), g(J.fingL, 1), g(J.fingL, 2), handR, null));
      parts.handR.setMatrixAt(i, boneMatrix(g(J.wriR, 0), g(J.wriR, 1), g(J.wriR, 2),
        g(J.fingR, 0), g(J.fingR, 1), g(J.fingR, 2), handR, null));
      parts.bootL.setMatrixAt(i, boneMatrix(g(J.ankL, 0), g(J.ankL, 1), g(J.ankL, 2),
        g(J.toeL, 0), g(J.toeL, 1), g(J.toeL, 2), 0.047, null));
      parts.bootR.setMatrixAt(i, boneMatrix(g(J.ankR, 0), g(J.ankR, 1), g(J.ankR, 2),
        g(J.toeR, 0), g(J.toeR, 1), g(J.toeR, 2), 0.047, null));

      // sweat builds with effort, mud with slides
      const sweat = Math.min(1, (1 - p.stamina) * 1.5 + (p.speed / 9) * 0.35);
      attrs.aColC.array[i * 4 + 3] = sweat;
      attrs.aFlags.array[i * 4 + 1] = Math.min(1, p.speed / 8);
      if (p.state === 'slide' || p.state === 'dive') {
        attrs.aColD.array[i * 4 + 3] = Math.min(1, (attrs.aColD.array[i * 4 + 3] || 0) + 0.02);
      }
      // studs chew the turf under the planted foot
      if (turf && p.state === 'run' && p.speed > 1.2) {
        const lo = joints[J.ankL * 3 + 2] < joints[J.ankR * 3 + 2] ? J.ankL : J.ankR;
        if (joints[lo * 3 + 2] < 0.075) {
          turf.add(joints[lo * 3], joints[lo * 3 + 1], 0.17 + p.speed * 0.012,
            p.facing, 0.55, p.speed > 6 ? 0.22 : 0.07, 0.35, Math.min(0.5, p.speed * 0.05));
        }
      }
      if (turf && (p.state === 'slide' || p.state === 'dive') && p.speed > 1.5) {
        turf.add(p.x, p.y, 0.55, p.facing, 0.95, 0.75, 0.9, 1.0);
      }
    }
    for (const k in parts) parts[k].instanceMatrix.needsUpdate = true;
    attrs.aColC.needsUpdate = true;
    attrs.aColD.needsUpdate = true;
    attrs.aFlags.needsUpdate = true;
  }

  return { group, parts, setSquads, update, attrs };
}

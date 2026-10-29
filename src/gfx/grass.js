// ---------------------------------------------------------------------------
// grass.js : individual blades, instanced, only where they can be seen.
//
// A patch of real geometry (up to 160k blades) is parked on the ground under
// the action and snapped to a world grid, so blades never swim when the
// camera moves. Each blade bends to the wind, lies down under the turf map
// (studs, slides) and is pushed aside by nearby players and the ball.
// Everything beyond the patch is handled by the pitch shader, whose average
// colour is matched to the blades so the hand-off is invisible.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import {
  litFragment, litVertex, SHADOW_VERT, litUniforms, PITCH_HEIGHT,
} from './shaderlib.js';

const TIERS = [
  { grid: 0, span: 0, segs: 0 },               // tier 0: shader-only turf
  { grid: 220, span: 14.0, segs: 3 },          // tier 1: ~48k blades
  { grid: 392, span: 19.0, segs: 4 },          // tier 2: ~153k blades
];

/** One blade: a tapered strip, segs quads, both faces in one triangle list. */
function bladeGeometry(segs) {
  const pos = [];
  const idx = [];
  const side = [];
  const along = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = (1 - t * 0.82) * 0.5;
    pos.push(-w, 0, t, w, 0, t);
    side.push(-1, 1);
    along.push(t, t);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(idx);
  return g;
}

export function createGrass(env, turf, opts = {}) {
  const tier = Math.max(0, Math.min(2, opts.tier | 0));
  const T = TIERS[tier];
  if (!T.grid) return { mesh: null, update() {}, setDensity() {} };

  const geo = bladeGeometry(T.segs);
  const n = T.grid * T.grid;
  const cells = new Float32Array(n * 2);
  const rnd = new Float32Array(n * 4);
  let k = 0;
  for (let j = 0; j < T.grid; j++) {
    for (let i = 0; i < T.grid; i++) {
      cells[k * 2] = (i + 0.5) / T.grid - 0.5;
      cells[k * 2 + 1] = (j + 0.5) / T.grid - 0.5;
      rnd[k * 4] = Math.random();
      rnd[k * 4 + 1] = Math.random();
      rnd[k * 4 + 2] = Math.random();
      rnd[k * 4 + 3] = Math.random();
      k++;
    }
  }
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
  geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const uniforms = litUniforms(env.uniforms(), {
    uTurf: turf.uniforms.uTurf,
    uTurfSpan: turf.uniforms.uTurfSpan,
    uOrigin: { value: new THREE.Vector2() },
    uSpan: { value: T.span },
    uHeight: { value: 0.032 },     // stadium grass is cut to ~30 mm
    uPush: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    uPushCount: { value: 0 },
    uFade: { value: 1 },
  });

  const mat = new THREE.ShaderMaterial({
    uniforms,
    lights: true,
    side: THREE.DoubleSide,
    vertexShader: litVertex(PITCH_HEIGHT + /* glsl */`
      attribute vec2 aCell;
      attribute vec4 aRnd;
      attribute float aSide;
      attribute float aAlong;
      uniform sampler2D uTurf;
      uniform vec2 uTurfSpan;
      uniform vec2 uOrigin;
      uniform float uSpan;
      uniform float uHeight;
      uniform vec4 uPush[12];
      uniform float uPushCount;
      uniform float uFade;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec4 vBlade;      // along, lean, colour jitter, flatten
    `) + /* glsl */`
      void main(){
        // blade root, snapped to the world so the patch can slide freely
        vec2 root = uOrigin + aCell*uSpan + (aRnd.xy - 0.5)*(uSpan/float(${T.grid}))*2.2;
        float distC = length(root - uCamPos.xy);
        float radius = uSpan*0.5;

        vec2 tuv = root/uTurfSpan + 0.5;
        vec4 scar = texture2D(uTurf, tuv);
        float flatten = clamp(scar.r, 0.0, 1.0);
        float soil = clamp(scar.g, 0.0, 1.0);

        // height: mown short, with clump variation, killed by wear and edges
        float clump = fbm(root*2.3, 2);
        float h = uHeight*(0.55 + 0.75*aRnd.z)*(0.72 + 0.55*clump);
        h *= 1.0 - soil*0.85;
        h *= 1.0 - flatten*0.72;
        // Blades only earn their cost where a pixel can resolve one, so the
        // patch is anchored ahead of the camera and fades out with distance
        // from it, not from the ball.
        float edgeFade = 1.0 - smoothstep(radius*0.70, radius*0.99, length(root - uOrigin));
        float camFade = 1.0 - smoothstep(radius*0.55, radius*1.05, distC);
        h *= edgeFade*camFade*uFade;
        // outside the playing surface the grass is cut differently (shorter)
        float outside = smoothstep(${PITCH.halfL.toFixed(1)}, ${(PITCH.halfL + 6.0).toFixed(1)}, abs(root.x))
                      + smoothstep(${PITCH.halfW.toFixed(1)}, ${(PITCH.halfW + 6.0).toFixed(1)}, abs(root.y));
        h *= 1.0 - clamp(outside, 0.0, 1.0)*0.45;

        if (h < 0.0015){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWorld = vec3(0.0); vNormalW = vec3(0,0,1); vBlade = vec4(0.0); return; }

        // the mow direction decides which way the blade lies
        vec2 cid = floor(root/5.0);
        float chk = mod(cid.x + cid.y, 2.0);
        vec2 lay = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), chk);
        float layDir = (fract(aRnd.w*7.31) > 0.5) ? 1.0 : -1.0;
        float yaw = atan(lay.y, lay.x) + (aRnd.w - 0.5)*1.5 + (layDir < 0.0 ? PI : 0.0);

        // wind: large gust envelope + local ripple, blades follow with lag
        float gust = fbm(root*0.09 + uWind*uTime*0.12, 3);
        float ripple = sin(dot(root, uWind)*2.6 - uTime*5.4 + aRnd.x*6.28);
        float wind = (gust*0.65 + ripple*0.35)*0.55;

        // players and the ball shove the blades out of the way
        vec2 shove = vec2(0.0);
        for (int i = 0; i < 12; i++){
          if (float(i) >= uPushCount) break;
          vec2 d = root - uPush[i].xy;
          float dl = length(d);
          float r = uPush[i].z;
          if (dl < r) shove += normalize(d + 1e-5)*(1.0 - dl/r)*uPush[i].w;
        }

        float t = aAlong;
        float bend = (wind*0.42 + flatten*1.25)*t*t;
        vec2 bendDir = normalize(mix(normalize(lay*layDir + 1e-5), normalize(uWind + 1e-5), 0.45) + shove*2.4);
        float lean = clamp(bend + length(shove)*1.1*t*t, 0.0, 1.45);

        // build the blade in world space directly
        float c = cos(yaw), s = sin(yaw);
        vec3 tangent = vec3(c, s, 0.0);
        float width = 0.0062*(0.7 + 0.6*aRnd.y);
        vec3 p = vec3(0.0);
        p.z = cos(lean)*t*h;
        p.xy = bendDir*sin(lean)*t*h*1.35;
        p += tangent*(aSide*width*(1.0 - t*0.8));

        // sit the blade on the real (crowned, uneven) surface
        vec3 wp = vec3(root, 0.0) + p;
        wp.z += pitchHeight(root);

        // normal: perpendicular to the blade, facing the camera-ish side
        vec3 bladeDir = normalize(vec3(bendDir*sin(lean), cos(lean)) + 1e-5);
        vec3 nrm = normalize(cross(tangent, bladeDir));
        if (dot(nrm, uCamPos - wp) < 0.0) nrm = -nrm;
        nrm = normalize(nrm + vec3(0.0, 0.0, 0.55));

        vWorld = wp;
        vNormalW = nrm;
        vBlade = vec4(t, lean, aRnd.z, flatten);

        vec4 worldPosition = vec4(wp, 1.0);
        vec3 transformedNormal = normalMatrix*nrm;
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*worldPosition;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec4 vBlade;
    `) + /* glsl */`
      void main(){
        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(uCamPos - P);
        float t = vBlade.x;

        vec3 lush = vec3(0.0300, 0.0930, 0.0245);
        vec3 tip  = vec3(0.0700, 0.1560, 0.0430);
        vec3 alb = mix(lush, tip, clamp(t*0.85 + vBlade.z*0.35, 0.0, 1.0));
        alb = mix(alb, vec3(0.085, 0.100, 0.042), vBlade.w*0.45);
        alb = mix(alb, alb*vec3(0.5, 0.55, 0.5), uWet*0.45);

        // self shadowing inside the canopy: the base of a blade sees no sky
        float canopyAO = mix(0.42, 1.0, pow(t, 0.70));

        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = mix(0.62, 0.38, uWet*0.6);
        s.metal = 0.0; s.ao = canopyAO; s.spec = 1.0 + uWet*1.6;

        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        // transmission through the blade -- the reason grass glows backlit
        float trans = pow(max(dot(-V, uSunDir), 0.0), 2.2);
        col += uSunColor*vec3(0.11, 0.26, 0.07)*trans*shadow*canopyAO*0.9;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.name = 'grass';

  const span = T.span;
  const snap = span / T.grid * 4;
  return {
    mesh,
    /** Keep the patch under the action and feed it the pushers. */
    update(focusX, focusY, pushers) {
      uniforms.uOrigin.value.set(
        Math.round(focusX / snap) * snap,
        Math.round(focusY / snap) * snap,
      );
      const arr = uniforms.uPush.value;
      const m = Math.min(pushers.length, 12);
      for (let i = 0; i < m; i++) {
        const p = pushers[i];
        arr[i].set(p.x, p.y, p.r, p.s);
      }
      uniforms.uPushCount.value = m;
    },
    setDensity(f) { uniforms.uFade.value = f; },
  };
}

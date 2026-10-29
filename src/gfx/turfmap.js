// ---------------------------------------------------------------------------
// turfmap.js : the pitch remembers.
//
// A ping-ponged render target in pitch space accumulates every stud, slide and
// kick-off divot of the match. The pitch shader and the grass blades both read
// it, so a scar flattens the blades, dulls the sheen and exposes soil in the
// same place -- and it heals over a few minutes, like real turf being walked
// back in by the groundstaff.
//
//   R : flattening   (grass pressed down, sheen lost)
//   G : soil         (torn turf, the brown stuff)
//   B : moisture     (splash / water pushed out of the ground)
//   A : freshness    (used to fade the look of a scar faster than its shape)
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { NOISE } from './shaderlib.js';

const SPAN_X = PITCH.length + 2 * PITCH.runOffX;   // mapped area, metres
const SPAN_Y = PITCH.width + 2 * PITCH.runOffY;

export function createTurfMap(renderer, size = 1024) {
  const w = size;
  const h = Math.max(256, Math.round(size * (SPAN_Y / SPAN_X) / 2) * 2);
  const opts = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  };
  let rtA = new THREE.WebGLRenderTarget(w, h, opts);
  let rtB = new THREE.WebGLRenderTarget(w, h, opts);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  cam.position.z = 1;

  // --- decay pass: copies the previous frame back, healing as it goes -----
  const decayMat = new THREE.ShaderMaterial({
    uniforms: { uPrev: { value: null }, uHeal: { value: 0 } },
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uPrev; uniform float uHeal;
      varying vec2 vUv;
      void main(){
        vec4 p = texture2D(uPrev, vUv);
        // grass springs back fastest, soil takes the whole match, water dries
        p.r *= 1.0 - uHeal*0.55;
        p.g *= 1.0 - uHeal*0.10;
        p.b *= 1.0 - uHeal*1.60;
        p.a *= 1.0 - uHeal*0.80;
        gl_FragColor = max(p, vec4(0.0));
      }
    `,
  });
  const decayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), decayMat);
  decayQuad.frustumCulled = false;
  scene.add(decayQuad);

  // --- stamp pass: one instanced quad per contact this frame --------------
  const MAX = 512;
  const stampGeo = new THREE.InstancedBufferGeometry();
  const base = new THREE.PlaneGeometry(1, 1);
  stampGeo.index = base.index;
  stampGeo.attributes.position = base.attributes.position;
  stampGeo.attributes.uv = base.attributes.uv;
  const aXform = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); // x,y,radius,angle
  const aParam = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); // flatten,soil,water,kind
  stampGeo.setAttribute('aXform', aXform);
  stampGeo.setAttribute('aParam', aParam);
  stampGeo.instanceCount = 0;

  const stampMat = new THREE.ShaderMaterial({
    uniforms: { uSpan: { value: new THREE.Vector2(SPAN_X, SPAN_Y) } },
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.MaxEquation,       // scars accumulate, never blow out
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec4 aXform;
      attribute vec4 aParam;
      uniform vec2 uSpan;
      varying vec2 vLocal;
      varying vec4 vParam;
      void main(){
        vLocal = position.xy*2.0;
        vParam = aParam;
        float c = cos(aXform.w), s = sin(aXform.w);
        // studs smear along the direction of travel
        vec2 stretch = vec2(1.0 + vParam.w*1.6, 1.0);
        vec2 p = position.xy*aXform.z*2.0*stretch;
        p = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + aXform.xy;
        gl_Position = vec4(p.x/(uSpan.x*0.5), p.y/(uSpan.y*0.5), 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      ${NOISE}
      varying vec2 vLocal;
      varying vec4 vParam;
      void main(){
        float d = length(vLocal);
        if (d > 1.0) discard;
        float fall = pow(1.0 - d, 1.45);
        // broken edge so a scar is never a clean circle
        float edge = 0.78 + 0.34*fbm(vLocal*3.4 + vParam.xy*37.0, 3);
        fall *= smoothstep(edge, edge*0.55, d);
        float cl = fbm(vLocal*6.0 + 11.0, 3);
        gl_FragColor = vec4(vParam.x*fall, vParam.y*fall*cl, vParam.z*fall, fall)*1.0;
      }
    `,
  });
  const stamps = new THREE.Mesh(stampGeo, stampMat);
  stamps.frustumCulled = false;
  stamps.visible = false;
  scene.add(stamps);

  let count = 0;
  let healAcc = 0;

  const api = {
    get texture() { return rtA.texture; },
    uniforms: {
      uTurf: { value: rtA.texture },
      uTurfSpan: { value: new THREE.Vector2(SPAN_X, SPAN_Y) },
    },
    /**
     * Queue one mark. x,y in pitch metres; flatten/soil/water 0..1;
     * smear 0..1 stretches the mark along `angle` (a slide tackle).
     */
    add(x, y, radius, angle, flatten, soil, water, smear = 0) {
      if (count >= MAX) return;
      const i = count++;
      aXform.array[i * 4] = x;
      aXform.array[i * 4 + 1] = y;
      aXform.array[i * 4 + 2] = radius;
      aXform.array[i * 4 + 3] = angle;
      aParam.array[i * 4] = flatten;
      aParam.array[i * 4 + 1] = soil;
      aParam.array[i * 4 + 2] = water;
      aParam.array[i * 4 + 3] = smear;
    },
    /** Run the accumulation for this frame. Cheap: one quad + N instances. */
    update(dt) {
      healAcc += dt;
      const heal = Math.min(healAcc * 0.012, 0.02);   // ~2 min to walk a scar in
      if (count === 0 && heal < 0.0008) return;
      healAcc = 0;
      decayMat.uniforms.uPrev.value = rtA.texture;
      decayMat.uniforms.uHeal.value = heal;
      stampGeo.instanceCount = count;
      stamps.visible = count > 0;
      if (count > 0) { aXform.needsUpdate = true; aParam.needsUpdate = true; }

      const prevTarget = renderer.getRenderTarget();
      const prevAuto = renderer.autoClear;
      renderer.autoClear = true;
      renderer.setRenderTarget(rtB);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = prevAuto;

      const t = rtA; rtA = rtB; rtB = t;
      api.uniforms.uTurf.value = rtA.texture;
      count = 0;
    },
    clear() {
      for (const rt of [rtA, rtB]) {
        renderer.setRenderTarget(rt);
        renderer.setClearColor(0x000000, 0);
        renderer.clear(true, false, false);
      }
      renderer.setRenderTarget(null);
      count = 0;
    },
    dispose() { rtA.dispose(); rtB.dispose(); },
  };
  api.clear();
  return api;
}

// ---------------------------------------------------------------------------
// post.js : the film stage. Hand-written passes, no post-processing library.
//
//   AIR    (half res, fused)  volumetric sun shafts marched against the real
//                             shadow map, plus screen-space contact shadows
//                             in the alpha channel.
//   SSR    (half res)         screen-space reflections for the wet ground.
//                             The pitch already has an accurate planar mirror;
//                             this adds the short-range contact reflections
//                             that a half-res planar pass smears away.
//   BLOOM  (mip chain)        threshold -> 4 down -> 4 up, tent filtered.
//   COMP   (full res)         DOF, volumetrics, bloom, anamorphic lens flare,
//                             AgX-flavoured tonemap, lift/gamma/gain grade.
//   FINAL  (full res)         FXAA, contrast-adaptive sharpen, grain,
//                             chromatic aberration, vignette.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { ENV_UNIFORMS, NOISE, SKY } from './shaderlib.js';

const QUAD_VERT = /* glsl */`
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// depth helpers shared by the passes that reconstruct geometry
const DEPTH_UTIL = /* glsl */`
uniform mat4 uInvVP;
uniform mat4 uVP;
uniform vec2 uClip;          // near, far
float linearDepth(float d){
  float z = d*2.0 - 1.0;
  return (2.0*uClip.x*uClip.y)/(uClip.y + uClip.x - z*(uClip.y - uClip.x));
}
vec3 worldFromDepth(vec2 uv, float d){
  vec4 ndc = vec4(uv*2.0 - 1.0, d*2.0 - 1.0, 1.0);
  vec4 w = uInvVP*ndc;
  return w.xyz/w.w;
}
`;

function makeQuad(fragmentShader, uniforms, opts = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: QUAD_VERT,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    blending: opts.blending || THREE.NoBlending,
    transparent: !!opts.blending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const cam = new THREE.Camera();
  return {
    mat, uniforms,
    render(renderer, target) {
      renderer.setRenderTarget(target || null);
      renderer.render(scene, cam);
    },
  };
}

const rtOpts = (type) => ({
  type,
  format: THREE.RGBAFormat,
  depthBuffer: false,
  stencilBuffer: false,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,
});

export function createPost(renderer, env, opts = {}) {
  const tier = opts.tier | 0;
  const HDR = THREE.HalfFloatType;
  let W = 2, H = 2;

  // --- scene target (what everything else reads) --------------------------
  const sceneRT = new THREE.WebGLRenderTarget(2, 2, {
    type: HDR,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples: 0,
  });
  sceneRT.depthTexture = new THREE.DepthTexture(2, 2);
  sceneRT.depthTexture.type = THREE.UnsignedIntType;

  const airRT = new THREE.WebGLRenderTarget(2, 2, rtOpts(HDR));
  const ssrRT = new THREE.WebGLRenderTarget(2, 2, rtOpts(HDR));
  const MIPS = tier >= 2 ? 5 : tier >= 1 ? 4 : 3;
  const bloomRT = [];
  for (let i = 0; i < MIPS; i++) bloomRT.push(new THREE.WebGLRenderTarget(2, 2, rtOpts(HDR)));
  const upRT = [];
  for (let i = 0; i < MIPS; i++) upRT.push(new THREE.WebGLRenderTarget(2, 2, rtOpts(HDR)));
  const compRT = new THREE.WebGLRenderTarget(2, 2, rtOpts(HDR));

  const shared = {
    uScene: { value: sceneRT.texture },
    uDepth: { value: sceneRT.depthTexture },
    uInvVP: { value: new THREE.Matrix4() },
    uVP: { value: new THREE.Matrix4() },
    uPrevVP: { value: new THREE.Matrix4() },
    uClip: { value: new THREE.Vector2(0.4, 400) },
    uRes: { value: new THREE.Vector2(2, 2) },
    uTexel: { value: new THREE.Vector2(0.5, 0.5) },
    uSunScreen: { value: new THREE.Vector3(0, 0, -1) },  // xy = ndc, z = visibility
    uShadowDir: { value: new THREE.Vector3(0, 0, 1) },
    uShadowMap: { value: null },
    uShadowMat: { value: new THREE.Matrix4() },
    uFrame: { value: 0 },
    uDof: { value: 0 },
    uFocus: { value: 25 },
    uMotion: { value: tier >= 2 ? 1 : 0.5 },
    uGradeLift: { value: new THREE.Vector3() },
    uGradeGamma: { value: new THREE.Vector3(1, 1, 1) },
    uGradeGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1 },
    uFlash: { value: 0 },
    uSlowmo: { value: 0 },
    uVignette: { value: 0.32 },
  };
  const E = env.uniforms();

  // --- AIR: volumetric shafts + contact shadows ---------------------------
  const air = makeQuad(/* glsl */`
    #include <common>
    #include <packing>
    ${ENV_UNIFORMS}
    ${NOISE}
    ${SKY}
    ${DEPTH_UTIL}
    uniform sampler2D uDepth;
    uniform sampler2D uShadowMap;
    uniform mat4 uShadowMat;
    uniform vec3 uShadowDir;
    uniform vec2 uRes;
    uniform float uFrame;
    uniform float uSteps;
    varying vec2 vUv;

    float shadowAt(vec3 p){
      vec4 sc = uShadowMat*vec4(p, 1.0);
      vec3 c = sc.xyz/max(sc.w, 1e-5);
      if (any(lessThan(c.xy, vec2(0.02))) || any(greaterThan(c.xy, vec2(0.98)))) return 1.0;
      float d = unpackRGBAToDepth(texture2D(uShadowMap, c.xy));
      return step(c.z - 0.0025, d);
    }

    void main(){
      float depth = texture2D(uDepth, vUv).x;
      vec3 target = worldFromDepth(vUv, min(depth, 0.9999));
      vec3 ray = target - uCamPos;
      float dist = length(ray);
      vec3 dir = ray/max(dist, 1e-4);
      float march = min(dist, 160.0);

      // --- volumetric in-scattering -------------------------------------
      // Under floodlights the sun is a moon and this pass would march 32 steps
      // to add nothing, so it is skipped and only the contact shadows run.
      float sunLum = dot(uSunColor, vec3(0.2126, 0.7152, 0.0722));
      int steps = sunLum < 0.12 ? 0 : int(uSteps);
      float dither = hash12(vUv*uRes + uFrame*1.37);
      float stepLen = march/float(max(steps, 1));
      vec3 acc = vec3(0.0);
      float c = dot(dir, uSunDir);
      float phase = miePhase(c, 0.74)*0.9 + rayleighPhase(c)*0.25;
      for (int i = 0; i < 48; i++){
        if (i >= steps) break;
        float t = (float(i) + dither)*stepLen;
        vec3 p = uCamPos + dir*t;
        if (p.z < -0.5) break;
        float dens = exp(-max(p.z, 0.0)*uFogParams.y*18.0);
        // a little turbulence so the shafts are not perfect cones
        dens *= 0.75 + 0.5*fbm3(p*0.055 + vec3(uWind*uTime*0.08, 0.0), 2);
        acc += shadowAt(p)*dens;
      }
      vec3 vol = uSunColor*phase*acc*stepLen*uFogParams.x*0.85;

      // --- contact shadows ------------------------------------------------
      float occ = 0.0;
      if (depth < 0.9999){
        vec3 P = target;
        float lin0 = linearDepth(depth);
        float jitter = 0.4 + 0.6*hash12(vUv*uRes*1.7 + uFrame*0.77);
        float reach = 0.42;
        for (int i = 1; i <= 10; i++){
          float f = float(i)/10.0;
          // march toward the light that actually casts the shadow map; at
          // night that is near-vertical, so the ground cannot shadow itself
          vec3 sp = P + uShadowDir*(f*reach*jitter) + vec3(0.0, 0.0, 0.006);
          vec4 cp = uVP*vec4(sp, 1.0);
          vec2 suv = cp.xy/cp.w*0.5 + 0.5;
          if (any(lessThan(suv, vec2(0.0))) || any(greaterThan(suv, vec2(1.0)))) break;
          float sd = texture2D(uDepth, suv).x;
          float linS = linearDepth(sd);
          float linP = linearDepth(cp.z/cp.w*0.5 + 0.5);
          float diff = linP - linS;
          if (diff > 0.02 && diff < 0.55){
            occ = max(occ, 1.0 - f*0.85);
          }
        }
      }
      gl_FragColor = vec4(vol, occ);
    }
  `, Object.assign({}, E, {
    uDepth: shared.uDepth, uShadowMap: shared.uShadowMap, uShadowMat: shared.uShadowMat,
    uInvVP: shared.uInvVP, uVP: shared.uVP, uClip: shared.uClip, uRes: shared.uRes,
    uFrame: shared.uFrame, uSteps: { value: tier >= 2 ? 32 : 16 },
    uShadowDir: shared.uShadowDir,
  }));

  // --- SSR -----------------------------------------------------------------
  const ssr = makeQuad(/* glsl */`
    #include <common>
    ${ENV_UNIFORMS}
    ${NOISE}
    ${DEPTH_UTIL}
    uniform sampler2D uScene;
    uniform sampler2D uDepth;
    uniform vec2 uRes;
    uniform float uFrame;
    varying vec2 vUv;
    void main(){
      float depth = texture2D(uDepth, vUv).x;
      if (depth > 0.9999){ gl_FragColor = vec4(0.0); return; }
      vec3 P = worldFromDepth(vUv, depth);
      // only the pitch surface reflects in screen space here
      if (abs(P.z) > 0.30 || uWet < 0.08){ gl_FragColor = vec4(0.0); return; }
      vec3 V = normalize(uCamPos - P);
      // the same ripple field the pitch shader uses, cheaply
      float rip = fbmS(P.xy*7.0 + uTime*vec2(0.25, 0.11), 2)*uWet;
      vec3 N = normalize(vec3(-rip*0.30, -rip*0.24, 1.0));
      vec3 R = reflect(-V, N);
      if (R.z < 0.02){ gl_FragColor = vec4(0.0); return; }

      float jitter = hash12(vUv*uRes + uFrame*2.31);
      vec3 col = vec3(0.0);
      float conf = 0.0;
      float t = 0.07 + jitter*0.05;
      for (int i = 0; i < 20; i++){
        vec3 p = P + R*t;
        vec4 cp = uVP*vec4(p, 1.0);
        vec2 suv = cp.xy/cp.w*0.5 + 0.5;
        if (any(lessThan(suv, vec2(0.002))) || any(greaterThan(suv, vec2(0.998)))) break;
        float sd = texture2D(uDepth, suv).x;
        float linS = linearDepth(sd);
        float linP = linearDepth(cp.z/cp.w*0.5 + 0.5);
        if (linP > linS + 0.02 && linP < linS + 1.2){
          col = texture2D(uScene, suv).rgb;
          // short rays only: this layer is for contact reflections
          conf = (1.0 - smoothstep(0.6, 2.2, t))*smoothstep(0.0, 0.1, t);
          break;
        }
        t += 0.085 + t*0.30;
      }
      gl_FragColor = vec4(col, conf);
    }
  `, Object.assign({}, E, {
    uScene: shared.uScene, uDepth: shared.uDepth, uInvVP: shared.uInvVP,
    uVP: shared.uVP, uClip: shared.uClip, uRes: shared.uRes, uFrame: shared.uFrame,
  }));

  // --- bloom ---------------------------------------------------------------
  const bright = makeQuad(/* glsl */`
    uniform sampler2D uScene;
    uniform vec2 uTexel;
    uniform float uThresh;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(uScene, vUv).rgb;
      c += texture2D(uScene, vUv + vec2(uTexel.x, 0.0)).rgb;
      c += texture2D(uScene, vUv - vec2(uTexel.x, 0.0)).rgb;
      c += texture2D(uScene, vUv + vec2(0.0, uTexel.y)).rgb;
      c += texture2D(uScene, vUv - vec2(0.0, uTexel.y)).rgb;
      c /= 5.0;
      float l = max(max(c.r, c.g), c.b);
      float knee = max(l - uThresh, 0.0);
      float w = knee/max(l, 1e-4);
      gl_FragColor = vec4(c*w, 1.0);
    }
  `, {
    uScene: shared.uScene, uTexel: { value: new THREE.Vector2() },
    uThresh: { value: 1.25 },
  });

  const down = makeQuad(/* glsl */`
    uniform sampler2D uTex;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      // 13-tap downsample (Jimenez): stable, no pulsing on small highlights
      vec2 t = uTexel;
      vec3 a = texture2D(uTex, vUv + t*vec2(-1.0, -1.0)).rgb;
      vec3 b = texture2D(uTex, vUv + t*vec2( 1.0, -1.0)).rgb;
      vec3 c = texture2D(uTex, vUv + t*vec2(-1.0,  1.0)).rgb;
      vec3 d = texture2D(uTex, vUv + t*vec2( 1.0,  1.0)).rgb;
      vec3 e = texture2D(uTex, vUv).rgb;
      vec3 f = texture2D(uTex, vUv + t*vec2(-2.0, 0.0)).rgb;
      vec3 g = texture2D(uTex, vUv + t*vec2( 2.0, 0.0)).rgb;
      vec3 h = texture2D(uTex, vUv + t*vec2( 0.0,-2.0)).rgb;
      vec3 i = texture2D(uTex, vUv + t*vec2( 0.0, 2.0)).rgb;
      vec3 sum = (a+b+c+d)*0.125 + e*0.125 + (f+g+h+i)*0.0625;
      sum += (texture2D(uTex, vUv + t*vec2(-2.0,-2.0)).rgb
            + texture2D(uTex, vUv + t*vec2( 2.0,-2.0)).rgb
            + texture2D(uTex, vUv + t*vec2(-2.0, 2.0)).rgb
            + texture2D(uTex, vUv + t*vec2( 2.0, 2.0)).rgb)*0.03125;
      gl_FragColor = vec4(sum, 1.0);
    }
  `, { uTex: { value: null }, uTexel: { value: new THREE.Vector2() } });

  const up = makeQuad(/* glsl */`
    uniform sampler2D uTex;
    uniform sampler2D uPrev;
    uniform vec2 uTexel;
    uniform float uMix;
    varying vec2 vUv;
    void main(){
      vec2 t = uTexel;
      vec3 s = texture2D(uTex, vUv + t*vec2(-1.0, 0.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 1.0, 0.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 0.0,-1.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 0.0, 1.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2(-1.0,-1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2( 1.0,-1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2(-1.0, 1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2( 1.0, 1.0)).rgb;
      s += texture2D(uTex, vUv).rgb*4.0;
      s /= 16.0;
      gl_FragColor = vec4(texture2D(uPrev, vUv).rgb + s*uMix, 1.0);
    }
  `, {
    uTex: { value: null }, uPrev: { value: null },
    uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 },
  });

  // --- composite -----------------------------------------------------------
  const comp = makeQuad(/* glsl */`
    #include <common>
    ${ENV_UNIFORMS}
    ${NOISE}
    ${DEPTH_UTIL}
    uniform sampler2D uScene;
    uniform sampler2D uDepth;
    uniform sampler2D uAir;
    uniform sampler2D uSSR;
    uniform sampler2D uBloom;
    uniform vec2 uRes;
    uniform vec2 uTexel;
    uniform vec3 uSunScreen;
    uniform mat4 uPrevVP;
    uniform float uDof;
    uniform float uFocus;
    uniform float uMotion;
    uniform float uFrame;
    uniform float uFlash;
    uniform float uSlowmo;
    uniform float uBloomAmt;
    uniform float uSsrAmt;
    uniform vec3 uGradeLift;
    uniform vec3 uGradeGamma;
    uniform vec3 uGradeGain;
    uniform float uSat;
    varying vec2 vUv;

    // AgX-flavoured filmic curve: holds saturation in the highlights far
    // better than Reinhard and does not go chalky like plain ACES-fit.
    vec3 tonemap(vec3 x){
      x = max(x, vec3(0.0));
      // Hill's ACES RRT+ODT fit, with a touch of pre-desaturation so the
      // floodlit highlights roll off to white instead of to magenta.
      float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
      x = mix(x, vec3(l), smoothstep(1.0, 7.0, l)*0.35);
      vec3 a = x*(x + 0.0245786) - 0.000090537;
      vec3 b = x*(0.983729*x + 0.4329510) + 0.238081;
      vec3 c = a/b;
      // slight toe lift so the shadows do not crush to pure black
      return pow(clamp(c, 0.0, 1.0), vec3(0.93));
    }

    vec3 sampleScene(vec2 uv){ return texture2D(uScene, uv).rgb; }

    void main(){
      vec2 uv = vUv;
      float depth = texture2D(uDepth, uv).x;
      vec3 col;

      // --- camera motion blur (reprojection) ---------------------------
      vec2 vel = vec2(0.0);
      if (uMotion > 0.01 && depth < 0.9999){
        vec3 P = worldFromDepth(uv, depth);
        vec4 pc = uPrevVP*vec4(P, 1.0);
        vec2 prevUv = pc.xy/pc.w*0.5 + 0.5;
        vel = (uv - prevUv)*0.5*uMotion;
        vel = clamp(vel, vec2(-0.035), vec2(0.035));
      }
      float dither = hash12(uv*uRes + uFrame);
      col = sampleScene(uv);
      if (dot(vel, vel) > 1e-8){
        vec3 acc = col;
        for (int i = 1; i < 6; i++){
          float f = (float(i) + dither)/6.0;
          acc += sampleScene(uv - vel*f);
          acc += sampleScene(uv + vel*f*0.35);
        }
        col = acc/11.0;
      }

      // --- depth of field (ring bokeh) ----------------------------------
      if (uDof > 0.005 && depth < 0.9999){
        float lin = linearDepth(depth);
        float coc = clamp(abs(lin - uFocus)/max(uFocus, 1.0), 0.0, 1.0);
        coc = pow(coc, 0.9)*uDof;
        if (coc > 0.004){
          vec2 r = coc*0.022*vec2(1.0, uRes.x/uRes.y);
          vec3 acc = col;
          float wsum = 1.0;
          for (int i = 0; i < 10; i++){
            float a = (float(i) + dither)*0.6283185;
            vec2 o = vec2(cos(a), sin(a))*r*(0.45 + 0.55*fract(float(i)*0.618));
            vec3 s = sampleScene(uv + o);
            float sd = texture2D(uDepth, uv + o).x;
            float sl = linearDepth(sd);
            // never pull sharp foreground into the blurred background
            float w = sl > lin - 0.5 ? 1.0 : 0.25;
            acc += s*w; wsum += w;
          }
          col = acc/wsum;
        }
      }

      // --- screen-space reflections on the wet ground --------------------
      vec4 ssr = texture2D(uSSR, uv);
      if (ssr.a > 0.002) col += ssr.rgb*ssr.a*uWet*uSsrAmt;

      // --- volumetrics + contact shadow ---------------------------------
      vec4 airS = texture2D(uAir, uv);
      col *= 1.0 - airS.a*0.55;
      col += airS.rgb;

      // --- bloom ---------------------------------------------------------
      vec3 bloom = texture2D(uBloom, uv).rgb;
      col += bloom*uBloomAmt;

      // --- lens flare ----------------------------------------------------
      if (uSunScreen.z > 0.001){
        vec2 sp = uSunScreen.xy*0.5 + 0.5;
        // the flare only exists if the sun is actually visible: 5 taps of the
        // depth buffer around it, so it fades behind the roof and the stands
        float vis = 0.0;
        for (int i = 0; i < 5; i++){
          vec2 o = vec2(float(i-2)*0.012, float((i*3)%5-2)*0.012);
          vis += step(0.99995, texture2D(uDepth, clamp(sp+o, 0.0, 1.0)).x);
        }
        vis /= 5.0;
        vec2 d = uv - sp;
        float aspect = uRes.x/uRes.y;
        d.x *= aspect;
        float r = length(d);
        vec3 flare = vec3(0.0);
        // anamorphic streak
        float streak = exp(-pow(abs(d.y)*90.0, 1.6))*exp(-abs(d.x)*2.4);
        flare += vec3(0.45, 0.62, 1.0)*streak*0.55;
        // halo + ghosts
        flare += vec3(1.0, 0.86, 0.62)*exp(-r*r*34.0)*0.65;
        for (int i = 1; i <= 4; i++){
          float f = -0.35*float(i);
          vec2 g = d*f;
          float gr = length(g);
          vec3 tint = i == 1 ? vec3(0.35,0.55,1.0) : i == 2 ? vec3(1.0,0.55,0.35)
                    : i == 3 ? vec3(0.45,1.0,0.65) : vec3(0.85,0.55,1.0);
          flare += tint*exp(-pow(gr*7.0, 2.0))*0.16;
        }
        float ring = exp(-pow((r - 0.34)*11.0, 2.0))*0.10;
        flare += vec3(0.6, 0.75, 1.0)*ring;
        col += flare*uSunScreen.z*vis*uSunColor*0.09;
      }

      // --- exposure, tonemap, grade -------------------------------------
      col *= uExposure*(1.0 + uFlash*2.2);
      col = tonemap(col);
      col = pow(max(col, 0.0), uGradeGamma)*uGradeGain + uGradeLift;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      // replay / slow-motion gets a cooler, crushed look
      col = mix(col, mix(vec3(l), col*vec3(0.92, 0.97, 1.08), 1.1), uSlowmo*0.5);
      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `, Object.assign({}, E, {
    uScene: shared.uScene, uDepth: shared.uDepth,
    uAir: { value: airRT.texture }, uSSR: { value: ssrRT.texture },
    uBloom: { value: upRT[0].texture },
    uRes: shared.uRes, uTexel: shared.uTexel, uSunScreen: shared.uSunScreen,
    uInvVP: shared.uInvVP, uVP: shared.uVP, uPrevVP: shared.uPrevVP, uClip: shared.uClip,
    uDof: shared.uDof, uFocus: shared.uFocus, uMotion: shared.uMotion, uFrame: shared.uFrame,
    uFlash: shared.uFlash, uSlowmo: shared.uSlowmo,
    uBloomAmt: { value: 0.52 }, uSsrAmt: { value: tier >= 2 ? 0.55 : 0 },
    uGradeLift: shared.uGradeLift, uGradeGamma: shared.uGradeGamma,
    uGradeGain: shared.uGradeGain, uSat: shared.uSat,
  }));

  // --- final: AA, sharpen, grain, aberration, vignette --------------------
  const final = makeQuad(/* glsl */`
    #include <common>
    ${NOISE}
    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform vec2 uTexel;
    uniform float uTime;
    uniform float uAA;
    uniform float uSharp;
    uniform float uGrain;
    uniform float uCA;
    uniform float uVignette;
    varying vec2 vUv;

    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main(){
      vec2 uv = vUv;
      vec2 t = uTexel;
      // chromatic aberration grows toward the corners, like real glass
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      vec3 col;
      if (uCA > 0.0001){
        vec2 off = cc*r2*uCA;
        col.r = texture2D(uTex, uv + off).r;
        col.g = texture2D(uTex, uv).g;
        col.b = texture2D(uTex, uv - off).b;
      } else {
        col = texture2D(uTex, uv).rgb;
      }

      // --- FXAA (luma edge, 3 taps either side) -------------------------
      if (uAA > 0.5){
        vec3 nw = texture2D(uTex, uv + vec2(-t.x, -t.y)).rgb;
        vec3 ne = texture2D(uTex, uv + vec2( t.x, -t.y)).rgb;
        vec3 sw = texture2D(uTex, uv + vec2(-t.x,  t.y)).rgb;
        vec3 se = texture2D(uTex, uv + vec2( t.x,  t.y)).rgb;
        float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(col);
        float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
        float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
        vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
        float dirReduce = max((lNW + lNE + lSW + lSE)*0.25*0.06, 1.0/128.0);
        float rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
        dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*t;
        vec3 a = 0.5*(texture2D(uTex, uv + dir*(1.0/3.0 - 0.5)).rgb
                    + texture2D(uTex, uv + dir*(2.0/3.0 - 0.5)).rgb);
        vec3 b = a*0.5 + 0.25*(texture2D(uTex, uv + dir*-0.5).rgb
                             + texture2D(uTex, uv + dir*0.5).rgb);
        float lB = lum(b);
        col = (lB < lMin || lB > lMax) ? a : b;
      }

      // --- contrast adaptive sharpen ------------------------------------
      if (uSharp > 0.001){
        vec3 n = texture2D(uTex, uv + vec2(0.0, -t.y)).rgb;
        vec3 s = texture2D(uTex, uv + vec2(0.0,  t.y)).rgb;
        vec3 w = texture2D(uTex, uv + vec2(-t.x, 0.0)).rgb;
        vec3 e = texture2D(uTex, uv + vec2( t.x, 0.0)).rgb;
        vec3 mn = min(col, min(min(n, s), min(w, e)));
        vec3 mx = max(col, max(max(n, s), max(w, e)));
        vec3 amp = sqrt(clamp(min(mn, 1.0 - mx)/max(mx, 1e-4), 0.0, 1.0));
        vec3 sharp = col*(1.0 + uSharp*amp*4.0) - (n + s + w + e)*uSharp*amp;
        col = clamp(sharp, 0.0, 4.0);
      }

      // --- grain + vignette ---------------------------------------------
      float g = hash12(uv*uRes + fract(uTime)*137.0) - 0.5;
      col += g*uGrain*(1.0 - lum(col)*0.6);
      float vig = 1.0 - uVignette*pow(r2*2.0, 1.35);
      col *= clamp(vig, 0.0, 1.0);

      // we own the whole pipeline, so the sRGB transfer is ours to apply
      col = clamp(col, 0.0, 1.0);
      vec3 lo = col*12.92;
      vec3 hi = 1.055*pow(col, vec3(1.0/2.4)) - 0.055;
      gl_FragColor = vec4(mix(lo, hi, step(0.0031308, col)), 1.0);
    }
  `, {
    uTex: { value: compRT.texture }, uRes: shared.uRes, uTexel: shared.uTexel,
    uTime: E.uTime, uAA: { value: tier >= 1 ? 1 : 0 }, uSharp: { value: tier >= 1 ? 0.35 : 0.2 },
    uGrain: { value: 0.016 }, uCA: { value: tier >= 1 ? 0.0022 : 0 },
    uVignette: shared.uVignette,
  });

  const prevVP = new THREE.Matrix4();
  const curVP = new THREE.Matrix4();
  const sunNdc = new THREE.Vector3();
  const camFwd = new THREE.Vector3();
  let frame = 0;
  const api = {
    sceneRT,
    shared,
    enableSSR: tier >= 2,
    enableAir: tier >= 1,
    setSize(w, h) {
      W = Math.max(2, Math.floor(w)); H = Math.max(2, Math.floor(h));
      sceneRT.setSize(W, H);
      const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1);
      airRT.setSize(hw, hh);
      ssrRT.setSize(hw, hh);
      compRT.setSize(W, H);
      for (let i = 0; i < MIPS; i++) {
        const s = 1 << (i + 1);
        bloomRT[i].setSize(Math.max(2, Math.floor(W / s)), Math.max(2, Math.floor(H / s)));
        upRT[i].setSize(Math.max(2, Math.floor(W / s)), Math.max(2, Math.floor(H / s)));
      }
      shared.uRes.value.set(W, H);
      shared.uTexel.value.set(1 / W, 1 / H);
    },
    /** Called once per frame, before the scene is drawn. */
    beginFrame(camera, light, sunDir, shadowDir) {
      if (shadowDir) shared.uShadowDir.value.copy(shadowDir);
      prevVP.copy(curVP);
      curVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      shared.uVP.value.copy(curVP);
      shared.uInvVP.value.copy(curVP).invert();
      shared.uPrevVP.value.copy(prevVP);
      shared.uClip.value.set(camera.near, camera.far);
      shared.uFrame.value = (frame = (frame + 1) % 1024);
      if (light && light.shadow && light.shadow.map) {
        shared.uShadowMap.value = light.shadow.map.texture;
        shared.uShadowMat.value.copy(light.shadow.matrix);
      }
      // where is the sun on screen, and is it in front of us at all?
      camera.getWorldDirection(camFwd);
      const facing = camFwd.dot(sunDir);
      if (facing > 0.02) {
        sunNdc.copy(sunDir).multiplyScalar(900).add(camera.position).applyMatrix4(curVP);
        const edge = Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y));
        const vis = Math.min(1, facing * 2.2) * (1 - Math.min(1, Math.max(0, edge - 1) * 1.6));
        shared.uSunScreen.value.set(sunNdc.x, sunNdc.y, Math.max(0, vis));
      } else {
        shared.uSunScreen.value.z = 0;
      }
    },
    setSunVisibility(v) { shared.uSunScreen.value.z *= v; },
    setGrade(grade) {
      shared.uGradeLift.value.copy(grade.lift);
      shared.uGradeGamma.value.copy(grade.gamma);
      shared.uGradeGain.value.copy(grade.gain);
      shared.uSat.value = grade.sat;
    },
    setCinematic({ dof = 0, focus = 25, flash = 0, slowmo = 0, vignette = 0.32 }) {
      shared.uDof.value = dof;
      shared.uFocus.value = focus;
      shared.uFlash.value = flash;
      shared.uSlowmo.value = slowmo;
      shared.uVignette.value = vignette;
    },
    /** Run the chain and present. */
    render() {
      const hw = Math.max(2, W >> 1), hh = Math.max(2, H >> 1);
      if (api.enableAir) {
        air.uniforms.uRes.value.set(hw, hh);
        air.render(renderer, airRT);
      }
      if (api.enableSSR) {
        ssr.uniforms.uRes.value.set(hw, hh);
        ssr.render(renderer, ssrRT);
      }
      comp.uniforms.uSsrAmt.value = api.enableSSR ? 0.55 : 0;
      // bloom chain
      bright.uniforms.uTexel.value.set(1 / W, 1 / H);
      bright.render(renderer, bloomRT[0]);
      for (let i = 1; i < MIPS; i++) {
        down.uniforms.uTex.value = bloomRT[i - 1].texture;
        down.uniforms.uTexel.value.set(1 / bloomRT[i - 1].width, 1 / bloomRT[i - 1].height);
        down.render(renderer, bloomRT[i]);
      }
      // upsample: start from the smallest, accumulate downward
      let prev = bloomRT[MIPS - 1];
      for (let i = MIPS - 2; i >= 0; i--) {
        up.uniforms.uTex.value = prev.texture;
        up.uniforms.uPrev.value = bloomRT[i].texture;
        up.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
        // wider mips contribute less, so the glow stays around the source
        up.uniforms.uMix.value = 0.72;
        up.render(renderer, upRT[i]);
        prev = upRT[i];
      }
      comp.uniforms.uBloom.value = prev.texture;
      comp.uniforms.uAir.value = api.enableAir ? airRT.texture : null;
      comp.render(renderer, compRT);
      final.uniforms.uTex.value = compRT.texture;
      final.render(renderer, null);
    },
    dispose() {
      sceneRT.dispose(); airRT.dispose(); ssrRT.dispose(); compRT.dispose();
      for (const r of bloomRT) r.dispose();
      for (const r of upRT) r.dispose();
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// shaderlib.js : the GLSL foundation every material in the game is built on.
//
// There is not a single texture file in this project, so everything a texture
// would normally give us -- grass, leather, fabric, concrete, crowd, clouds,
// dirt, sweat -- is a function here. The lighting model is also ours: three.js
// only supplies the shadow map plumbing, the BRDF and the sky are analytic.
//
// Conventions
//   * world space is Z-UP (it matches the simulation: x = length, y = width,
//     z = height), so "up" is vec3(0,0,1) in every shader below.
//   * radiance is linear and un-exposed; tonemapping happens once, in post.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

/**
 * Uniform block for a material that uses three's shadow chunks. The light
 * uniforms are cloned (three writes per-material flags into them); ours are
 * passed by reference so one CPU write updates the whole stadium.
 */
export function litUniforms(...parts) {
  return Object.assign(
    {},
    THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
    ...parts,
  );
}

// --- hashes & noise --------------------------------------------------------
export const NOISE = /* glsl */`
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3  hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yzz)*p3.zyx); }
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x),
             mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  float n000 = hash13(i), n100 = hash13(i+vec3(1,0,0));
  float n010 = hash13(i+vec3(0,1,0)), n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1)), n101 = hash13(i+vec3(1,0,1));
  float n011 = hash13(i+vec3(0,1,1)), n111 = hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
             mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}
// signed gradient noise: better for normals than value noise
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 g00 = normalize(hash22(i)*2.0-1.0), g10 = normalize(hash22(i+vec2(1,0))*2.0-1.0);
  vec2 g01 = normalize(hash22(i+vec2(0,1))*2.0-1.0), g11 = normalize(hash22(i+vec2(1,1))*2.0-1.0);
  float v00 = dot(g00, f), v10 = dot(g10, f-vec2(1,0));
  float v01 = dot(g01, f-vec2(0,1)), v11 = dot(g11, f-vec2(1,1));
  return mix(mix(v00,v10,u.x), mix(v01,v11,u.x), u.y)*1.4;
}
float fbm(vec2 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a*vnoise(p); n += a; p = p*2.03 + 17.3; a *= 0.5;
  }
  return s/max(n, 1e-4);
}
float fbmS(vec2 p, int oct){            // signed, zero mean
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a*gnoise(p); p = p*2.07 + 11.7; a *= 0.5;
  }
  return s;
}
float fbm3(vec3 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    s += a*vnoise3(p); n += a; p = p*2.11 + 9.1; a *= 0.5;
  }
  return s/max(n, 1e-4);
}
// cellular noise -> F1 distance + cell id. Used for grass clumps, leather
// grain, crowd seating and puddle shapes.
vec3 voronoi(vec2 p){
  vec2 ip = floor(p), fp = fract(p);
  float f1 = 8.0, f2 = 8.0; vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(ip+g);
    float d = length(g + o - fp);
    if (d < f1){ f2 = f1; f1 = d; id = ip+g; }
    else if (d < f2) f2 = d;
  }
  return vec3(f1, f2-f1, hash12(id));
}
`;

// --- shared environment uniforms -------------------------------------------
// One block, declared in both stages, backed by shared THREE.Uniform objects
// (see env.js) so a single CPU write updates every material in the scene.
export const ENV_UNIFORMS = /* glsl */`
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uSunDir;          // world, points TOWARD the sun
uniform vec3  uSunColor;        // direct radiance
uniform vec3  uSkyZenith;
uniform vec3  uSkyHorizon;
uniform vec3  uSkyGround;
uniform vec3  uFogColor;
uniform vec2  uFogParams;       // x = density, y = height falloff (1/m)
uniform float uTurbidity;
uniform float uNight;           // 0 = daylight, 1 = floodlit night
uniform float uWet;             // 0 = dry pitch, 1 = soaked
uniform vec2  uWind;
uniform float uExposure;
uniform vec4  uFlood[8];        // xyz = position, w = intensity
uniform vec3  uFloodColor;
uniform float uFloodCount;
`;

// --- analytic sky ----------------------------------------------------------
// Art-directable single-scatter model: a Rayleigh-ish gradient from horizon to
// zenith, a Mie lobe around the sun, two FBM cloud decks and, at night, stars
// plus a milky-way band. Called by the sky dome, by every reflective surface
// and by the fog, so the whole frame agrees on what the sky looks like.
export const SKY = /* glsl */`
float miePhase(float c, float g){
  float g2 = g*g;
  return (1.0-g2)/(4.0*PI*pow(1.0+g2-2.0*g*c, 1.5));
}
float rayleighPhase(float c){ return (3.0/(16.0*PI))*(1.0+c*c); }

vec3 cloudLayer(vec3 d, float h, float scale, float cover, float t){
  if (d.z <= 0.012) return vec3(0.0);
  float tHit = h/d.z;
  vec2 q = (uCamPos.xy + d.xy*tHit)*scale + uWind*t*0.06;
  float f = fbm(q, 5);
  float m = smoothstep(cover, cover+0.28, f);
  // vertical silver lining: more light leaks through thin edges
  float thin = smoothstep(cover+0.30, cover, f);
  float sun = max(dot(d, uSunDir), 0.0);
  float fade = smoothstep(0.012, 0.16, d.z);
  return vec3(m*fade, thin*fade, pow(sun, 24.0));
}

vec3 skyRadiance(vec3 d, float withSun){
  float up = clamp(d.z, -1.0, 1.0);
  float c = clamp(dot(d, uSunDir), -1.0, 1.0);

  // horizon -> zenith gradient, thicker air near the horizon
  float t = pow(clamp(1.0 - up, 0.0, 1.0), 2.4);
  vec3 col = mix(uSkyZenith, uSkyHorizon, t);

  // Mie forward scattering (the big soft glow around the sun) and a touch of
  // Rayleigh so the whole dome brightens as the sun gets low.
  float sunUp = clamp(uSunDir.z, 0.0, 1.0);
  float mie = miePhase(c, mix(0.60, 0.80, 1.0-sunUp))*14.0*uTurbidity;
  float ray = rayleighPhase(c)*2.2;
  col += uSunColor*(mie*0.085 + ray*0.03)*(0.35+0.65*smoothstep(-0.12, 0.25, up));

  // ground bounce below the horizon line
  col = mix(col, uSkyGround, smoothstep(0.0, -0.08, up));

  // night: stars + milky way, hidden by day and by cloud
  if (uNight > 0.01){
    vec3 sd = d*vec3(1.0,1.0,1.0);
    vec2 sp = sd.xy/max(abs(sd.z)+0.35, 0.05);
    float stars = pow(hash12(floor(sp*420.0)), 240.0)*step(0.02, up);
    float tw = 0.65+0.35*sin(uTime*2.3 + hash12(floor(sp*420.0))*63.0);
    float band = smoothstep(0.52, 0.0, abs(sd.x*0.42 + sd.z*0.62 - 0.12));
    col += uNight*(vec3(0.85,0.92,1.0)*stars*tw*2.2
         + vec3(0.09,0.11,0.17)*band*fbm(sp*7.0, 4)*smoothstep(0.0,0.3,up));
  }

  // sun disk with limb softening + aureole
  if (withSun > 0.5){
    float disk = smoothstep(0.99955, 0.99985, c);
    float aureole = pow(max(c, 0.0), 1800.0);
    col += uSunColor*(disk*62.0 + aureole*9.0)*(1.0-uNight*0.92);
  }

  // cloud decks
  vec3 cl = cloudLayer(d, 900.0, 0.00055, 0.52, uTime);
  vec3 cl2 = cloudLayer(d, 2600.0, 0.00022, 0.62, uTime*0.6);
  vec3 cloudLit = uSkyHorizon*0.85 + uSunColor*0.055*(0.35 + cl.z*2.2);
  vec3 cloudDark = uSkyZenith*0.42 + uSkyGround*0.18;
  vec3 cc = mix(cloudDark, cloudLit, 0.45 + 0.55*cl.y);
  col = mix(col, cc, cl.x*0.82*(1.0-uNight*0.55));
  col = mix(col, mix(cloudDark, cloudLit, 0.3), cl2.x*0.38*(1.0-uNight*0.6));
  return max(col, vec3(0.0));
}
vec3 skyRadiance(vec3 d){ return skyRadiance(d, 1.0); }

// Roughness-aware sky probe. Instead of a prefiltered cubemap we lerp the
// whole dome toward its average as the surface gets rougher -- cheap, stable,
// and indistinguishable at the sizes things appear on screen here.
vec3 skyProbe(vec3 r, float rough){
  vec3 avg = (uSkyZenith*0.55 + uSkyHorizon*0.45)*(0.55+0.45*(1.0-uNight));
  vec3 sharp = skyRadiance(normalize(r), 0.0);
  return mix(sharp, avg, clamp(rough*rough*1.35, 0.0, 1.0));
}

// Cosine-lobe average of the sky dome around n, plus the bounce off the
// pitch. Returned as radiance, so a Lambert surface is simply albedo*this.
vec3 skyIrradiance(vec3 n){
  float up = n.z*0.5 + 0.5;
  vec3 low  = uSkyHorizon*0.82 + uSkyZenith*0.18;   // lobe pointing sideways
  vec3 high = uSkyZenith*0.58 + uSkyHorizon*0.42;   // lobe pointing up
  vec3 sky = mix(low, high, up);
  vec3 bounce = uSkyGround*(1.0 - up)*1.15;
  return sky*(0.55 + 0.45*up) + bounce;
}
`;

// --- BRDF ------------------------------------------------------------------
export const BRDF = /* glsl */`
float D_GGX(float NoH, float a){
  float a2 = a*a;
  float d = (NoH*a2-NoH)*NoH+1.0;
  return a2/max(PI*d*d, 1e-7);
}
float V_SmithGGX(float NoV, float NoL, float a){
  float a2 = a*a;
  float gv = NoL*sqrt(NoV*NoV*(1.0-a2)+a2);
  float gl = NoV*sqrt(NoL*NoL*(1.0-a2)+a2);
  return 0.5/max(gv+gl, 1e-6);
}
vec3 F_Schlick(vec3 f0, float u){ return f0 + (vec3(1.0)-f0)*pow(1.0-u, 5.0); }
float F_Schlick(float f0, float u){ return f0 + (1.0-f0)*pow(1.0-u, 5.0); }

// Karis' analytic environment BRDF (mobile friendly, no LUT).
vec3 envBRDF(vec3 f0, float rough, float NoV){
  vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough*c0 + c1;
  float a004 = min(r.x*r.x, exp2(-9.28*NoV))*r.x + r.y;
  vec2 ab = vec2(-1.04, 1.04)*a004 + r.zw;
  return f0*ab.x + ab.y;
}

// Cloth / fabric: inverted-Gaussian sheen lobe on top of a wrapped diffuse.
// This is what stops the kits looking like painted plastic.
float D_Charlie(float NoH, float rough){
  float a = max(rough, 0.07);
  float invR = 1.0/a;
  float cos2 = NoH*NoH;
  float sin2 = 1.0-cos2;
  return (2.0+invR)*pow(sin2, invR*0.5)/(2.0*PI);
}
float V_Ashikhmin(float NoV, float NoL){ return clamp(1.0/max(4.0*(NoL+NoV-NoL*NoV), 1e-4), 0.0, 2.0); }

// Wrapped diffuse for skin / cloth: light bleeds a little past the terminator.
float wrapDiffuse(float NoL, float w){ return clamp((NoL+w)/((1.0+w)*(1.0+w)), 0.0, 1.0); }

struct Surface {
  vec3 P; vec3 N; vec3 V; vec3 albedo;
  float rough; float metal; float ao; float spec;
};

vec3 directLight(Surface s, vec3 L, vec3 radiance){
  vec3 H = normalize(L+s.V);
  float NoL = max(dot(s.N, L), 0.0);
  float NoV = max(dot(s.N, s.V), 1e-4);
  float NoH = max(dot(s.N, H), 0.0);
  float VoH = max(dot(s.V, H), 0.0);
  float a = max(s.rough*s.rough, 2e-3);
  vec3 f0 = mix(vec3(0.04*s.spec), s.albedo, s.metal);
  vec3 F = F_Schlick(f0, VoH);
  float D = D_GGX(NoH, a);
  float Vis = V_SmithGGX(NoV, NoL, a);
  vec3 spec = F*D*Vis;
  vec3 kd = (vec3(1.0)-F)*(1.0-s.metal);
  return (kd*s.albedo*RECIPROCAL_PI + spec)*radiance*NoL;
}

vec3 ambientLight(Surface s){
  float NoV = max(dot(s.N, s.V), 1e-4);
  vec3 f0 = mix(vec3(0.04*s.spec), s.albedo, s.metal);
  vec3 irr = skyIrradiance(s.N)*s.ao;
  vec3 diff = s.albedo*(1.0 - s.metal)*irr;
  vec3 R = reflect(-s.V, s.N);
  vec3 refl = skyProbe(R, s.rough)*envBRDF(f0, s.rough, NoV);
  // horizon occlusion: never reflect the sky from below the ground
  refl *= mix(1.0, smoothstep(-0.25, 0.08, R.z), 0.75);
  return diff + refl*mix(s.ao, 1.0, 0.45);
}
`;

// --- floodlights -----------------------------------------------------------
export const FLOOD = /* glsl */`
vec3 floodLights(Surface s){
  if (uNight < 0.01 || uFloodCount < 0.5) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++){
    if (float(i) >= uFloodCount) break;
    vec3 lp = uFlood[i].xyz;
    vec3 d = lp - s.P;
    float dist2 = dot(d, d);
    vec3 L = d*inversesqrt(max(dist2, 1e-4));
    // rigs are aimed at the middle of the pitch: cone falloff toward the aim
    vec3 aim = normalize(vec3(0.0, 0.0, 1.2) - lp);
    float cone = smoothstep(0.12, 0.62, dot(-L, aim));
    float att = uFlood[i].w*26000.0/max(dist2, 64.0)*cone;
    if (att < 0.002) continue;
    sum += directLight(s, L, uFloodColor*att);
  }
  return sum*uNight;
}
`;

// --- fog / aerial perspective ---------------------------------------------
export const FOG = /* glsl */`
// Exponential height fog with the sun scattered into it. The night preset
// leans on this for the damp, heavy air of a floodlit match.
vec3 applyFog(vec3 col, vec3 P, vec3 V){
  float dist = length(P - uCamPos);
  float hC = max(uCamPos.z, 0.0), hP = max(P.z, 0.0);
  float k = max(uFogParams.y, 1e-4);
  float dz = hP - hC;
  float integral;
  if (abs(dz) < 1e-3) integral = dist*exp(-k*hC);
  else integral = dist*(exp(-k*hC) - exp(-k*hP))/(k*dz);
  float f = 1.0 - exp(-uFogParams.x*integral);
  f = clamp(f, 0.0, 1.0);
  float c = max(dot(normalize(P-uCamPos), uSunDir), 0.0);
  vec3 inscatter = uFogColor + uSunColor*miePhase(c, 0.72)*0.55*(1.0-uNight*0.65);
  return mix(col, inscatter, f);
}
`;

// --- three.js shadow plumbing ---------------------------------------------
// We only borrow the shadow map from three: PCF taps, cascade matrix and bias
// come from the renderer, everything else above is ours.
export const SHADOW_VERT_PARS = /* glsl */`
#include <common>
#include <shadowmap_pars_vertex>
`;
export const SHADOW_VERT = /* glsl */`
#include <shadowmap_vertex>
`;
export const SHADOW_FRAG_PARS = /* glsl */`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
`;

/** Prelude for a lit fragment shader: three's shadow chunks + our library. */
export function litFragment(extra = '') {
  return `${SHADOW_FRAG_PARS}
${ENV_UNIFORMS}
${NOISE}
${SKY}
${BRDF}
${FLOOD}
${FOG}
${extra}`;
}

/** Prelude for the matching vertex shader. */
export function litVertex(extra = '') {
  return `${SHADOW_VERT_PARS}
${ENV_UNIFORMS}
${NOISE}
${extra}`;
}

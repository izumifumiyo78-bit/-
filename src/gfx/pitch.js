// ---------------------------------------------------------------------------
// pitch.js : 7140 square metres of grass, written as a function.
//
// What is going on in the fragment shader, roughly in order:
//   1. a crowned, gently undulating surface (real pitches drain to the sides)
//   2. mown mosaic: 5 m blocks with alternating lay direction. The lay drives
//      an ANISOTROPIC specular lobe and a view-dependent brightness flip --
//      that is the actual physics of why mow patterns are visible on TV.
//   3. blade-scale colour, clump and normal detail, filtered by screen
//      footprint so it never aliases into noise at distance.
//   4. every FIFA marking as an analytic SDF, antialiased with fwidth.
//   5. seasonal wear: goalmouths, centre circle, penalty spots.
//   6. the live turf map: studs, slides, divots -- flattened sheen + soil.
//   7. water: wet-grass darkening, basin puddles with ripples, planar
//      reflection + Fresnel, and dew sparkle for the dry-but-damp mornings.
//   8. our own lighting: sun + shadow, sky irradiance, grass back-scatter,
//      floodlight rigs, height fog.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import {
  litFragment, litVertex, SHADOW_VERT, litUniforms, PITCH_HEIGHT, NOISE,
} from './shaderlib.js';

export const GROUND_X = PITCH.length + 2 * PITCH.runOffX + 46;
export const GROUND_Y = PITCH.width + 2 * PITCH.runOffY + 40;

export function createPitch(env, turf, opts = {}) {
  const seg = opts.tier >= 2 ? 192 : opts.tier >= 1 ? 128 : 64;
  const geo = new THREE.PlaneGeometry(GROUND_X, GROUND_Y, seg, Math.round(seg * 0.68));
  geo.computeVertexNormals();

  const uniforms = litUniforms(env.uniforms(), {
    uTurf: turf.uniforms.uTurf,
    uTurfSpan: turf.uniforms.uTurfSpan,
    uReflect: { value: null },
    uReflectVP: { value: new THREE.Matrix4() },
    uReflectOn: { value: 0 },
    uDew: { value: 0 },
    uQuality: { value: opts.tier >= 2 ? 1 : opts.tier >= 1 ? 0.6 : 0.3 },
    uMow: { value: new THREE.Vector2(5.0, 1.0) },  // block size, pattern mix
  });

  const mat = new THREE.ShaderMaterial({
    uniforms,
    lights: true,
    vertexShader: litVertex(PITCH_HEIGHT) + /* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main(){
        vec3 p = position;
        p.z += pitchHeight(p.xy);
        vec4 wp = modelMatrix*vec4(p, 1.0);
        vWorld = wp.xyz;
        vec3 objectNormal = vec3(0.0, 0.0, 1.0);
        vec3 transformedNormal = normalMatrix*objectNormal;
        vNormalW = normalize(mat3(modelMatrix)*objectNormal);
        vec4 worldPosition = wp;
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      uniform sampler2D uTurf;
      uniform vec2  uTurfSpan;
      uniform sampler2D uReflect;
      uniform mat4  uReflectVP;
      uniform float uReflectOn;
      uniform float uDew;
      uniform float uQuality;
      uniform vec2  uMow;
      varying vec3 vWorld;
      varying vec3 vNormalW;

      // --- anisotropic GGX (Filament's formulation) -----------------------
      float D_GGXaniso(float NoH, vec3 h, vec3 t, vec3 b, float at, float ab){
        float ToH = dot(t, h), BoH = dot(b, h);
        float a2 = at*ab;
        vec3 v = vec3(ab*ToH, at*BoH, a2*NoH);
        float v2 = dot(v, v);
        float w2 = a2/max(v2, 1e-7);
        return a2*w2*w2*RECIPROCAL_PI;
      }

      float segD(vec2 p, vec2 a, vec2 b){
        vec2 pa = p-a, ba = b-a;
        float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
        return length(pa-ba*h);
      }

      // Every marking on a FIFA pitch, as one distance field.
      float markings(vec2 p, out float spot){
        const float HL = ${PITCH.halfL.toFixed(2)};
        const float HW = ${PITCH.halfW.toFixed(2)};
        const float BD = ${PITCH.boxDepth.toFixed(2)};
        const float BW = ${PITCH.boxHalfW.toFixed(2)};
        const float SD = ${PITCH.sixDepth.toFixed(2)};
        const float SW = ${PITCH.sixHalfW.toFixed(2)};
        const float PS = ${PITCH.penSpot.toFixed(2)};
        float d = 1e9;
        vec2 a = abs(p);
        // boundary + halfway
        if (a.x < HL+0.6 && a.y < HW+0.6){
          d = min(d, abs(a.y-HW));
          d = min(d, abs(a.x-HL));
          d = min(d, abs(p.x));
          d = min(d, abs(length(p)-${PITCH.centreR.toFixed(2)}));
        }
        // penalty + goal areas (mirrored on both ends)
        float gx = HL - a.x;               // distance in from the goal line
        if (gx < BD+1.2 && a.y < BW+1.2){
          d = min(d, abs(gx-BD)*step(a.y, BW));                 // front edge
          d = min(d, abs(a.y-BW)*step(gx, BD) + (1.0-step(gx, BD))*1e9);
          d = min(d, abs(gx-SD)*step(a.y, SW));
          d = min(d, abs(a.y-SW)*step(gx, SD) + (1.0-step(gx, SD))*1e9);
          // penalty arc, only the part outside the box
          float dArc = abs(length(vec2(gx-PS, p.y)) - ${PITCH.arcR.toFixed(2)});
          d = min(d, mix(1e9, dArc, step(BD, gx)));
        }
        // corner arcs
        vec2 cq = a - vec2(HL, HW);
        d = min(d, abs(length(cq) - ${PITCH.cornerR.toFixed(2)}));
        // spots: centre + both penalty spots
        spot = 0.0;
        spot = max(spot, 1.0 - smoothstep(0.08, 0.115, length(p)));
        spot = max(spot, 1.0 - smoothstep(0.08, 0.115, length(vec2(gx-PS, p.y))));
        return d;
      }

      void main(){
        vec3 P = vWorld;
        vec2 q = P.xy;
        vec3 V = normalize(uCamPos - P);
        float viewDist = length(uCamPos - P);

        // screen footprint in metres: our LOD / filtering control
        float px = max(length(vec2(dFdx(q.x), dFdy(q.x))), length(vec2(dFdx(q.y), dFdy(q.y))));
        float detail = 1.0 - smoothstep(0.015, 0.12, px);
        float midDetail = 1.0 - smoothstep(0.06, 0.55, px);

        bool inPitch = abs(q.x) < ${(PITCH.halfL + 0.9).toFixed(2)} && abs(q.y) < ${(PITCH.halfW + 0.9).toFixed(2)};
        float apron = smoothstep(${PITCH.halfL.toFixed(1)}, ${(PITCH.halfL + 3.0).toFixed(1)}, abs(q.x))
                    + smoothstep(${PITCH.halfW.toFixed(1)}, ${(PITCH.halfW + 3.0).toFixed(1)}, abs(q.y));
        apron = clamp(apron, 0.0, 1.0);

        // --- mown mosaic -------------------------------------------------
        float cell = uMow.x;
        vec2 cid = floor(q/cell);
        float chk = mod(cid.x + cid.y, 2.0);
        vec2 lay = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), chk);
        // soften the block boundary: the mower leaves a 15 cm transition
        vec2 fcell = fract(q/cell);
        float edgeMix = min(min(fcell.x, 1.0-fcell.x), min(fcell.y, 1.0-fcell.y));
        float rollerMark = (1.0 - smoothstep(0.0, 0.035, edgeMix))*0.5;

        // --- blade detail ------------------------------------------------
        vec2 bladeQ = q*vec2(46.0, 46.0) + lay.yx*0.0;
        float blade = fbm(bladeQ, 2);
        float fine = vnoise(q*180.0 + lay*31.0);
        vec3 cl = voronoi(q*1.9);                 // clumps / growth variation
        vec3 cl2 = voronoi(q*0.33 + 7.0);         // broader colour banding
        float clump = cl.x;

        // --- turf map ----------------------------------------------------
        vec2 tuv = q/uTurfSpan + 0.5;
        vec4 scar = texture2D(uTurf, tuv);
        float flat0 = clamp(scar.r, 0.0, 1.0);
        float soil0 = clamp(scar.g, 0.0, 1.0);
        float splash = clamp(scar.b, 0.0, 1.0);

        // --- seasonal wear -----------------------------------------------
        float gx = ${PITCH.halfL.toFixed(2)} - abs(q.x);
        float mouth = exp(-pow(length(vec2(gx*0.55, q.y*0.30)), 1.6)*0.42);
        float centreWear = exp(-pow(length(q*vec2(0.09, 0.09)), 1.7));
        float spotWear = exp(-length(vec2(gx-${PITCH.penSpot.toFixed(2)}, q.y))*1.1);
        float wear = clamp(mouth*0.55 + centreWear*0.30 + spotWear*0.35
                      + fbm(q*0.09, 3)*0.22 - 0.06, 0.0, 1.0);
        wear = mix(wear, 0.0, apron*0.8);
        float soil = clamp(soil0*0.9 + wear*wear*0.42, 0.0, 1.0);
        float flatten = clamp(flat0 + wear*0.25, 0.0, 1.0);

        // --- albedo ------------------------------------------------------
        vec3 lush  = vec3(0.0295, 0.0905, 0.0235);
        vec3 light = vec3(0.0520, 0.1320, 0.0360);
        vec3 dry   = vec3(0.0860, 0.1020, 0.0410);
        vec3 dirt  = vec3(0.0820, 0.0560, 0.0345);
        vec3 alb = mix(lush, light, clamp(blade*0.75 + cl2.z*0.35 + clump*0.25, 0.0, 1.0));
        alb = mix(alb, dry, clamp(wear*0.55 + cl2.z*0.12, 0.0, 1.0)*0.75);
        alb = mix(alb, dirt, soil*0.88);
        alb *= 1.0 + (fine - 0.5)*0.16*detail;
        // the run-off is older, coarser, bluer grass
        alb = mix(alb, mix(alb, vec3(0.030, 0.062, 0.030), 0.55), apron);

        // --- lay-dependent brightness (the TV mow pattern) ---------------
        vec2 vxy = normalize(V.xy + vec2(1e-5));
        vec2 sxy = normalize(uSunDir.xy + vec2(1e-5));
        float vAlign = abs(dot(vxy, lay));
        float sAlign = abs(dot(sxy, lay));
        // blades leaning toward the viewer scatter more light back at them
        float mowGain = 1.0 + (vAlign - 0.5)*0.26 + (sAlign - 0.5)*0.12;
        mowGain = mix(1.0, mowGain, (1.0 - flatten*0.7)*(1.0 - apron*0.6)*uMow.y);
        alb *= mowGain;
        alb *= 1.0 - rollerMark*0.10;
        // Inside each block the mower's roller leaves fine parallel lines
        // along the direction it drove. They are what sells a cut pitch on
        // a long lens, and they cost one sine.
        float across = dot(q, vec2(-lay.y, lay.x));
        float roller = sin(across*6.2831/1.05);
        alb *= 1.0 + roller*0.017*midDetail*(1.0 - flatten*0.7)*(1.0 - apron*0.8);

        // --- markings ----------------------------------------------------
        float spot = 0.0;
        float dLine = markings(q, spot);
        float halfW = ${(PITCH.lineW * 0.5).toFixed(3)};
        float aa = max(px*0.9, 0.004);
        float paint = (1.0 - smoothstep(halfW - aa, halfW + aa, dLine));
        paint = max(paint, spot);
        paint *= inPitch ? 1.0 : 0.0;
        // worn paint: thinner where the turf is chewed up
        paint *= 1.0 - soil*0.55;
        vec3 paintCol = vec3(0.620, 0.645, 0.620)*(0.88 + 0.12*fine);
        alb = mix(alb, paintCol, paint*0.93);

        // --- normal ------------------------------------------------------
        float e = 0.035;
        float n0 = fbm(q*42.0, 2);
        float nx = fbm((q+vec2(e,0.0))*42.0, 2) - n0;
        float ny = fbm((q+vec2(0.0,e))*42.0, 2) - n0;
        vec3 N = normalize(vNormalW + vec3(-nx, -ny, 0.0)*8.0*detail*(1.0 - flatten*0.85));
        // blades lie along the mow direction -> tilt the normal with it
        N = normalize(N + vec3(lay*0.10*detail*(1.0 - flatten), 0.0));
        vec3 T = normalize(vec3(lay, 0.0) - N*dot(N, vec3(lay, 0.0)));
        vec3 B = cross(N, T);

        // --- water -------------------------------------------------------
        float basin = fbm(q*0.22, 4)*0.65 + fbm(q*0.07, 3)*0.35;
        float lowGround = smoothstep(0.52, 0.30, basin);
        float puddle = clamp((uWet - 0.45)*2.0, 0.0, 1.0)*lowGround
                     + splash*0.28*clamp(uWet, 0.0, 1.0);
        puddle = clamp(puddle*smoothstep(0.0, 0.25, 1.0 - apron*0.5), 0.0, 1.0);
        float wetGrass = clamp(uWet*1.15 + splash*0.3, 0.0, 1.0);

        // ripples: rain impacts + wind chop
        if (puddle > 0.01){
          float rip = 0.0;
          if (uWet > 0.6){
            vec2 rq = q*5.5;
            float t = uTime*1.7;
            rip  = sin(length(fract(rq)-0.5)*42.0 - t*7.0)*exp(-length(fract(rq)-0.5)*5.0);
            rip += fbmS(q*7.0 + uTime*vec2(0.25, 0.11), 3)*0.6;
          } else {
            rip = fbmS(q*3.5 + uWind*uTime*0.08, 3)*0.5;
          }
          N = normalize(mix(N, normalize(vec3(-rip*0.35, -rip*0.28, 1.0)), puddle*0.92));
        }
        alb = mix(alb, alb*vec3(0.42, 0.46, 0.44), wetGrass*0.55);
        alb = mix(alb, vec3(0.012, 0.016, 0.014), puddle*0.85);

        // --- material ----------------------------------------------------
        float rough = mix(0.74, 0.90, flatten);
        rough = mix(rough, 0.52, wetGrass*0.7);
        rough = mix(rough, 0.055, puddle);
        float ao = mix(1.0, 0.62, (1.0 - clump)*0.5*detail) * mix(1.0, 0.80, soil)
                 * mix(1.0, 0.92, flatten);
        ao *= 1.0 - paint*0.10;

        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = rough; s.metal = 0.0; s.ao = ao;
        s.spec = mix(0.6, 1.25, wetGrass) + puddle*0.45;

        float shadow = getShadowMask();
        vec3 col = vec3(0.0);

        // direct sun, with an anisotropic lobe along the mow lay
        vec3 L = uSunDir;
        float NoL = max(dot(N, L), 0.0);
        if (NoL > 0.0){
          vec3 H = normalize(L+V);
          float NoV = max(dot(N, V), 1e-4);
          float NoH = max(dot(N, H), 0.0);
          float VoH = max(dot(V, H), 0.0);
          float at = max(rough*rough*mix(0.45, 1.0, puddle), 2e-3);
          float ab = max(rough*rough*mix(1.55, 1.0, puddle), 2e-3);
          float D = D_GGXaniso(NoH, H, T, B, at, ab);
          float Vis = V_SmithGGX(NoV, NoL, max(rough*rough, 2e-3));
          vec3 F = F_Schlick(vec3(0.04*s.spec), VoH);
          vec3 diff = alb*RECIPROCAL_PI;
          col += (diff + D*Vis*F)*uSunColor*NoL*shadow;
        }
        // grass is translucent: light coming through the blades from behind
        float back = pow(max(dot(-V, L), 0.0), 3.0)*(1.0 - puddle);
        col += uSunColor*vec3(0.085, 0.175, 0.055)*back*0.55*shadow*(1.0 - flatten*0.6);

        col += ambientLight(s);
        col += floodLights(s)*(0.30 + 0.70*shadow);

        // --- reflections --------------------------------------------------
        // Energy conserving: at grazing angles water IS a mirror, so the
        // reflection replaces the diffuse rather than adding to it.
        float reflAmt = max(puddle, wetGrass*0.25);
        if (reflAmt > 0.01){
          vec3 R = reflect(-V, N);
          float NoV = max(dot(N, V), 0.0);
          // roughness-aware Fresnel: only smooth water turns into a mirror at
          // grazing angles, wet grass just gets a sheen
          float Fmax = max(1.0 - rough*1.25, 0.02);
          float F = 0.02 + (Fmax - 0.02)*pow(1.0 - NoV, 5.0);
          vec3 refl = skyProbe(R, mix(0.40, 0.04, puddle));
          if (uReflectOn > 0.5){
            vec4 rp = uReflectVP*vec4(P, 1.0);
            vec2 ruv = rp.xy/max(rp.w, 1e-4)*0.5 + 0.5;
            // distort by the water normal, then validate
            ruv += (N.xy - vNormalW.xy)*0.05*clamp(1.0/max(viewDist*0.15, 1.0), 0.0, 1.0);
            if (all(greaterThan(ruv, vec2(0.002))) && all(lessThan(ruv, vec2(0.998)))){
              vec3 planar = texture2D(uReflect, ruv).rgb;
              float edge = min(min(ruv.x, 1.0-ruv.x), min(ruv.y, 1.0-ruv.y));
              refl = mix(refl, planar, smoothstep(0.0, 0.06, edge)*0.92);
            }
          }
          col = mix(col, refl, clamp(F*reflAmt, 0.0, 0.90));
        }

        // --- dew / wet sparkle -------------------------------------------
        float sparkleAmt = max(uDew, wetGrass*0.35)*detail;
        if (sparkleAmt > 0.004){
          vec2 sq = floor(q*520.0);
          float g = hash12(sq);
          float glint = step(0.9955, g)*pow(max(dot(normalize(reflect(-V, normalize(vNormalW + vec3(hash22(sq)*2.0-1.0, 0.0)*0.9))), uSunDir), 0.0), 220.0);
          col += uSunColor*glint*sparkleAmt*26.0*shadow;
        }

        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `),
  });

  // The shadow pass must displace the ground exactly the same way, or the
  // depth it stores belongs to a flat plane the surface no longer sits on.
  const depthMat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */`
      #include <common>
      ${NOISE}
      ${PITCH_HEIGHT}
      void main(){
        vec3 p = position;
        p.z += pitchHeight(p.xy);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      #include <packing>
      void main(){ gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.customDepthMaterial = depthMat;
  mesh.receiveShadow = true;
  mesh.name = 'pitch';
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();

  return {
    mesh,
    mat,
    setReflection(tex, vp, on) {
      uniforms.uReflect.value = tex;
      if (vp) uniforms.uReflectVP.value.copy(vp);
      uniforms.uReflectOn.value = on ? 1 : 0;
    },
    setDew(v) { uniforms.uDew.value = v; },
    setMow(size, strength) { uniforms.uMow.value.set(size, strength); },
  };
}

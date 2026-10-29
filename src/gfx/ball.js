// ---------------------------------------------------------------------------
// ball.js : a 32-panel match ball, entirely analytic.
//
// The panel layout is a spherical Voronoi over the 32 face centres of a
// truncated icosahedron (12 pentagons from the icosahedron's vertices, 20
// hexagons from its face centres). The distance to the second-nearest centre
// gives the seam, which drives the groove, the stitch dashes and the normal.
// Leather grain, print, scuffs, grass stain and a water film are layered on
// top, and the whole thing rotates by a quaternion integrated from the
// simulation's spin -- so a knuckleball visibly stops spinning in flight.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { BALL } from '../core/config.js';
import { litFragment, litVertex, SHADOW_VERT, litUniforms } from './shaderlib.js';

/** The 32 panel centres of a truncated icosahedron, as unit vectors. */
function panelCentres() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico = [];
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      ico.push([0, s1, s2 * phi], [s1, s2 * phi, 0], [s2 * phi, 0, s1]);
    }
  }
  const V = ico.map((v) => new THREE.Vector3(...v).normalize());
  // hexagon centres: the centroids of the icosahedron's 20 faces
  const faces = [];
  for (let i = 0; i < V.length; i++) {
    for (let j = i + 1; j < V.length; j++) {
      for (let k = j + 1; k < V.length; k++) {
        const dij = V[i].distanceTo(V[j]), djk = V[j].distanceTo(V[k]), dik = V[i].distanceTo(V[k]);
        const edge = 1.0515; // edge length of a unit icosahedron
        if (Math.abs(dij - edge) < 0.02 && Math.abs(djk - edge) < 0.02 && Math.abs(dik - edge) < 0.02) {
          faces.push(new THREE.Vector3().add(V[i]).add(V[j]).add(V[k]).normalize());
        }
      }
    }
  }
  return { pent: V, hex: faces };
}

export function createBall(env, opts = {}) {
  const { pent, hex } = panelCentres();
  const centres = pent.concat(hex);
  const flat = new Float32Array(32 * 3);
  for (let i = 0; i < 32; i++) {
    const c = centres[i] || new THREE.Vector3(0, 0, 1);
    flat[i * 3] = c.x; flat[i * 3 + 1] = c.y; flat[i * 3 + 2] = c.z;
  }
  const centreArr = [];
  for (let i = 0; i < 32; i++) centreArr.push(new THREE.Vector3(flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]));

  const geo = new THREE.IcosahedronGeometry(BALL.r, opts.tier >= 2 ? 5 : 3);
  const uniforms = litUniforms(env.uniforms(), {
    uCentres: { value: centreArr },
    uDirt: { value: 0 },
    uSpinBlur: { value: 0 },
    uDeform: { value: new THREE.Vector4(0, 0, 1, 0) },   // object-space axis, amount
  });

  const mat = new THREE.ShaderMaterial({
    uniforms,
    lights: true,
    vertexShader: litVertex(/* glsl */`
      uniform vec4 uDeform;
    `) + /* glsl */`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      void main(){
        vLocal = normalize(position);
        // A struck ball is not a sphere for the first few milliseconds: squash
        // it along the contact axis and let it bulge at the equator.
        vec3 pos = position;
        if (uDeform.w > 0.001){
          vec3 ax = normalize(uDeform.xyz);
          float along = dot(pos, ax);
          vec3 perp = pos - ax*along;
          pos = perp*(1.0 + 0.42*uDeform.w) + ax*along*(1.0 - 0.52*uDeform.w);
        }
        vec4 wp = modelMatrix*vec4(pos, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      uniform vec3 uCentres[32];
      uniform float uDirt;
      uniform float uSpinBlur;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
    `) + /* glsl */`
      void main(){
        vec3 P = vWorld;
        vec3 V = normalize(uCamPos - P);
        vec3 L = normalize(vLocal);

        // --- spherical Voronoi over the 32 panel centres ------------------
        float d1 = -2.0, d2 = -2.0;
        int id = 0;
        for (int i = 0; i < 32; i++){
          float d = dot(L, uCentres[i]);
          if (d > d1){ d2 = d1; d1 = d; id = i; }
          else if (d > d2) d2 = d;
        }
        float seam = acos(clamp(d1, -1.0, 1.0)) ;
        float gap = (d1 - d2);                 // 0 exactly on a seam
        float fid = float(id);
        bool pentagon = fid < 12.5;

        // --- seam groove + stitching --------------------------------------
        // Seam width is fixed in panel space; the screen footprint only
        // decides how much of it a pixel can still resolve, so a distant ball
        // fades toward its average instead of going solid black.
        float px = max(length(vec2(dFdx(gap), dFdy(gap))), 1e-7);
        const float SEAM = 0.0075;
        float grooveSharp = 1.0 - smoothstep(SEAM*0.45, SEAM*1.35, gap);
        float resolve = 1.0 - smoothstep(SEAM*0.6, SEAM*3.0, px);
        float groove = mix(0.16, grooveSharp, resolve);
        // stitch dashes: run along the seam, so modulate by the position
        // perpendicular to the gradient of the panel distance
        float along = atan(L.y, L.x)*12.0 + L.z*21.0;
        float stitch = smoothstep(0.35, 0.65, abs(fract(along*1.7) - 0.5)*2.0);
        float stitchMask = grooveSharp*stitch*resolve;

        // --- leather --------------------------------------------------------
        float grain = fbm3(L*170.0, 3);
        float dimple = fbm3(L*62.0, 2);
        vec3 panelTint = vec3(0.905, 0.912, 0.920);
        // a few panels are printed dark, like a real match ball
        float printSel = fract(fid*0.6180339887);
        vec3 print = printSel > 0.78 ? vec3(0.030, 0.035, 0.055)
                   : printSel > 0.62 ? vec3(0.055, 0.30, 0.55)
                   : panelTint;
        // swirl graphic inside the printed panels
        // a restrained graphic inside the printed panels
        float swirl = smoothstep(0.40, 0.52, abs(sin(seam*9.0 + fid*2.1)));
        vec3 alb = mix(print, panelTint, swirl*0.35);
        alb *= 0.965 + 0.055*grain;
        alb = mix(alb, vec3(0.055, 0.057, 0.062), groove*0.92);
        alb = mix(alb, vec3(0.92, 0.92, 0.90), stitchMask*0.65);
        if (pentagon) alb *= 0.97;

        // --- dirt, grass and water -----------------------------------------
        float dirtMask = clamp(uDirt*(0.25 + fbm3(L*7.0, 3)*1.3), 0.0, 1.0);
        alb = mix(alb, vec3(0.085, 0.062, 0.040), dirtMask*0.5);
        float grassMask = clamp(uDirt*1.2*smoothstep(0.55, 0.9, fbm3(L*11.0 + 3.0, 3)), 0.0, 1.0);
        alb = mix(alb, vec3(0.055, 0.080, 0.028), grassMask*0.55);

        // --- normal ---------------------------------------------------------
        vec3 N = normalize(vNormalW);
        // build a tangent frame on the sphere
        vec3 T = normalize(cross(vec3(0.0, 0.0, 1.0), N) + 1e-5);
        vec3 B = cross(N, T);
        float gx = fbm3(L*170.0 + vec3(0.7, 0.0, 0.0), 3) - grain;
        float gy = fbm3(L*170.0 + vec3(0.0, 0.7, 0.0), 3) - grain;
        float detail = 1.0 - smoothstep(0.004, 0.05, max(length(vec2(dFdx(L.x), dFdy(L.x))), 1e-6));
        N = normalize(N + (T*gx + B*gy)*7.0*detail);
        // the groove itself is a dent
        N = normalize(mix(N, normalize(N + (T*dFdx(groove) + B*dFdy(groove))*-40.0), 0.6));
        N = normalize(N + (T + B)*stitchMask*0.08);

        float wet = uWet;
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = clamp(mix(0.34, 0.16, wet) + dirtMask*0.35 + dimple*0.06, 0.04, 1.0);
        s.metal = 0.0;
        s.ao = mix(1.0, 0.55, groove)*(0.85 + 0.15*dimple);
        s.spec = 1.6 + wet*2.2;

        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.name = 'ball';
  mesh.matrixAutoUpdate = false;

  const spinQ = new THREE.Quaternion();
  const dq = new THREE.Quaternion();
  const invQ = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const posV = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);
  const prevV = new THREE.Vector3();
  const impact = new THREE.Vector3(0, 0, 1);
  let dirt = 0;
  let deform = 0;

  return {
    mesh,
    /** Advance the ball's orientation from the simulation's spin state. */
    update(b, dt) {
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      // --- contact deformation ---------------------------------------
      impact.set(b.vx - prevV.x, b.vy - prevV.y, b.vz - prevV.z);
      const dv = impact.length();
      prevV.set(b.vx, b.vy, b.vz);
      if (dv > 4.5 && dt < 0.2) {
        deform = Math.min(0.62, dv / 42);
        invQ.copy(spinQ).invert();
        impact.divideScalar(dv).applyQuaternion(invQ);
        uniforms.uDeform.value.set(impact.x, impact.y, impact.z, deform);
      }
      if (deform > 0) {
        deform = Math.max(0, deform - dt * 7.5);
        uniforms.uDeform.value.w = deform;
      }
      if (b.rolling) {
        // rolling without slipping: omega = (up x v)/r
        axis.set(-b.vy, b.vx, 0);
        const m = axis.length();
        if (m > 1e-4) {
          axis.divideScalar(m);
          const w = Math.hypot(b.vx, b.vy) / BALL.r;
          dq.setFromAxisAngle(axis, w * dt);
          spinQ.premultiply(dq);
        }
      } else {
        axis.set(b.wx, b.wy, b.wz);
        const m = axis.length();
        if (m > 1e-4) {
          axis.divideScalar(m);
          dq.setFromAxisAngle(axis, m * dt);
          spinQ.premultiply(dq);
        }
        // airborne balls also tumble end over end from the kick
        axis.set(-b.vy, b.vx, 0);
        const m2 = axis.length();
        if (m2 > 1e-4) {
          axis.divideScalar(m2);
          dq.setFromAxisAngle(axis, Math.min(sp, 30) * 0.45 * dt);
          spinQ.premultiply(dq);
        }
      }
      spinQ.normalize();
      posV.set(b.x, b.y, b.z);
      mesh.matrix.compose(posV, spinQ, scl);
      mesh.matrixWorldNeedsUpdate = true;

      // mud and grass build up while the ball is on the deck, and wash off
      const onGround = b.z < BALL.r * 1.6;
      const target = onGround ? Math.min(1, 0.25 + Math.hypot(b.vx, b.vy) * 0.03) : 0;
      dirt += (target - dirt) * Math.min(1, dt * (onGround ? 0.35 : 0.08));
      uniforms.uDirt.value = dirt * (0.4 + 0.6 * env.u.uWet.value);
      uniforms.uSpinBlur.value = Math.min(1, sp / 28);
    },
    reset() { dirt = 0; spinQ.identity(); },
  };
}

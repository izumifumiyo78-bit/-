// ---------------------------------------------------------------------------
// lights.js : floodlight masts, their light shafts, and the LED hoardings.
//
// The masts are lattice towers built from instanced beams; their lamp heads
// feed env.setTowers() so the pitch, the kits and the leather are all actually
// lit by them. The shafts are additive cones -- the cheapest honest way to
// show 40 kW of light hitting damp night air. The hoardings are a real
// emissive signage ring whose content is drawn into a canvas at runtime (no
// image file is ever loaded) and scrolled.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { BOWL } from './bowl.js';
import { litFragment, litVertex, SHADOW_VERT, ENV_UNIFORMS, NOISE, SKY, litUniforms } from './shaderlib.js';

const MAST_H = 44;

function steelMaterial(env) {
  return new THREE.ShaderMaterial({
    uniforms: litUniforms(env.uniforms()),
    lights: true,
    vertexShader: litVertex() + /* glsl */`
      varying vec3 vWorld; varying vec3 vNormalW;
      void main(){
        vec4 wp = modelMatrix*instanceMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        mat3 m = mat3(modelMatrix*instanceMatrix);
        vNormalW = normalize(m*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*mat3(instanceMatrix)*normal;
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      varying vec3 vWorld; varying vec3 vNormalW;
    `) + /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        float r = fbm(P.xz*4.0 + P.y*2.0, 3);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.085,0.090,0.098), vec3(0.135,0.138,0.145), r);
        s.rough = 0.42 + r*0.18; s.metal = 0.62; s.ao = 0.85; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*(0.4 + 0.6*getShadowMask());
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function createFloodlights(env, opts = {}) {
  const group = new THREE.Group();
  group.name = 'floodlights';
  const steel = steelMaterial(env);
  const beam = new THREE.BoxGeometry(1, 1, 1);

  const masts = [
    [1, 1], [-1, 1], [-1, -1], [1, -1],
  ].map(([sx, sy]) => new THREE.Vector3(
    sx * (BOWL.innerX + 14), sy * (BOWL.innerY + 10), 0,
  ));

  // --- lattice towers ------------------------------------------------------
  const perMast = 4 + 16 * 3;
  const steelMesh = new THREE.InstancedMesh(beam, steel, masts.length * perMast);
  const m4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let si = 0;
  for (const base of masts) {
    const yaw = Math.atan2(-base.y, -base.x);
    const legSpread = 2.1;
    for (let l = 0; l < 4; l++) {
      const a = yaw + Math.PI * 0.25 + l * Math.PI * 0.5;
      const dx = Math.cos(a) * legSpread, dy = Math.sin(a) * legSpread;
      // legs lean in toward the top: approximate with a long thin box
      pos.set(base.x + dx * 0.5, base.y + dy * 0.5, MAST_H * 0.5);
      quat.setFromEuler(new THREE.Euler(
        Math.atan2(dy * 0.5, MAST_H) * 0.9, -Math.atan2(dx * 0.5, MAST_H) * 0.9, 0,
      ));
      scl.set(0.30, 0.30, MAST_H);
      m4.compose(pos, quat, scl);
      steelMesh.setMatrixAt(si++, m4);
    }
    for (let r = 0; r < 16; r++) {
      const z = 2 + r * (MAST_H - 4) / 16;
      const w = legSpread * (1 - z / MAST_H * 0.45);
      for (let k = 0; k < 3; k++) {
        const a = yaw + Math.PI * 0.25 + k * Math.PI * 0.5;
        pos.set(base.x + Math.cos(a + 0.785) * w * 0.5, base.y + Math.sin(a + 0.785) * w * 0.5, z);
        quat.setFromEuler(new THREE.Euler(0, (r % 2 ? 0.5 : -0.5), a + 0.785));
        scl.set(w * 1.45, 0.16, 0.16);
        m4.compose(pos, quat, scl);
        steelMesh.setMatrixAt(si++, m4);
      }
    }
  }
  steelMesh.count = si;
  steelMesh.castShadow = false;
  group.add(steelMesh);

  // --- lamp heads ----------------------------------------------------------
  const lampUniforms = Object.assign(env.uniforms(), {});
  const lampMat = new THREE.ShaderMaterial({
    uniforms: lampUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      ${ENV_UNIFORMS}
      attribute vec3 aCentre;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCentre;
      void main(){
        vUv = uv;
        vCentre = aCentre;
        // billboard each lamp so the glare always faces the camera
        vec3 toCam = normalize(uCamPos - aCentre);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam));
        vec3 up = cross(toCam, right);
        float s = 1.55 + 5.0*uNight;
        vec3 wp = aCentre + (right*(uv.x-0.5) + up*(uv.y-0.5))*s;
        vWorld = wp;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <common>
      ${ENV_UNIFORMS}
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCentre;
      void main(){
        float d = length(vUv - 0.5)*2.0;
        if (d > 1.0) discard;
        vec3 V = normalize(uCamPos - vCentre);
        vec3 aim = normalize(vec3(0.0,0.0,1.0) - vCentre);
        // a lamp is brightest when you are looking down its barrel
        float facing = clamp(dot(V, -aim)*0.5 + 0.55, 0.0, 1.0);
        float core = pow(max(1.0 - d, 0.0), 6.0);
        float glow = pow(max(1.0 - d, 0.0), 1.6);
        float lit = max(uNight, 0.25);
        vec3 col = uFloodColor*(core*120.0 + glow*7.0)*lit*facing;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const lampQuad = new THREE.PlaneGeometry(1, 1);
  const lampGeo = new THREE.InstancedBufferGeometry();
  lampGeo.index = lampQuad.index;
  lampGeo.attributes.position = lampQuad.attributes.position;
  lampGeo.attributes.uv = lampQuad.attributes.uv;
  const lampCols = 7, lampRows = 4;
  const lampCentres = [];
  const towers = [];
  for (const base of masts) {
    const headZ = MAST_H - 2.0;
    const yaw = Math.atan2(-base.y, -base.x);
    const right = new THREE.Vector3(-Math.sin(yaw), Math.cos(yaw), 0);
    for (let r = 0; r < lampRows; r++) {
      for (let c = 0; c < lampCols; c++) {
        const cx = (c - (lampCols - 1) / 2) * 1.5;
        const cz = headZ + (r - (lampRows - 1) / 2) * 1.25;
        lampCentres.push(
          base.x + right.x * cx + Math.cos(yaw) * 1.2,
          base.y + right.y * cx + Math.sin(yaw) * 1.2,
          cz,
        );
      }
    }
    towers.push(new THREE.Vector3(base.x, base.y, headZ));
  }
  lampGeo.setAttribute('aCentre', new THREE.InstancedBufferAttribute(new Float32Array(lampCentres), 3));
  lampGeo.instanceCount = lampCentres.length / 3;
  lampGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, MAST_H), 300);
  const lamps = new THREE.Mesh(lampGeo, lampMat);
  lamps.frustumCulled = false;
  lamps.renderOrder = 8;
  group.add(lamps);

  // --- light shafts --------------------------------------------------------
  // One cone per mast, additive, fading with the distance light has to travel
  // through the air. This is the "wet night air" look.
  const shaftGroup = new THREE.Group();
  if (opts.shafts !== false) {
    const shaftMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(env.uniforms(), { uShaft: { value: 1 } }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        ${ENV_UNIFORMS}
        varying vec3 vWorld;
        varying vec2 vLocal;
        varying vec3 vNormalW;
        void main(){
          vec4 wp = modelMatrix*vec4(position, 1.0);
          vWorld = wp.xyz;
          vLocal = vec2(uv.x, length(position.xy));
          vNormalW = normalize(mat3(modelMatrix)*normal);
          gl_Position = projectionMatrix*viewMatrix*wp;
        }
      `,
      fragmentShader: /* glsl */`
        #include <common>
        ${ENV_UNIFORMS}
        ${NOISE}
        uniform float uShaft;
        varying vec3 vWorld;
        varying vec2 vLocal;
        varying vec3 vNormalW;
        void main(){
          vec3 V = normalize(uCamPos - vWorld);
          vec3 N = normalize(vNormalW);
          // The cone stands in for a volume: a view ray through the middle of
          // the beam travels through the most lit air, a ray at the silhouette
          // through almost none. Without this the cone shows its hard edge.
          float thickness = pow(abs(dot(N, V)), 1.5);
          // dust: slowly drifting motes make the shaft breathe
          float dust = 0.55 + 0.45*fbm3(vWorld*0.09 + vec3(uWind*uTime*0.15, uTime*0.03), 3);
          float along = clamp(vLocal.x, 0.0, 1.0);
          float fade = (1.0 - along)*along*4.0;              // thin at both ends
          float ground = smoothstep(0.5, 9.0, vWorld.z);
          float a = uShaft*uNight*dust*fade*thickness*0.085*ground;
          a *= mix(0.45, 1.0, 1.0 - abs(dot(V, vec3(0.0,0.0,1.0))));
          gl_FragColor = vec4(uFloodColor*a*1.9, 1.0);
        }
      `,
    });
    for (const t of towers) {
      const target = new THREE.Vector3(t.x * 0.12, t.y * 0.12, 1.0);
      const dir = target.clone().sub(t);
      const len = dir.length();
      // narrow at the lamp, wide where it lands on the pitch
      const geo = new THREE.CylinderGeometry(34.0, 3.2, len, 20, 1, true);
      geo.translate(0, len * 0.5, 0);
      geo.rotateX(Math.PI / 2);          // local +z now runs lamp -> pitch
      // stash the normalised distance along the shaft in uv.x
      const pa = geo.getAttribute('position');
      const ua = geo.getAttribute('uv');
      for (let i = 0; i < pa.count; i++) ua.setX(i, pa.getZ(i) / len);
      ua.needsUpdate = true;
      const cone = new THREE.Mesh(geo, shaftMat);
      cone.position.copy(t);
      cone.lookAt(target);
      cone.renderOrder = 6;
      shaftGroup.add(cone);
    }
    group.add(shaftGroup);
  }

  return {
    group,
    towers,
    shafts: shaftGroup,
    attach(env2) { env2.setTowers(towers, env2.floodLevel); },
  };
}

// --- LED hoardings ---------------------------------------------------------
function makeAdTexture() {
  const W = 2048, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const ads = [
    { t: 'PITCH 26 ULTRA', s: '#0a1430', f: '#8fd8ff', a: 'PROCEDURAL FOOTBALL' },
    { t: 'AURORA MOTORS', s: '#13052a', f: '#ff7ad9', a: 'DRIVE THE NIGHT' },
    { t: 'NEOGRID ENERGY', s: '#04231a', f: '#7dffb2', a: '100% RENEWABLE' },
    { t: 'KUROGANE STEEL', s: '#2a0a0a', f: '#ffb86b', a: 'FORGED FOR THE GAME' },
    { t: 'HALCYON AIR', s: '#061a2e', f: '#ffffff', a: 'FLY WITH THE CHAMPIONS' },
    { t: 'SOLARIS BANK', s: '#2b1a00', f: '#ffd98a', a: 'OFFICIAL PARTNER' },
  ];
  const slice = W / ads.length;
  ads.forEach((ad, i) => {
    const x = i * slice;
    const grad = g.createLinearGradient(x, 0, x + slice, H);
    grad.addColorStop(0, ad.s);
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(x, 0, slice, H);
    g.fillStyle = ad.f;
    g.font = `900 ${Math.round(H * 0.46)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ad.t, x + slice / 2, H * 0.40);
    g.font = `600 ${Math.round(H * 0.17)}px system-ui, sans-serif`;
    g.globalAlpha = 0.85;
    g.fillText(ad.a, x + slice / 2, H * 0.74);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 3;
    g.strokeRect(x + 6, 6, slice - 12, H - 12);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}

export function createLedBoards(env) {
  // A ring of panels just outside the run-off, angled slightly up at the
  // camera the way real hoardings are.
  const X = PITCH.halfL + PITCH.runOffX - 1.2;
  const Y = PITCH.halfW + PITCH.runOffY - 2.2;
  const h = 0.95;
  const segs = [];
  const panel = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / 3.0));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      segs.push({
        a: [x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0],
        b: [x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1],
        u0: t0 * len / 14, u1: t1 * len / 14,
      });
    }
  };
  // Each run is wound so that its text reads left-to-right for a viewer
  // standing in the middle of the pitch looking at it.
  panel(X, -Y, -X, -Y);
  panel(-X, Y, X, Y);
  panel(X, Y, X, -Y);
  panel(-X, -Y, -X, Y);

  const pos = [], uv = [], nrm = [], idx = [];
  let v = 0;
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
    const l = Math.hypot(dx, dy) || 1;
    // inward normal
    const nx = -dy / l * Math.sign(1), ny = dx / l;
    const inward = (s.a[0] * nx + s.a[1] * ny) > 0 ? -1 : 1;
    const tiltBack = 0.17;
    pos.push(s.a[0], s.a[1], 0.02, s.b[0], s.b[1], 0.02,
      s.a[0] - nx * inward * tiltBack, s.a[1] - ny * inward * tiltBack, h,
      s.b[0] - nx * inward * tiltBack, s.b[1] - ny * inward * tiltBack, h);
    for (let i = 0; i < 4; i++) nrm.push(nx * inward, ny * inward, 0.26);
    uv.push(s.u0, 0, s.u1, 0, s.u0, 1, s.u1, 1);
    idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    v += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();

  const tex = makeAdTexture();
  const uniforms = litUniforms(env.uniforms(), {
    uAd: { value: tex },
    uScroll: { value: 0 },
    uGoal: { value: 0 },
  });
  const mat = new THREE.ShaderMaterial({
    uniforms,
    lights: true,
    side: THREE.DoubleSide,
    vertexShader: litVertex() + /* glsl */`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${SHADOW_VERT}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,
    fragmentShader: litFragment(/* glsl */`
      uniform sampler2D uAd;
      uniform float uScroll;
      uniform float uGoal;
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `) + /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        vec2 auv = vec2(vUv.x*0.33 + uScroll, 1.0 - vUv.y);
        vec3 led = texture2D(uAd, auv).rgb;
        led = pow(led, vec3(2.2));                 // to linear
        // pixel structure: the panels are 8 mm pitch, visible on a close shot
        float px = sin(vUv.x*2400.0)*0.5+0.5;
        float py = sin(vUv.y*120.0)*0.5+0.5;
        float grid = mix(0.72, 1.0, px*py);
        // goal flash: the boards go white and strobe
        float flash = uGoal*(0.5 + 0.5*sin(uTime*26.0));
        vec3 emis = (led*grid*5.2 + vec3(flash)*7.0)*(0.55 + 0.95*uNight);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = led*0.1;
        s.rough = 0.22; s.metal = 0.0; s.ao = 0.9; s.spec = 1.6;
        vec3 col = emis;
        col += directLight(s, uSunDir, uSunColor)*getShadowMask()*0.5;
        col += ambientLight(s)*0.5;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'hoardings';
  return {
    mesh,
    update(dt, goalFlash) {
      uniforms.uScroll.value = (uniforms.uScroll.value + dt * 0.035) % 1;
      uniforms.uGoal.value = goalFlash;
    },
  };
}

// ---------------------------------------------------------------------------
// goal.js : posts, crossbar and a net that is actually simulated.
//
// Each net is a Verlet cloth pinned to the frame and to the ground. The ball
// pushes nodes along its own velocity, so a shot does not "play a net
// animation" -- it punches a bulge whose ripple then travels along the cords
// and settles. The cords themselves are drawn analytically: a crisp,
// screen-space-antialiased grid whose coverage saturates with distance, which
// is exactly how a real net reads on camera.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { PITCH, BALL } from '../core/config.js';
import { litFragment, litVertex, SHADOW_VERT, litUniforms } from './shaderlib.js';

const GW = PITCH.goalHalf;        // 3.66
const GH = PITCH.goalHeight;      // 2.44
const GD = PITCH.goalDepth;       // 2.0
const POST_R = 0.060;

// --- net cloth -------------------------------------------------------------
class NetCloth {
  /**
   * The net is one unrolled sheet: u runs side -> back -> side, v runs from
   * the ground up to the crossbar. A separate roof sheet closes the top.
   */
  constructor(side, res = 1) {
    this.side = side;                       // +1 = goal at +x
    this.NU = Math.max(14, Math.round(34 * res));
    this.NV = Math.max(6, Math.round(12 * res));
    this.RU = Math.max(14, Math.round(34 * res));
    this.RV = Math.max(4, Math.round(8 * res));
    const n = this.NU * this.NV + this.RU * this.RV;
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.prev = new Float32Array(n * 3);
    this.rest = new Float32Array(n * 3);
    this.pin = new Uint8Array(n);
    this.springs = [];
    this.build();
  }

  idx(u, v) { return v * this.NU + u; }
  ridx(u, v) { return this.NU * this.NV + v * this.RU + u; }

  /** Unrolled u -> 3D point on the back/side walls of the goal. */
  wall(u, v) {
    const x0 = this.side * PITCH.halfL;
    const total = GD + 2 * GW + GD;
    const d = u * total;
    const z = v * GH;
    if (d < GD) {                           // right side panel
      return [x0 + this.side * d, -GW, z];
    } else if (d < GD + 2 * GW) {           // back panel
      return [x0 + this.side * GD, -GW + (d - GD), z];
    }
    return [x0 + this.side * (total - d), GW, z];   // left side panel
  }

  build() {
    const { NU, NV, RU, RV } = this;
    for (let v = 0; v < NV; v++) {
      for (let u = 0; u < NU; u++) {
        const i = this.idx(u, v);
        const p = this.wall(u / (NU - 1), v / (NV - 1));
        this.set(i, p);
        // pinned: both side edges (posts), the top (crossbar line) and the
        // ground line, which is pegged down
        this.pin[i] = (u === 0 || u === NU - 1 || v === 0 || v === NV - 1) ? 1 : 0;
      }
    }
    // roof sheet: u across the same footprint, v from the crossbar backward
    for (let v = 0; v < RV; v++) {
      for (let u = 0; u < RU; u++) {
        const i = this.ridx(u, v);
        const t = u / (RU - 1);
        const back = this.wall(t, 1);
        const front = [this.side * PITCH.halfL, THREE.MathUtils.clamp(back[1], -GW, GW), GH];
        const f = v / (RV - 1);
        const p = [
          THREE.MathUtils.lerp(front[0], back[0], f),
          THREE.MathUtils.lerp(front[1], back[1], f),
          GH - 0.02 * f,
        ];
        this.set(i, p);
        this.pin[i] = (v === 0 || u === 0 || u === RU - 1 || v === RV - 1) ? 1 : 0;
      }
    }
    // springs: structural + shear, on both sheets
    const link = (a, b) => {
      const dx = this.pos[a * 3] - this.pos[b * 3];
      const dy = this.pos[a * 3 + 1] - this.pos[b * 3 + 1];
      const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2];
      this.springs.push(a, b, Math.hypot(dx, dy, dz));
    };
    for (let v = 0; v < NV; v++) {
      for (let u = 0; u < NU; u++) {
        if (u + 1 < NU) link(this.idx(u, v), this.idx(u + 1, v));
        if (v + 1 < NV) link(this.idx(u, v), this.idx(u, v + 1));
        if (u + 1 < NU && v + 1 < NV) link(this.idx(u, v), this.idx(u + 1, v + 1));
      }
    }
    for (let v = 0; v < RV; v++) {
      for (let u = 0; u < RU; u++) {
        if (u + 1 < RU) link(this.ridx(u, v), this.ridx(u + 1, v));
        if (v + 1 < RV) link(this.ridx(u, v), this.ridx(u, v + 1));
      }
    }
    this.springArr = new Float32Array(this.springs);
    this.springs = null;
  }

  set(i, p) {
    this.pos[i * 3] = p[0]; this.pos[i * 3 + 1] = p[1]; this.pos[i * 3 + 2] = p[2];
    this.prev[i * 3] = p[0]; this.prev[i * 3 + 1] = p[1]; this.prev[i * 3 + 2] = p[2];
    this.rest[i * 3] = p[0]; this.rest[i * 3 + 1] = p[1]; this.rest[i * 3 + 2] = p[2];
  }

  /** One Verlet step with gravity, drag, spring relaxation and a shape pull. */
  step(dt, ball, wind) {
    const { pos, prev, rest, pin, n } = this;
    const g = -9.81 * dt * dt * 0.35;
    const drag = 0.986;
    const wx = wind.x * dt * dt * 0.25, wy = wind.y * dt * dt * 0.25;
    for (let i = 0; i < n; i++) {
      if (pin[i]) continue;
      const k = i * 3;
      for (let c = 0; c < 3; c++) {
        const cur = pos[k + c];
        let v = (cur - prev[k + c]) * drag;
        // nets are strung: they always want to return to their rest shape
        v += (rest[k + c] - cur) * 0.055;
        if (c === 2) v += g;
        else v += c === 0 ? wx : wy;
        prev[k + c] = cur;
        pos[k + c] = cur + v;
      }
    }
    // ball interaction: push the cords along the ball's travel
    if (ball) {
      const bx = ball.x, by = ball.y, bz = ball.z;
      const R = BALL.r + 0.10;
      const sp = Math.hypot(ball.vx, ball.vy, ball.vz);
      for (let i = 0; i < n; i++) {
        if (pin[i]) continue;
        const k = i * 3;
        const dx = pos[k] - bx, dy = pos[k + 1] - by, dz = pos[k + 2] - bz;
        const d = Math.hypot(dx, dy, dz);
        if (d < R) {
          const push = (R - d);
          const inv = 1 / Math.max(d, 1e-4);
          pos[k] += dx * inv * push;
          pos[k + 1] += dy * inv * push;
          pos[k + 2] += dz * inv * push;
          // and carry some of its momentum
          const f = Math.min(sp, 36) * 0.0012;
          pos[k] += ball.vx * f;
          pos[k + 1] += ball.vy * f;
          pos[k + 2] += ball.vz * f;
        }
      }
    }
    // spring relaxation
    const S = this.springArr;
    const iters = 3;
    for (let it = 0; it < iters; it++) {
      for (let s = 0; s < S.length; s += 3) {
        const a = S[s] * 3, b = S[s + 1] * 3, len = S[s + 2];
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.hypot(dx, dy, dz) || 1e-5;
        // cords stretch a little but never compress into themselves
        const diff = (d - len) / d * 0.5;
        const pa = pin[S[s]], pb = pin[S[s + 1]];
        if (pa && pb) continue;
        const wa = pa ? 0 : (pb ? 1 : 0.5);
        const wb = pb ? 0 : (pa ? 1 : 0.5);
        pos[a] += dx * diff * wa * 2 * 0.5;
        pos[a + 1] += dy * diff * wa * 2 * 0.5;
        pos[a + 2] += dz * diff * wa * 2 * 0.5;
        pos[b] -= dx * diff * wb * 2 * 0.5;
        pos[b + 1] -= dy * diff * wb * 2 * 0.5;
        pos[b + 2] -= dz * diff * wb * 2 * 0.5;
      }
    }
  }

  /** Triangle indices + a uv layout in metres, so the cord grid is uniform. */
  makeGeometry() {
    const { NU, NV, RU, RV } = this;
    const idx = [];
    const uv = new Float32Array(this.n * 2);
    const total = GD + 2 * GW + GD;
    for (let v = 0; v < NV; v++) {
      for (let u = 0; u < NU; u++) {
        const i = this.idx(u, v);
        uv[i * 2] = (u / (NU - 1)) * total;
        uv[i * 2 + 1] = (v / (NV - 1)) * GH;
        if (u + 1 < NU && v + 1 < NV) {
          const a = i, b = this.idx(u + 1, v), c = this.idx(u, v + 1), d = this.idx(u + 1, v + 1);
          idx.push(a, b, c, b, d, c);
        }
      }
    }
    for (let v = 0; v < RV; v++) {
      for (let u = 0; u < RU; u++) {
        const i = this.ridx(u, v);
        uv[i * 2] = (u / (RU - 1)) * total;
        uv[i * 2 + 1] = GH + (v / (RV - 1)) * GD;
        if (u + 1 < RU && v + 1 < RV) {
          const a = i, b = this.ridx(u + 1, v), c = this.ridx(u, v + 1), d = this.ridx(u + 1, v + 1);
          idx.push(a, b, c, b, d, c);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(this.side * (PITCH.halfL + GD * 0.5), 0, GH * 0.5), 8);
    return g;
  }
}

export function createGoals(env, opts = {}) {
  const group = new THREE.Group();
  group.name = 'goals';
  const res = opts.tier >= 2 ? 1.0 : 0.62;

  // --- frame ---------------------------------------------------------------
  const frameMat = new THREE.ShaderMaterial({
    uniforms: litUniforms(env.uniforms()),
    lights: true,
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
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `) + /* glsl */`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        // powder-coated aluminium: scuffed near the ground, chalky up high
        float scuff = fbm(vec2(vUv.x*22.0, P.z*7.0), 3);
        float low = smoothstep(1.2, 0.0, P.z);
        vec3 alb = mix(vec3(0.78, 0.785, 0.79), vec3(0.52, 0.53, 0.55), scuff*0.35*low);
        vec3 Nw = normalize(N + vec3(fbmS(vec2(vUv.x*40.0, P.z*20.0), 2))*0.03);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = 0.26 + scuff*0.14; s.metal = 0.08; s.ao = 1.0; s.spec = 1.4;
        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.40 + 0.60*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  // --- net -----------------------------------------------------------------
  const netMat = new THREE.ShaderMaterial({
    uniforms: litUniforms(env.uniforms()),
    lights: true,
    transparent: true,
    depthWrite: false,
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
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `) + /* glsl */`
      void main(){
        // cord grid, 10 cm mesh, 2.2 mm cord, antialiased by screen footprint
        // Box-filtered cord grid: crisp when magnified, converging on the
        // true area coverage when a cell drops below a pixel. Without the
        // second half a net turns into a flickering white sheet at distance.
        const float MESH = 0.105;             // 10.5 cm mesh
        const float CORD = 0.023;             // cord half-width, in cells
        vec2 g = vUv/MESH;
        vec2 d = abs(fract(g) - 0.5);
        vec2 fw = fwidth(g) + 1e-5;
        vec2 sharp = clamp((CORD - d)/fw + 0.5, 0.0, 1.0);
        vec2 avg = vec2(min(1.0, 2.0*CORD));
        vec2 cov = mix(sharp, avg, clamp(fw*1.6, 0.0, 1.0));
        float a = 1.0 - (1.0 - cov.x)*(1.0 - cov.y);
        if (a < 0.006) discard;

        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(uCamPos - P);
        if (dot(N, V) < 0.0) N = -N;
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = vec3(0.80, 0.82, 0.84);
        s.rough = 0.55; s.metal = 0.0; s.ao = 0.9; s.spec = 1.0;
        float shadow = getShadowMask();
        // cords are thin: light wraps right around them
        float NoL = dot(N, uSunDir);
        vec3 col = s.albedo*RECIPROCAL_PI*wrapDiffuse(NoL, 0.8)*uSunColor*shadow*1.6;
        col += ambientLight(s)*1.2;
        col += floodLights(s)*mix(0.6, 1.0, shadow)*1.3;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const nets = [];
  const postGeo = new THREE.CylinderGeometry(POST_R, POST_R, 1, 12, 1, false);
  postGeo.rotateX(Math.PI / 2);                 // along +z
  postGeo.translate(0, 0, 0.5);

  for (const side of [1, -1]) {
    const x = side * PITCH.halfL;
    // uprights
    for (const sy of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(x, sy * GW, 0);
      post.scale.set(1, 1, GH);
      post.castShadow = true;
      group.add(post);
      // back stanchions
      const stay = new THREE.Mesh(postGeo, frameMat);
      stay.position.set(x + side * GD, sy * GW, 0);
      stay.scale.set(0.7, 0.7, GH * 0.92);
      stay.castShadow = true;
      group.add(stay);
    }
    // crossbar
    const bar = new THREE.Mesh(postGeo, frameMat);
    bar.position.set(x, -GW, GH);
    bar.scale.set(1, 1, GW * 2);
    bar.rotation.x = -Math.PI / 2;        // local +z -> world +y
    bar.castShadow = true;
    group.add(bar);
    // back bar
    const back = new THREE.Mesh(postGeo, frameMat);
    back.position.set(x + side * GD, -GW, GH * 0.92);
    back.scale.set(0.7, 0.7, GW * 2);
    back.rotation.x = -Math.PI / 2;
    group.add(back);
    // top rails from crossbar to back bar
    for (const sy of [-1, 1]) {
      const rail = new THREE.Mesh(postGeo, frameMat);
      rail.position.set(x, sy * GW, GH);
      rail.scale.set(0.6, 0.6, GD);
      rail.rotation.y = side * Math.PI / 2;
      group.add(rail);
    }

    const cloth = new NetCloth(side, res);
    const geo = cloth.makeGeometry();
    const mesh = new THREE.Mesh(geo, netMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.name = `net${side > 0 ? 'A' : 'B'}`;
    group.add(mesh);
    nets.push({ cloth, geo, mesh });
  }

  const wind = new THREE.Vector2();
  let acc = 0;
  let idleTick = 0;
  for (const n of nets) n.live = 1.5;        // settle on the first seconds
  return {
    group,
    nets,
    /**
     * Fixed-step the cloth so it behaves identically at any frame rate, and
     * only for a net that has something to do -- a still net is most of the
     * match, and re-normalling 700 vertices for nothing is not free.
     */
    update(dt, ball, windVec) {
      wind.copy(windVec);
      acc = Math.min(acc + dt, 0.1);
      const h = 1 / 90;
      let steps = 0;
      const nearSide = ball && Math.abs(ball.x) > PITCH.halfL - 4.5 ? Math.sign(ball.x) : 0;
      for (const n of nets) {
        if (nearSide === n.cloth.side) n.live = 2.2;
        else n.live = Math.max(0, n.live - dt);
      }
      idleTick = (idleTick + 1) % 6;
      const idle = idleTick === 0;             // a slow breath of wind
      while (acc >= h && steps < 4) {
        for (const n of nets) {
          if (n.live <= 0 && !idle) continue;
          n.cloth.step(h, nearSide === n.cloth.side ? ball : null, wind);
        }
        acc -= h; steps++;
      }
      if (steps) {
        for (const n of nets) {
          if (n.live <= 0 && !idle) continue;
          n.geo.getAttribute('position').needsUpdate = true;
          n.geo.computeVertexNormals();
        }
      }
    },
  };
}

// Enemy bodies: procedural animation while alive, Verlet ragdoll when knocked down or dead,
// and dismemberment by splitting a joint into two points.
import * as THREE from '../lib/three.module.min.js';

export const J = { head: 0, neck: 1, pelvis: 2, lSh: 3, lEl: 4, lHa: 5, rSh: 6, rEl: 7, rHa: 8, lHip: 9, lKn: 10, lFt: 11, rHip: 12, rKn: 13, rFt: 14, grip: 15, tip: 16 };

const BONES = [
  // a, b, radius, part, kind
  [1, 0, 0.13, 'head', 'head'],
  [1, 2, 0.16, 'torso', 'torso'],
  [3, 6, 0.075, 'torso', 'limb'],
  [9, 12, 0.09, 'torso', 'limb'],
  [3, 4, 0.06, 'armL', 'limb'], [4, 5, 0.05, 'armL', 'limb'],
  [6, 7, 0.06, 'armR', 'limb'], [7, 8, 0.05, 'armR', 'limb'],
  [9, 10, 0.075, 'legL', 'limb'], [10, 11, 0.06, 'legL', 'limb'],
  [12, 13, 0.075, 'legR', 'limb'], [13, 14, 0.06, 'legR', 'limb'],
  [15, 16, 0.02, 'weapon', 'weapon'],
];
// extra stiffening constraints for the ragdoll
const BRACES = [
  [1, 3, 'torso'], [1, 6, 'torso'], [2, 9, 'torso'], [2, 12, 'torso'], [3, 2, 'torso'], [6, 2, 'torso'],
  [3, 12, 'torso'], [6, 9, 'torso'], [1, 9, 'torso'], [1, 12, 'torso'],
  [0, 3, 'head'], [0, 6, 'head'],
];
const SEVER = { head: { joint: 1, set: [0] }, armL: { joint: 3, set: [4, 5] }, armR: { joint: 6, set: [7, 8] }, legL: { joint: 9, set: [10, 11] }, legR: { joint: 12, set: [13, 14] } };
const RADIUS = [0.13, 0.08, 0.1, 0.07, 0.05, 0.05, 0.07, 0.05, 0.05, 0.08, 0.06, 0.05, 0.08, 0.06, 0.05, 0.03, 0.03];

export const TYPES = {
  sword: { name: '剣兵', hp: 60, scale: 1.0, speed: 1.6, weaponLen: 0.85, style: 'slash', reach: 1.25, color: 0x8a8f99, trim: 0x7a2a22, windup: 0.55, strike: 0.22, dmg: 12 },
  axe: { name: '斧兵', hp: 110, scale: 1.12, speed: 1.15, weaponLen: 0.8, style: 'overhead', reach: 1.25, color: 0x5d544a, trim: 0x3c4f2a, windup: 0.8, strike: 0.25, dmg: 20 },
  spear: { name: '槍兵', hp: 50, scale: 0.98, speed: 1.8, weaponLen: 1.6, style: 'stab', reach: 1.9, color: 0x9b8a6a, trim: 0x23466e, windup: 0.5, strike: 0.18, dmg: 11 },
};

const geoCache = new Map();
function capsule(r, len) {
  const k = r.toFixed(3) + ':' + len.toFixed(2);
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CapsuleGeometry(r, len, 3, 8));
  return geoCache.get(k);
}
const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
const smooth = (t) => t * t * (3 - 2 * t);
const lerp3 = (out, a, b, t) => out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

const POSES = {
  slash: { guardH: [0.22, 1.15, 0.35], guardD: [0.15, 0.85, 0.5], windH: [0.42, 1.62, -0.05], windD: [0.55, 0.55, -0.6], hitH: [-0.25, 1.05, 0.62], hitD: [-0.75, -0.2, 0.65] },
  overhead: { guardH: [0.2, 1.1, 0.3], guardD: [0.1, 0.9, 0.35], windH: [0.12, 1.88, -0.08], windD: [0.05, 0.3, -1], hitH: [0.04, 1.0, 0.65], hitD: [0, -0.5, 0.87] },
  stab: { guardH: [0.22, 1.1, 0.2], guardD: [0, 0.12, 1], windH: [0.26, 1.2, -0.2], windD: [0, 0.08, 1], hitH: [0.1, 1.3, 0.8], hitD: [0, 0.02, 1] },
};

export class Body {
  constructor(scene, typeKey) {
    this.type = TYPES[typeKey];
    this.typeKey = typeKey;
    this.scene = scene;
    this.points = RADIUS.map((r) => ({ p: new THREE.Vector3(), prev: new THREE.Vector3(), r }));
    this.cons = [];
    this.ragdoll = false;
    this.lastDt = 1 / 60;
    this.group = new THREE.Group();
    scene.add(this.group);
    const T = this.type;
    this.matArmor = new THREE.MeshStandardMaterial({ color: T.color, roughness: 0.5, metalness: 0.3 });
    this.matCloth = new THREE.MeshStandardMaterial({ color: T.trim, roughness: 0.9 });
    this.matSkin = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.7, metalness: 0.2 });
    this.bones = BONES.map(([a, b, r, part, kind]) => {
      const rr = r * T.scale;
      let mesh;
      if (kind === 'weapon') mesh = this.makeWeapon();
      else if (kind === 'head') {
        mesh = new THREE.Group();
        const helm = new THREE.Mesh(new THREE.SphereGeometry(rr, 14, 10), this.matArmor);
                const visor = new THREE.Mesh(new THREE.BoxGeometry(rr * 1.3, rr * 0.18, rr * 0.5), new THREE.MeshBasicMaterial({ color: 0xff5522 }));
        visor.position.set(0, 0, rr * 0.82);
        mesh.add(helm, visor);
        this.visor = visor;
      } else {
        const mat = part === 'torso' && a === 1 ? this.matCloth : part.startsWith('leg') ? this.matSkin : this.matArmor;
        mesh = new THREE.Mesh(capsule(rr, 0.3), mat);
      }
      mesh.castShadow = false;
      this.group.add(mesh);
      return { a, b, r: rr, part, kind, mesh, alive: true };
    });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
    this.severed = new Set();
    this.weaponAttached = true;
  }

  makeWeapon() {
    const T = this.type, g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xcfd5dc, metalness: 0.35, roughness: 0.3, emissive: 0x1a1c20 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.8 });
    const L = T.weaponLen;
    if (T.style === 'slash') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, L * 0.8, 0.012), steel); blade.position.y = L * 0.6;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.04), wood); guard.position.y = L * 0.2;
      g.add(blade, guard);
    } else if (T.style === 'overhead') {
      const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L, 6), wood); haft.position.y = L * 0.5;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.025), steel); head.position.set(0.1, L * 0.9, 0);
      g.add(haft, head);
    } else {
      const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L, 6), wood); haft.position.y = L * 0.45;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 4), steel); head.position.y = L * 0.95;
      g.add(haft, head);
    }
    return g;
  }

  // Compute the animated pose for an alive enemy. e: {pos, yaw, phase, move, state, t, lean, guardUp}
  pose(e) {
    const T = this.type, s = T.scale, P = POSES[T.style];
    const sy = Math.sin(e.yaw), cy = Math.cos(e.yaw);
    const out = this.points;
    const bob = Math.abs(Math.sin(e.phase)) * 0.035 * e.move;
    const put = (i, x, y, z) => {
      if (y > 0.95) z += (y - 0.95) * e.lean;
      const X = x * s, Y = (y + bob) * s, Z = z * s;
      out[i].p.set(e.pos.x + X * cy + Z * sy, Y, e.pos.z - X * sy + Z * cy);
    };
    // legs
    for (const [side, off, hip, kn, ft] of [[-1, 0, 9, 10, 11], [1, Math.PI, 12, 13, 14]]) {
      const ph = e.phase + off;
      const a = Math.sin(ph) * 0.55 * e.move + (1 - e.move) * side * -0.12;
      const bend = Math.max(0, -Math.sin(ph + 0.6)) * 0.9 * e.move + 0.12;
      const hx = side * 0.1, hy = 0.92, hz = 0;
      const kx = hx + side * 0.04 * (1 - e.move), ky = hy - 0.45 * Math.cos(a), kz = hz + 0.45 * Math.sin(a);
      const sa = a - bend;
      put(hip, hx, hy, hz);
      put(kn, kx, ky, kz);
      put(ft, kx + side * 0.03 * (1 - e.move), Math.max(0.05, ky - 0.45 * Math.cos(sa)), kz + 0.45 * Math.sin(sa));
    }
    put(2, 0, 0.95, 0);
    put(1, 0, 1.45, 0);
    put(0, 0, 1.66, 0.02);
    put(3, -0.2, 1.42, 0);
    put(6, 0.2, 1.42, 0);
    // left arm (shield-less guard)
    const sw = Math.sin(e.phase) * 0.2 * e.move;
    if (e.state === 'stagger' || e.state === 'grabbed') { put(5, -0.3, 1.0, 0.25); put(4, -0.3, 1.18, 0.05); }
    else { put(4, -0.28, 1.17, 0.02 - sw); put(5, -0.22, 1.02, 0.28 - sw); }
    // right arm + weapon
    let H = tmpA, D = tmpB;
    const st = e.state, t = e.t;
    if (st === 'windup') { lerp3(H, P.guardH, P.windH, smooth(t)); lerp3(D, P.guardD, P.windD, smooth(t)); }
    else if (st === 'strike') { lerp3(H, P.windH, P.hitH, smooth(t)); lerp3(D, P.windD, P.hitD, smooth(t)); }
    else if (st === 'recover') { lerp3(H, P.hitH, P.guardH, smooth(t)); lerp3(D, P.hitD, P.guardD, smooth(t)); }
    else if (st === 'stagger') { H.set(0.35, 1.25, -0.05); D.set(0.6, 0.7, -0.2); }
    else { lerp3(H, P.guardH, P.guardH, 0); lerp3(D, P.guardD, P.guardD, 0); H.y += Math.sin(e.phase * 0.5) * 0.02; }
    D.normalize();
    put(8, H.x, H.y, H.z);
    // elbow between shoulder and hand, pushed out and down
    put(7, (0.2 + H.x) / 2 + 0.1, (1.42 + H.y) / 2 - 0.1, H.z / 2 - 0.08);
    // weapon in world space
    const wx = D.x * cy + D.z * sy, wz = -D.x * sy + D.z * cy;
    out[15].p.copy(out[8].p);
    out[16].p.set(out[8].p.x + wx * T.weaponLen * s, out[8].p.y + D.y * T.weaponLen * s, out[8].p.z + wz * T.weaponLen * s);
  }

  // Kinematic update: keep prev so the motion becomes ragdoll velocity on death.
  setFromPose(e, dt) {
    for (const pt of this.points) pt.prev.copy(pt.p);
    this.pose(e);
    if (this._fresh) { for (const pt of this.points) pt.prev.copy(pt.p); this._fresh = false; }
    this.lastDt = dt;
  }

  // blend from current ragdoll configuration to the animated pose (getting up)
  blendToPose(e, k, snap) {
    this.pose(e);
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      pt.p.lerpVectors(snap[i], pt.p, smooth(k));
      pt.prev.copy(pt.p);
    }
  }

  snapshot() { return this.points.map((pt) => pt.p.clone()); }

  toRagdoll(dropWeapon) {
    if (!this.ragdoll) {
      this.ragdoll = true;
      this.cons = [];
      const add = (a, b, part) => this.cons.push({ a, b, part, len: this.points[a].p.distanceTo(this.points[b].p) });
      for (const bn of this.bones) if (bn.kind !== 'weapon') add(bn.a, bn.b, bn.part);
      for (const [a, b, part] of BRACES) add(a, b, part);
      add(15, 16, 'weapon');
      this.gripCon = { a: 8, b: 15, part: 'grip', len: 0 };
      this.cons.push(this.gripCon);
      // re-apply previous severs
      const sev = [...this.severed]; this.severed.clear();
      for (const p of sev) this.sever(p, true);
    }
    if (dropWeapon && this.weaponAttached) {
      this.weaponAttached = false;
      this.cons = this.cons.filter((c) => c !== this.gripCon);
    }
  }

  // Back to animated mode (only for bodies that are not dismembered).
  fromRagdoll() { this.ragdoll = false; this.cons = []; }

  addVel(i, v, dt = this.lastDt) { this.points[i].prev.addScaledVector(v, -dt); }
  addVelAll(v, dt = this.lastDt, exceptWeapon = false) {
    for (let i = 0; i < this.points.length; i++) if (!(exceptWeapon && (i === 15 || i === 16))) this.points[i].prev.addScaledVector(v, -dt);
  }
  velOf(i, out) { return out.copy(this.points[i].p).sub(this.points[i].prev).divideScalar(Math.max(this.lastDt, 1e-4)); }

  sever(part, silent) {
    const S = SEVER[part];
    if (!S || this.severed.has(part)) return null;
    this.severed.add(part);
    if (!this.ragdoll) return null; // applied when the ragdoll is built
    const src = this.points[S.joint];
    const ni = this.points.length;
    this.points.push({ p: src.p.clone(), prev: src.prev.clone(), r: 0.06 });
    const inSet = (i) => S.set.includes(i);
    this.cons = this.cons.filter((c) => {
      if (c.part !== part) return true;
      if (c.a === S.joint) c.a = ni; if (c.b === S.joint) c.b = ni;
      const ok = (i) => i === ni || inSet(i);
      return ok(c.a) && ok(c.b);
    });
    for (const bn of this.bones) if (bn.part === part) { if (bn.a === S.joint) bn.a = ni; if (bn.b === S.joint) bn.b = ni; }
    if (part === 'armR' && this.weaponAttached) { /* the weapon stays in the severed hand */ }
    if (!silent && this.visor && part === 'head') this.visor.material.color.set(0x331100);
    return { stumpA: S.joint, stumpB: ni };
  }

  step(dt, arenaR) {
    if (!this.ragdoll) return;
    const g = -9.8;
    const k = dt / this.lastDt;
    for (const pt of this.points) {
      const vx = (pt.p.x - pt.prev.x) * 0.995 * k, vy = (pt.p.y - pt.prev.y) * 0.995 * k, vz = (pt.p.z - pt.prev.z) * 0.995 * k;
      pt.prev.copy(pt.p);
      pt.p.x += vx; pt.p.y += vy + g * dt * dt; pt.p.z += vz;
    }
    this.lastDt = dt;
    for (let it = 0; it < 8; it++) {
      for (const c of this.cons) {
        const a = this.points[c.a].p, b = this.points[c.b].p;
        tmpA.subVectors(b, a);
        const d = tmpA.length() || 1e-6;
        const diff = (d - c.len) / d * 0.5;
        a.addScaledVector(tmpA, diff); b.addScaledVector(tmpA, -diff);
      }
      for (const pt of this.points) {
        if (pt.p.y < pt.r) {
          pt.p.y = pt.r;
          // friction
          pt.prev.x += (pt.p.x - pt.prev.x) * 0.25;
          pt.prev.z += (pt.p.z - pt.prev.z) * 0.25;
        }
        const rr = Math.hypot(pt.p.x, pt.p.z);
        if (rr > arenaR - pt.r) { const f = (arenaR - pt.r) / rr; pt.p.x *= f; pt.p.z *= f; }
      }
    }
  }

  speed() { // average point speed
    let s = 0;
    for (const pt of this.points) s += pt.p.distanceTo(pt.prev);
    return s / this.points.length / Math.max(this.lastDt, 1e-4);
  }

  center(out) { return out.copy(this.points[2].p).add(this.points[1].p).multiplyScalar(0.5); }

  sync() {
    const P = this.points;
    for (const bn of this.bones) {
      const a = P[bn.a].p, b = P[bn.b].p;
      if (bn.kind === 'weapon') {
        tmpC.subVectors(b, a); const len = tmpC.length() || 1e-6;
        bn.mesh.position.copy(a);
        bn.mesh.quaternion.setFromUnitVectors(UP, tmpC.divideScalar(len));
        bn.mesh.scale.setScalar(len / (this.type.weaponLen * this.type.scale));
        continue;
      }
      if (bn.kind === 'head') {
        tmpC.subVectors(b, a).normalize();
        bn.mesh.position.copy(b);
        // face along the torso's forward (cross of shoulder line and up)
        const fwd = tmpB.subVectors(P[6].p, P[3].p).cross(tmpC).normalize();
        if (this.severed.has('head')) fwd.set(0, 0, 1);
        const m = new THREE.Matrix4().makeBasis(tmpA.crossVectors(tmpC, fwd).normalize(), tmpC, fwd);
        bn.mesh.quaternion.setFromRotationMatrix(m);
        continue;
      }
      tmpC.subVectors(b, a);
      const len = tmpC.length() || 1e-6;
      bn.mesh.position.addVectors(a, b).multiplyScalar(0.5);
      bn.mesh.quaternion.setFromUnitVectors(UP, tmpC.divideScalar(len));
      bn.mesh.scale.set(1, Math.max(0.15, len / 0.3), 1);
    }
    this.shadow.position.set(P[2].p.x, 0.012, P[2].p.z);
    const h = P[2].p.y;
    this.shadow.material.opacity = THREE.MathUtils.clamp(0.4 - h * 0.1, 0.1, 0.4);
  }

  // distance from point q to body; returns {d, bone} for the nearest bone surface
  nearest(q) {
    let best = null, bd = Infinity;
    for (const bn of this.bones) {
      if (bn.kind === 'weapon') continue;
      const d = segDist(q, this.points[bn.a].p, this.points[bn.b].p) - bn.r - (bn.kind === 'head' ? 0.03 : 0);
      if (d < bd) { bd = d; best = bn; }
    }
    return { d: bd, bone: best };
  }

  dispose() {
    this.scene.remove(this.group); this.scene.remove(this.shadow);
    this.group.traverse((o) => { if (o.geometry && !o.geometry.parameters?.length) o.geometry.dispose?.(); });
  }
}

export function segDist(q, a, b) {
  tmpA.subVectors(b, a);
  const l2 = tmpA.lengthSq();
  let t = l2 > 0 ? tmpB.subVectors(q, a).dot(tmpA) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return tmpC.copy(a).addScaledVector(tmpA, t).distanceTo(q);
}

// closest distance between two segments (p1-q1, p2-q2)
export function segSegDist(p1, q1, p2, q2, outPoint) {
  const d1 = new THREE.Vector3().subVectors(q1, p1), d2 = new THREE.Vector3().subVectors(q2, p2), r = new THREE.Vector3().subVectors(p1, p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a <= 1e-8 && e <= 1e-8) { s = t = 0; }
  else if (a <= 1e-8) { s = 0; t = THREE.MathUtils.clamp(f / e, 0, 1); }
  else {
    const c = d1.dot(r);
    if (e <= 1e-8) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
    else {
      const b = d1.dot(d2), den = a * e - b * b;
      s = den !== 0 ? THREE.MathUtils.clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); }
      else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((b - c) / a, 0, 1); }
    }
  }
  const c1 = p1.clone().addScaledVector(d1, s), c2 = p2.clone().addScaledVector(d2, t);
  if (outPoint) outPoint.copy(c1).add(c2).multiplyScalar(0.5);
  return c1.distanceTo(c2);
}

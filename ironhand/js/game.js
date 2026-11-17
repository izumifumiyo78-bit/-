// Game logic: player, hands & weapons, enemies AI, combat, spells, waves, particles and HUD.
import * as THREE from '../lib/three.module.min.js';
import { Body, J, segSegDist } from './body.js';
import { sfx, setAudioTimeScale } from './audio.js';
import { ARENA_R } from './world.js';

const V = () => new THREE.Vector3();
const clamp = THREE.MathUtils.clamp;
const EYE = 1.6;

export const WEAPONS = [
  { key: 'sword', name: 'ロングソード', len: 0.95, mul: 1.0, stab: 1.5 },
  { key: 'axe', name: 'バトルアックス', len: 0.8, mul: 1.5, stab: 0.8 },
  { key: 'spear', name: 'スピア', len: 1.75, mul: 0.85, stab: 2.2 },
];
export const SPELLS = [
  { key: 'fire', name: '火球', color: 0xff7a2a, css: '#ff8a3a' },
  { key: 'bolt', name: '雷撃', color: 0x8fd0ff, css: '#9fd8ff' },
  { key: 'tk', name: '念動', color: 0xc58aff, css: '#d0a0ff' },
];
const HAND_BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
const UPV = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- particles
class Particles {
  constructor(scene, max = 500) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.ps = [];
    this.decals = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: 0x5a0606, transparent: true, opacity: 0.85, depthWrite: false }), 260);
    this.decals.frustumCulled = false;
    this.decals.count = 0;
    this.decalIdx = 0;
    scene.add(this.decals);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = V(); this.c = new THREE.Color();
    this.mesh.setColorAt(0, this.c.set(0xffffff));
  }
  emit(pos, vel, n, { color = 0x9a0b0b, spread = 1.5, size = 0.025, life = 1.2, gravity = 1, blood = true } = {}) {
    for (let i = 0; i < n; i++) {
      if (this.ps.length >= this.max) this.ps.shift();
      this.ps.push({
        p: pos.clone(), v: vel.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.3) * spread, (Math.random() - 0.5) * spread)),
        life: life * (0.5 + Math.random() * 0.7), size: size * (0.5 + Math.random()), color, gravity, blood,
      });
    }
  }
  decal(x, z, r) {
    const i = this.decalIdx++ % 260;
    this.q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this.m.compose(new THREE.Vector3(x, 0.015 + (i % 7) * 0.0006, z), this.q, this.s.set(r, r, r));
    this.decals.setMatrixAt(i, this.m);
    this.decals.count = Math.min(260, Math.max(this.decals.count, i + 1));
    this.decals.instanceMatrix.needsUpdate = true;
  }
  update(dt) {
    let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dt;
      p.v.y -= 9.8 * p.gravity * dt;
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.01) {
        if (p.blood && Math.random() < 0.35) this.decal(p.p.x, p.p.z, 0.03 + Math.random() * 0.07);
        p.life = 0;
      }
      if (p.life <= 0) { this.ps.splice(i, 1); continue; }
    }
    for (const p of this.ps) {
      if (n >= this.max) break;
      this.m.compose(p.p, this.q.identity(), this.s.setScalar(p.size));
      this.mesh.setMatrixAt(n, this.m);
      this.mesh.setColorAt(n, this.c.set(p.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() { this.ps.length = 0; this.decals.count = 0; this.decalIdx = 0; }
}

// ---------------------------------------------------------------- HUD (a canvas in front of the eyes)
class Hud {
  constructor(camera) {
    this.cv = document.createElement('canvas'); this.cv.width = 1024; this.cv.height = 512;
    this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), mat);
    this.plane.position.set(0, -0.08, -1);
    this.plane.renderOrder = 999;
    camera.add(this.plane);
    const fl = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), fl);
    this.flash.position.z = -0.6; this.flash.renderOrder = 998;
    camera.add(this.flash);
    this.last = 0;
  }
  draw(s) {
    const g = this.g, W = 1024, H = 512;
    g.clearRect(0, 0, W, H);
    g.font = 'bold 30px system-ui, sans-serif';
    g.textAlign = 'center';
    // messages
    if (s.msg) {
      g.font = 'bold 64px system-ui, sans-serif';
      g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.fillStyle = '#ffe2b0';
      g.strokeText(s.msg, W / 2, 110); g.fillText(s.msg, W / 2, 110);
      if (s.sub) { g.font = 'bold 32px system-ui, sans-serif'; g.lineWidth = 6; g.strokeText(s.sub, W / 2, 165); g.fillStyle = '#fff'; g.fillText(s.sub, W / 2, 165); }
    }
    // bars
    const bar = (y, v, col, label) => {
      const x = 312, w = 400, h = 18;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
      g.fillStyle = col; g.fillRect(x, y, w * clamp(v, 0, 1), h);
      g.font = 'bold 20px system-ui, sans-serif'; g.textAlign = 'right'; g.fillStyle = '#fff';
      g.fillText(label, x - 10, y + 16);
    };
    bar(400, s.hp, '#d8322a', '体力');
    bar(428, s.mana, '#3a7ae0', '魔力');
    bar(456, s.slow, s.slowOn ? '#ffe14a' : '#b39a2a', 'スロー');
    g.textAlign = 'left'; g.font = 'bold 22px system-ui, sans-serif';
    g.fillStyle = '#fff'; g.fillText(s.weapon, 730, 418);
    g.fillStyle = s.spellCss; g.fillText('魔法: ' + s.spell, 730, 446);
    g.fillStyle = '#ddd'; g.fillText(`第${s.wave}波  撃破 ${s.kills}`, 730, 474);
    if (s.hint) { g.textAlign = 'center'; g.font = '20px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText(s.hint, W / 2, 385); }
    this.tex.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- enemy
let enemyId = 0;
class Enemy {
  constructor(game, typeKey, x, z) {
    this.id = enemyId++;
    this.game = game;
    this.body = new Body(game.scene, typeKey);
    this.T = this.body.type;
    this.hp = this.T.hp;
    this.dead = false;
    this.e = { pos: new THREE.Vector3(x, 0, z), yaw: Math.atan2(-x, -z), phase: Math.random() * 6, move: 0, state: 'idle', t: 0, lean: 0 };
    this.state = 'idle';
    this.cooldown = 1 + Math.random() * 1.5;
    this.hitCd = 0;
    this.speedNow = 0;
    this.strafe = Math.random() < 0.5 ? -1 : 1;
    this.prevSpeed = 0;
    this.thrown = 0;
    this.diedAt = 0;
    this.body._fresh = true;
    this.body.setFromPose(this.e, 1 / 60);
    this.body.sync();
  }
  get standing() { return !this.dead && (this.state === 'idle' || this.state === 'windup' || this.state === 'strike' || this.state === 'recover' || this.state === 'stagger'); }
  get ragdolled() { return this.body.ragdoll && this.state !== 'getup'; }

  setState(s) { this.state = s; this.e.state = s; this.e.t = 0; }

  knockDown(dropWeapon = false) {
    if (this.dead) return;
    this.body.toRagdoll(dropWeapon);
    this.setState('down');
    this.downT = 0;
    this.game.attackers.delete(this);
  }

  update(dt) {
    const g = this.game, e = this.e, T = this.T, b = this.body;
    this.hitCd -= dt;
    if (this.dead || this.state === 'down' || this.state === 'grabbed') {
      b.step(dt, ARENA_R);
      if (this.thrown > 0) this.thrownUpdate(dt);
      if (this.state === 'down') {
        this.downT += dt;
        if (this.downT > 2.4 && b.speed() < 1.0 && b.weaponAttached) this.getUp();
        else if (this.downT > 5 && !b.weaponAttached) this.getUp();
      }
      b.sync();
      return;
    }
    if (this.state === 'getup') {
      e.t += dt / 0.8;
      b.blendToPose(e, Math.min(1, e.t), this.snap);
      if (e.t >= 1) { this.setState('idle'); this.cooldown = 0.8; }
      b.sync();
      return;
    }
    const P = g.playerPos;
    const dx = P.x - e.pos.x, dz = P.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const wantYaw = Math.atan2(dx, dz);
    let dy = wantYaw - e.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    const turnRate = this.state === 'strike' ? 0.5 : this.state === 'windup' ? 2.5 : 5;
    e.yaw += clamp(dy, -turnRate * dt, turnRate * dt);
    const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
    let vx = 0, vz = 0;
    this.cooldown -= dt;
    const attacker = g.attackers.has(this);
    switch (this.state) {
      case 'idle': {
        const want = attacker ? T.reach * 0.6 : 2.8;
        const mv = clamp((d - want) * 1.5, -0.6, 1);
        vx += (dx / (d || 1)) * mv * T.speed; vz += (dz / (d || 1)) * mv * T.speed;
        if (!attacker && Math.abs(d - want) < 0.8) {
          vx += -dz / (d || 1) * this.strafe * 0.5; vz += dx / (d || 1) * this.strafe * 0.5;
          if (Math.random() < dt * 0.3) this.strafe *= -1;
        }
        if (attacker && d < want + 0.3 && this.cooldown <= 0 && Math.abs(dy) < 0.5 && g.state === 'play') {
          this.setState('windup');
          this.windupDur = T.windup * (0.85 + Math.random() * 0.4);
          sfx.grunt();
        }
        break;
      }
      case 'windup':
        e.t += dt / this.windupDur;
        if (e.t >= 1) { this.setState('strike'); this.hitPlayer = false; }
        break;
      case 'strike':
        e.t += dt / T.strike;
        vx += fx * 1.4; vz += fz * 1.4;
        this.checkHitPlayer();
        if (e.t >= 1) this.setState('recover');
        break;
      case 'recover':
        e.t += dt / 0.5;
        if (e.t >= 1) { this.setState('idle'); this.cooldown = 1.0 + Math.random() * 1.6; g.attackers.delete(this); }
        break;
      case 'stagger':
        e.t += dt / this.staggerDur;
        vx -= fx * 1.2 * (1 - e.t); vz -= fz * 1.2 * (1 - e.t);
        e.lean = -0.35 * Math.sin(Math.min(1, e.t) * Math.PI);
        if (e.t >= 1) { this.setState('idle'); e.lean = 0; this.cooldown = 0.6 + Math.random(); g.attackers.delete(this); }
        break;
    }
    if (this.state !== 'stagger') e.lean = this.state === 'strike' ? 0.25 : this.state === 'windup' ? -0.1 : 0.05;
    // separation
    for (const o of g.enemies) {
      if (o === this || o.dead || !o.standing) continue;
      const ox = e.pos.x - o.e.pos.x, oz = e.pos.z - o.e.pos.z, od = Math.hypot(ox, oz);
      if (od < 0.9 && od > 1e-4) { vx += (ox / od) * (0.9 - od) * 4; vz += (oz / od) * (0.9 - od) * 4; }
    }
    if (d < 0.6) { vx -= dx / d * 2; vz -= dz / d * 2; }
    e.pos.x += vx * dt; e.pos.z += vz * dt;
    const r = Math.hypot(e.pos.x, e.pos.z);
    if (r > ARENA_R - 0.5) { e.pos.x *= (ARENA_R - 0.5) / r; e.pos.z *= (ARENA_R - 0.5) / r; }
    const sp = Math.hypot(vx, vz);
    this.speedNow += (sp - this.speedNow) * Math.min(1, dt * 8);
    e.move = clamp(this.speedNow / T.speed, 0, 1);
    e.phase += dt * (2 + this.speedNow * 4);
    b.setFromPose(e, dt);
    b.sync();
  }

  getUp() {
    if (this.dead || this.body.severed.size) return;
    const b = this.body;
    this.snap = b.snapshot();
    const c = b.points[J.pelvis].p;
    this.e.pos.set(c.x, 0, c.z);
    if (!b.weaponAttached) { // pick the weapon back up (it pops into the hand during the blend)
      b.weaponAttached = true;
    }
    b.fromRagdoll();
    this.setState('getup');
  }

  checkHitPlayer() {
    if (this.hitPlayer) return;
    const g = this.game, b = this.body;
    const head = g.headPos;
    const chest = g._tmp1.set(head.x, head.y - 0.75, head.z);
    const dist = segSegDist(b.points[J.grip].p, b.points[J.tip].p, head, chest);
    if (dist < 0.32) { this.hitPlayer = true; g.damagePlayer(this.T.dmg, this); }
  }

  thrownUpdate(dt) {
    const g = this.game, b = this.body;
    this.thrown -= dt;
    const s = b.speed();
    if (this.prevSpeed > 6 && this.prevSpeed - s > 4) {
      const c = b.center(V());
      g.fx.emit(c, V(), 12, { spread: 3 });
      sfx.thud(Math.min(1, this.prevSpeed / 12));
      g.damageEnemy(this, this.prevSpeed * 6, null, V(), { crush: true });
      this.thrown = 0;
    }
    if (s > 5) {
      const c = b.center(V());
      for (const o of g.enemies) {
        if (o === this || !o.standing) continue;
        const oc = o.body.center(V());
        if (oc.distanceTo(c) < 0.75) {
          o.knockDown(true);
          o.body.addVelAll(b.velOf(J.pelvis, V()).multiplyScalar(0.6));
          g.damageEnemy(o, 18, null, V(), {});
          sfx.thud(0.8);
        }
      }
    }
    this.prevSpeed = s;
  }
}

// ---------------------------------------------------------------- game
export class Game {
  constructor({ scene, camera, input, hands, mode }) {
    this.scene = scene; this.camera = camera; this.input = input; this.hands = hands;
    this.mode = mode;
    this.enemies = [];
    this.attackers = new Set();
    this.fx = new Particles(scene);
    this.hud = new Hud(camera);
    this.playerPos = V();
    this.headPos = V();
    this.headQuat = new THREE.Quaternion();
    this.bodyQuat = new THREE.Quaternion();
    this.yaw = 0; this.pitch = 0;
    this.vrYawOffset = 0;
    this._tmp1 = V(); this._tmp2 = V();
    this.gestureMagic = true;
    this.fireballs = [];
    this.timeScale = 1;
    this.buildHands();
    this.buildWeapons();
    this.buildSpellFx();
    this.reset();
  }

  setMode(mode) { this.mode = mode; }

  reset() {
    for (const en of this.enemies) en.body.dispose();
    this.enemies = []; this.attackers.clear();
    for (const f of this.fireballs) this.scene.remove(f.mesh);
    this.fireballs = [];
    this.fx.clear();
    this.playerPos.set(0, 0, 3);
    this.teleported = true;
    this.yaw = 0; this.pitch = 0;
    this.hp = 100; this.mana = 1; this.slow = 1; this.slowOn = false;
    this.kills = 0; this.wave = 0;
    this.weapon = 0; this.spell = 0;
    this.toSpawn = []; this.spawnT = 0; this.waveBreak = 2.5; this.betweenWaves = false;
    this.bleeders = [];
    this.msg = 'アリーナへようこそ'; this.sub = '剣を振って敵を倒せ'; this.msgT = 3;
    this.lastHurt = -10;
    this.time = 0;
    this.state = 'play';
    this.magicWas = false;
    this.charge = 0; this.grab = null; this.boltZap = 0;
    this.slashAnim = -1;
    this.flash = 0;
    this.whooshCd = 0;
    this.recenter();
  }

  // ------------------------------------------------------------ meshes
  buildHands() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb0b8c2, metalness: 0.3, roughness: 0.45 });
    this.handJoints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), mat, 42);
    this.handBones = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), mat, 42);
    for (const m of [this.handJoints, this.handBones]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); }
    this.fists = [0, 1].map(() => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.1), mat);
      this.scene.add(f);
      return f;
    });
    this.hand = [0, 1].map(() => ({
      pos: V(), prev: V(), vel: V(), dir: new THREE.Vector3(0, 1, -1).normalize(), up: V().set(0, 0, -1),
      fist: 1, tracked: false, joints: Array.from({ length: 21 }, V),
    }));
  }

  buildWeapons() {
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.35, roughness: 0.25, emissive: 0x202428 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc89a3a, metalness: 0.4, roughness: 0.4 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
    const mk = (w) => {
      const g = new THREE.Group();
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.2, 8), leather); grip.position.y = 0;
      g.add(grip);
      if (w.key === 'sword') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, w.len - 0.1, 0.01), steel); blade.position.y = 0.1 + (w.len - 0.1) / 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), steel); tip.position.y = w.len + 0.03; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.3;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.035), gold); guard.position.y = 0.1;
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), gold); pommel.position.y = -0.11;
        g.add(blade, tip, guard, pommel);
      } else if (w.key === 'axe') {
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, w.len + 0.2, 8), leather); haft.position.y = w.len / 2 - 0.05;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.015), steel); head.position.set(0.1, w.len - 0.08, 0);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.03), steel); back.position.set(-0.03, w.len - 0.08, 0);
        g.add(haft, head, back);
      } else {
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w.len + 0.5, 8), leather); haft.position.y = w.len / 2 - 0.2;
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.28, 4), steel); head.position.y = w.len - 0.1;
        g.add(haft, head);
      }
      g.visible = false;
      this.scene.add(g);
      return g;
    };
    this.weaponMeshes = WEAPONS.map(mk);
    this.bladePrev = Array.from({ length: 7 }, V);
    this.bladeNow = Array.from({ length: 7 }, V);
  }

  buildSpellFx() {
    this.orb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85 }));
    this.orb.visible = false;
    this.scene.add(this.orb);
    this.orbLight = new THREE.PointLight(0xff7a2a, 0, 6, 2);
    this.scene.add(this.orbLight);
    this.boltSegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshBasicMaterial({ color: 0xcfeaff }), 24);
    this.boltSegs.frustumCulled = false; this.boltSegs.count = 0;
    this.scene.add(this.boltSegs);
    this.boom = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0 }));
    this.scene.add(this.boom);
    this.boomT = 1;
    this.boomLight = new THREE.PointLight(0xff8a30, 0, 16, 1.5);
    this.scene.add(this.boomLight);
    this.tkBeam = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshBasicMaterial({ color: 0xc58aff, transparent: true, opacity: 0.6 }), 1);
    this.tkBeam.frustumCulled = false; this.tkBeam.count = 0;
    this.scene.add(this.tkBeam);
  }

  // ------------------------------------------------------------ head / body pose
  recenter() {
    const q = new THREE.Quaternion();
    if (this.input.headQuat(q)) {
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      this.vrYawOffset = -Math.atan2(-f.x, -f.z);
    }
    this.yaw = this.yaw || 0;
  }

  updateHead(rdt) {
    const inp = this.input;
    const q = new THREE.Quaternion();
    const hasGyro = this.mode === 'vr' && inp.headQuat(q);
    if (hasGyro && !this._gyroCentered) { this._gyroCentered = true; this.recenter(); }
    // turning
    if (this.mode === 'vr') {
      if (Math.abs(inp.turn) > 0.7 && !this.snapLatch) { this.yaw -= Math.sign(inp.turn) * Math.PI / 6; this.snapLatch = true; }
      if (Math.abs(inp.turn) < 0.3) this.snapLatch = false;
    } else {
      this.yaw -= inp.turn * 2.4 * rdt;
    }
    if (!hasGyro) {
      const lookByMouse = inp.mouse.locked || (inp.mouse.right && this.hands.status !== 'running');
      if (lookByMouse) {
        this.yaw -= inp.mouse.dx * 0.0025;
        this.pitch = clamp(this.pitch - inp.mouse.dy * 0.0025, -1.2, 1.2);
      }
      this.headQuat.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    } else {
      const off = new THREE.Quaternion().setFromAxisAngle(UPV, this.vrYawOffset + this.yaw);
      this.headQuat.copy(off).multiply(q);
    }
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.headQuat);
    this.headYaw = Math.atan2(-f.x, -f.z);
    this.bodyQuat.setFromAxisAngle(UPV, this.mode === 'vr' ? this.headYaw : this.yaw);
    this.headPos.set(this.playerPos.x, EYE, this.playerPos.z);
  }

  move(rdt) {
    const m = this.input.move;
    if (m.lengthSq() < 0.001) { this.moveVel = V(); return; }
    const yaw = this.mode === 'vr' ? this.headYaw : this.yaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const v = fwd.multiplyScalar(m.y).addScaledVector(right, m.x).multiplyScalar(2.6);
    this.moveVel = v;
    this.playerPos.addScaledVector(v, rdt);
    const r = Math.hypot(this.playerPos.x, this.playerPos.z);
    if (r > ARENA_R - 0.4) this.playerPos.multiplyScalar((ARENA_R - 0.4) / r);
  }

  // ------------------------------------------------------------ hands
  updateHands(rdt) {
    const tr = this.hands, inp = this.input;
    const tracking = tr.status === 'running';
    const frameQ = this.mode === 'vr' ? this.headQuat : this.bodyQuat;
    for (let i = 0; i < 2; i++) {
      const H = this.hand[i], src = tr.hands[i];
      H.prev.copy(H.pos);
      let local = V(), dir = V(), up = V();
      if (tracking && src.tracked) {
        local.copy(src.pos);
        dir.copy(src.dir); up.copy(src.up);
        H.fist = src.fist;
        H.tracked = true;
        for (let k = 0; k < 21; k++) H.joints[k].copy(src.joints[k]).applyQuaternion(frameQ);
      } else {
        H.tracked = false;
        H.fist = 1;
        const side = i === 0 ? -1 : 1;
        const mouseFresh = performance.now() - (inp.mouse.movedAt || -1e9) < 1500;
        if (i === 1 && this.mode === 'pc' && inp.mouse.inside && !inp.mouse.locked && (!tracking || mouseFresh)) {
          // mouse controls the sword hand
          this.mouseDepth = clamp((this.mouseDepth || 0) + inp.mouse.wheel * 0.05, -0.2, 0.35);
          local.set(inp.mouse.x * 0.5, inp.mouse.y * 0.38 - 0.12, -0.45 - this.mouseDepth);
          dir.copy(local).sub(new THREE.Vector3(0.18, -0.3, 0.05)).add(new THREE.Vector3(0, 0.25, 0)).normalize();
          up.set(0, 0, -1);
        } else {
          local.set(side * 0.24, -0.38, -0.38);
          dir.set(side * 0.1, 0.85, -0.5).normalize(); up.set(0, 0, -1);
        }
        // scripted slash for players without hand tracking (Joy-Con button / click)
        if (i === 1 && this.slashAnim >= 0) {
          const t = this.slashAnim, s = t * t * (3 - 2 * t);
          local.lerpVectors(new THREE.Vector3(0.42, 0.08, -0.3), new THREE.Vector3(-0.35, -0.38, -0.55), s);
          dir.lerpVectors(new THREE.Vector3(0.6, 0.8, -0.1), new THREE.Vector3(-0.75, -0.25, -0.6), s).normalize();
        }
      }
      H.pos.copy(local).applyQuaternion(frameQ).add(this.headPos);
      H.dir.copy(dir).applyQuaternion(frameQ).normalize();
      H.up.copy(up).applyQuaternion(frameQ).normalize();
      if (!this._handsInit || this.teleported) H.prev.copy(H.pos);
      H.vel.copy(H.pos).sub(H.prev).divideScalar(Math.max(rdt, 1e-3));
      if (this.moveVel) H.vel.sub(this.moveVel);
    }
    this._handsInit = true;
    if (this.slashAnim >= 0) { this.slashAnim += rdt / 0.28; if (this.slashAnim > 1) this.slashAnim = -1; }
  }

  syncHandMeshes() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V(), d = V();
    let nj = 0, nb = 0;
    for (let i = 0; i < 2; i++) {
      const H = this.hand[i];
      this.fists[i].visible = !H.tracked;
      if (!H.tracked) {
        this.fists[i].position.copy(H.pos);
        this.fists[i].quaternion.setFromUnitVectors(UPV, H.dir);
        continue;
      }
      for (let k = 0; k < 21; k++) {
        p.copy(H.joints[k]).add(H.pos).sub(this._palmOffset(H, d));
        m.compose(p, q.identity(), s.setScalar(k === 0 ? 0.02 : 0.012));
        this.handJoints.setMatrixAt(nj++, m);
      }
      for (const [a, b] of HAND_BONES) {
        const off = this._palmOffset(H, d).clone();
        const A = H.joints[a].clone().add(H.pos).sub(off), B = H.joints[b].clone().add(H.pos).sub(off);
        const dir = B.clone().sub(A); const len = dir.length() || 1e-4;
        q.setFromUnitVectors(UPV, dir.divideScalar(len));
        m.compose(A.add(B).multiplyScalar(0.5), q, s.set(0.01, len, 0.01));
        this.handBones.setMatrixAt(nb++, m);
      }
    }
    this.handJoints.count = nj; this.handBones.count = nb;
    this.handJoints.instanceMatrix.needsUpdate = true; this.handBones.instanceMatrix.needsUpdate = true;
  }
  // the tracked position is the palm centre; joints are wrist-relative
  _palmOffset(H, out) {
    const j = H.joints;
    return out.copy(j[0]).add(j[5]).add(j[9]).add(j[17]).multiplyScalar(0.25);
  }

  syncWeapon() {
    const H = this.hand[1], w = WEAPONS[this.weapon];
    this.weaponMeshes.forEach((m, i) => { m.visible = i === this.weapon; });
    const g = this.weaponMeshes[this.weapon];
    const y = H.dir.clone();
    let x = new THREE.Vector3().crossVectors(y, H.up);
    if (x.lengthSq() < 1e-4) x.crossVectors(y, new THREE.Vector3(0, 0, 1));
    x.normalize();
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    g.position.copy(H.pos);
    // blade sample points for hit detection
    for (let k = 0; k < 7; k++) {
      this.bladePrev[k].copy(this.bladeNow[k]);
      const t = 0.2 + (k / 6) * 0.8;
      this.bladeNow[k].copy(H.pos).addScaledVector(H.dir, w.len * t);
    }
    if (!this._bladeInit || this.teleported) { for (let k = 0; k < 7; k++) this.bladePrev[k].copy(this.bladeNow[k]); this._bladeInit = true; }
    this.teleported = false;
  }

  // ------------------------------------------------------------ combat
  bladeCombat(rdt) {
    const w = WEAPONS[this.weapon];
    const slowBoost = 1 + (1 - this.timeScale) * 0.8;
    const base = this.hand[1].pos, tip = this.bladeNow[6];
    const vel = V();
    // whoosh
    const tipSpeed = this.bladeNow[6].distanceTo(this.bladePrev[6]) / Math.max(rdt, 1e-3);
    this.whooshCd -= rdt;
    if (tipSpeed > 6 && this.whooshCd <= 0) { sfx.whoosh(tipSpeed); this.whooshCd = 0.3; }
    for (const en of this.enemies) {
      if (en.hitCd > 0) continue;
      const b = en.body;
      // parry / block against the enemy's weapon
      if (!en.dead && b.weaponAttached && !b.ragdoll && tipSpeed > 1.5) {
        const cp = V();
        const dd = segSegDist(base, tip, b.points[J.grip].p, b.points[J.tip].p, cp);
        if (dd < 0.07) {
          sfx.clang();
          this.fx.emit(cp, V(), 14, { color: 0xffd060, spread: 4, size: 0.012, life: 0.35, gravity: 0.4, blood: false });
          if (en.state === 'windup' || en.state === 'strike') {
            en.setState('stagger'); en.staggerDur = 1.1;
            this.msgFlash('パリィ！');
          }
          en.hitCd = 0.3;
          continue;
        }
      }
      let best = null, bestSpeed = 0;
      for (let k = 0; k < 7; k++) {
        vel.copy(this.bladeNow[k]).sub(this.bladePrev[k]).divideScalar(Math.max(rdt, 1e-3));
        if (this.moveVel) vel.sub(this.moveVel);
        const sp = vel.length();
        if (sp < 2.2) continue;
        const hit = b.nearest(this.bladeNow[k]);
        if (hit.d < 0.02 && sp > bestSpeed) { best = { k, bone: hit.bone, v: vel.clone(), p: this.bladeNow[k].clone() }; bestSpeed = sp; }
      }
      if (!best) continue;
      const sp = bestSpeed * slowBoost;
      const along = best.v.clone().normalize().dot(this.hand[1].dir);
      const stab = along > 0.7 ? w.stab : 1;
      let dmg = (sp - 2) * 9 * w.mul * stab;
      if (best.bone.part === 'head') dmg *= 1.8;
      en.hitCd = en.dead ? 0.12 : 0.28;
      this.damageEnemy(en, dmg, best.bone, best.v.multiplyScalar(slowBoost), { point: best.p, speed: sp, cut: stab === 1 || w.key === 'axe' });
    }
    // left hand punches
    const L = this.hand[0];
    if (L.tracked && L.fist > 0.6 && !this.magicActive) {
      const sp = L.vel.length();
      if (sp > 3.2) {
        for (const en of this.enemies) {
          if (en.hitCd > 0) continue;
          const hit = en.body.nearest(L.pos);
          if (hit.d < 0.05) {
            en.hitCd = 0.3;
            sfx.thud(0.6);
            this.damageEnemy(en, (sp - 3) * 5, hit.bone, L.vel.clone(), { point: L.pos.clone(), speed: sp, punch: true });
          }
        }
      }
    }
  }

  damageEnemy(en, dmg, bone, vel, o = {}) {
    if (dmg <= 0) return;
    const b = en.body;
    const point = o.point || b.center(V());
    const sp = o.speed || vel.length();
    const bloodN = Math.min(40, 4 + dmg * 0.5) | 0;
    if (!o.punch) this.fx.emit(point, vel.clone().multiplyScalar(0.25), bloodN, { spread: 2.2 });
    if (!o.punch && !o.crush) sfx.slash(Math.min(1, dmg / 50));
    const impulse = vel.clone().multiplyScalar(o.punch ? 0.25 : 0.12);
    if (en.dead) {
      // corpse reacts and can be dismembered
      if (bone) { b.addVel(bone.a, impulse.clone().multiplyScalar(2)); b.addVel(bone.b, impulse.clone().multiplyScalar(2)); }
      if (bone && o.cut && sp > 5 && Math.random() < 0.6) this.dismember(en, bone.part);
      return;
    }
    en.hp -= dmg;
    if (en.hp <= 0) {
      this.kill(en, bone, vel, o);
      return;
    }
    if (en.ragdolled) {
      if (bone) b.addVel(bone.a, impulse.clone().multiplyScalar(2));
      return;
    }
    if (dmg > 28 || o.punch && sp > 6) {
      en.knockDown(dmg > 40);
      b.addVelAll(impulse);
      if (bone) b.addVel(bone.a, impulse.clone().multiplyScalar(2));
    } else {
      en.setState('stagger'); en.staggerDur = 0.35 + Math.min(0.6, dmg / 40);
      this.attackers.delete(en);
    }
    sfx.grunt();
  }

  kill(en, bone, vel, o = {}) {
    en.dead = true; en.state = 'dead'; en.hp = 0; en.diedAt = this.time;
    this.attackers.delete(en);
    const b = en.body;
    b.toRagdoll(true);
    const imp = vel.clone().multiplyScalar(o.punch ? 0.3 : 0.18);
    imp.y = Math.max(imp.y, 0.5);
    b.addVelAll(imp, undefined, true);
    if (bone) { b.addVel(bone.a, imp.clone().multiplyScalar(1.5)); b.addVel(bone.b, imp.clone().multiplyScalar(1.5)); }
    const sp = o.speed || vel.length();
    if (bone && o.cut && sp > 5.5 && bone.part !== 'torso') this.dismember(en, bone.part);
    this.kills++;
    this.slow = Math.min(1, this.slow + 0.12);
    this.mana = Math.min(1, this.mana + 0.15);
    // tidy up old corpses
    const dead = this.enemies.filter((e) => e.dead);
    if (dead.length > 10) {
      const old = dead[0];
      old.body.dispose();
      this.enemies.splice(this.enemies.indexOf(old), 1);
    }
  }

  dismember(en, part) {
    const r = en.body.sever(part);
    if (!r) return;
    sfx.slash(1);
    const b = en.body;
    this.bleeders.push({ b, i: r.stumpA, t: 1.6 }, { b, i: r.stumpB, t: 1.2 });
    if (part === 'head') { const hv = V().set((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2); b.addVel(J.head, hv); }
  }

  damagePlayer(dmg, from) {
    if (this.state !== 'play') return;
    this.hp -= dmg;
    this.lastHurt = this.time;
    this.flash = 0.7;
    sfx.hurt();
    if (from) {
      // knock the player back a little
      const dx = this.playerPos.x - from.e.pos.x, dz = this.playerPos.z - from.e.pos.z, d = Math.hypot(dx, dz) || 1;
      this.playerPos.x += dx / d * 0.25; this.playerPos.z += dz / d * 0.25;
      this.teleported = true;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'over';
      this.msg = '敗北…'; this.sub = `第${this.wave}波・撃破 ${this.kills}　決定ボタン / クリックでもう一度`; this.msgT = 1e9;
      this.slowOn = false;
    }
  }

  msgFlash(text, sub = '', t = 1) { this.msg = text; this.sub = sub; this.msgT = t; }

  // ------------------------------------------------------------ magic
  aimDir(out) {
    const L = this.hand[0];
    const gaze = new THREE.Vector3(0, 0, -1).applyQuaternion(this.headQuat);
    if (!L.tracked) return out.copy(gaze);
    const shoulder = new THREE.Vector3(-0.18, -0.25, 0).applyQuaternion(this.bodyQuat).add(this.headPos);
    out.copy(L.pos).sub(shoulder).normalize();
    return out.lerp(gaze, 0.45).normalize();
  }

  findTarget(from, dir, cone, maxD, filter) {
    let best = null, score = Infinity;
    for (const en of this.enemies) {
      if (filter && !filter(en)) continue;
      const c = en.body.center(V());
      const to = c.clone().sub(from); const d = to.length();
      if (d > maxD || d < 0.2) continue;
      const ang = to.divideScalar(d).angleTo(dir);
      if (ang > cone) continue;
      const s = ang * 3 + d * 0.08;
      if (s < score) { score = s; best = en; }
    }
    return best;
  }

  magic(rdt, dt) {
    const inp = this.input, L = this.hand[0];
    const gesture = this.gestureMagic && L.tracked && L.fist > 0.75;
    const active = inp.down.magic || gesture || (this.mode === 'pc' && this.hands.status !== 'running' && inp.mouse.left && inp.mouse.inside);
    this.magicActive = active;
    const sp = SPELLS[this.spell];
    const palm = L.pos.clone().addScaledVector(L.dir, 0.06);
    const aim = this.aimDir(V());
    this.orb.visible = false; this.orbLight.intensity = 0; this.boltSegs.count = 0; this.tkBeam.count = 0;
    if (sp.key === 'fire') {
      if (active && this.mana > 0.1) {
        if (!this.magicWas) sfx.charge();
        this.charge = Math.min(1, this.charge + rdt / 0.7);
      }
      if (this.charge > 0) {
        const r = 0.03 + this.charge * 0.07;
        this.orb.visible = true; this.orb.material.color.set(sp.color);
        this.orb.position.copy(palm); this.orb.scale.setScalar(r * (1 + Math.sin(this.time * 30) * 0.08));
        this.orbLight.position.copy(palm); this.orbLight.color.set(sp.color); this.orbLight.intensity = 2 + this.charge * 4;
        if (Math.random() < 0.3) this.fx.emit(palm, V().set(0, 0.6, 0), 1, { color: 0xffb040, spread: 0.4, size: 0.012, life: 0.4, gravity: -0.2, blood: false });
      }
      if (!active && this.magicWas && this.charge > 0.25) {
        let d = aim.clone();
        if (L.tracked && L.vel.length() > 1.8) d = L.vel.clone().normalize().lerp(aim, 0.4).normalize();
        this.castFireball(palm, d, this.charge);
        this.mana -= 0.28;
        this.charge = 0;
      } else if (!active) this.charge = Math.max(0, this.charge - rdt * 3);
    } else if (sp.key === 'bolt') {
      if (active && this.mana > 0.02) {
        this.mana -= rdt * 0.3;
        const tgt = this.findTarget(palm, aim, 0.5, 11);
        const end = tgt ? tgt.body.center(V()) : palm.clone().addScaledVector(aim, 6);
        this.drawBolt(palm, end);
        this.orbLight.position.copy(palm); this.orbLight.color.set(sp.color); this.orbLight.intensity = 3 + Math.random() * 3;
        this.boltZap -= rdt;
        if (this.boltZap <= 0) { sfx.zap(); this.boltZap = 0.07; }
        if (tgt) {
          const b = tgt.body;
          // electrocution twitch
          for (let k = 0; k < 3; k++) b.addVel((Math.random() * 15) | 0, V().set((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3));
          if (!tgt.dead) {
            tgt.hp -= 45 * dt;
            if (tgt.standing && tgt.state !== 'stagger') { tgt.setState('stagger'); tgt.staggerDur = 0.6; this.attackers.delete(tgt); }
            if (tgt.hp <= 0) this.kill(tgt, null, aim.clone().multiplyScalar(3), {});
          }
          if (Math.random() < 0.25) this.fx.emit(end, V(), 2, { color: 0xcfeaff, spread: 3, size: 0.01, life: 0.25, gravity: 0, blood: false });
        }
      }
    } else if (sp.key === 'tk') {
      if (active && !this.magicWas && this.mana > 0.05) {
        const tgt = this.findTarget(palm, aim, 0.45, 14);
        if (tgt) {
          if (!tgt.dead) { tgt.body.toRagdoll(true); tgt.setState('grabbed'); this.attackers.delete(tgt); }
          const dist = clamp(tgt.body.center(V()).distanceTo(palm), 1.4, 3.2);
          this.grab = { en: tgt, dist };
          sfx.charge();
        }
      }
      if (this.grab) {
        const en = this.grab.en, b = en.body;
        if (active && this.mana > 0) {
          this.mana -= rdt * 0.1;
          const target = palm.clone().addScaledVector(aim, this.grab.dist);
          const c = b.center(V());
          const want = target.clone().sub(c).multiplyScalar(9).clampLength(0, 14);
          const cur = V();
          for (let i = 0; i < b.points.length; i++) {
            b.velOf(i, cur);
            cur.lerp(want, i === J.pelvis || i === J.neck ? 0.35 : 0.12);
            b.points[i].prev.copy(b.points[i].p).addScaledVector(cur, -b.lastDt);
          }
          // beam
          const dir = c.clone().sub(palm); const len = dir.length();
          const m = new THREE.Matrix4().compose(palm.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UPV, dir.divideScalar(len)), V().set(0.006, len, 0.006));
          this.tkBeam.setMatrixAt(0, m); this.tkBeam.count = 1; this.tkBeam.instanceMatrix.needsUpdate = true;
          this.orbLight.position.copy(palm); this.orbLight.color.set(sp.color); this.orbLight.intensity = 2;
        } else {
          // release: throw with the hand's motion
          if (L.tracked) b.addVelAll(L.vel.clone().multiplyScalar(3.5).clampLength(0, 20));
          else b.addVelAll(aim.clone().multiplyScalar(9));
          en.thrown = 2; en.prevSpeed = 0;
          if (!en.dead) { en.setState('down'); en.downT = 0; }
          this.grab = null;
          sfx.fire();
        }
      }
    }
    this.magicWas = active;
    this.mana = clamp(this.mana + rdt * (active ? 0.02 : 0.12), 0, 1);
  }

  drawBolt(a, b) {
    const n = 10, pts = [a.clone()];
    const d = b.clone().sub(a);
    for (let i = 1; i < n; i++) {
      const p = a.clone().addScaledVector(d, i / n);
      p.x += (Math.random() - 0.5) * 0.25; p.y += (Math.random() - 0.5) * 0.25; p.z += (Math.random() - 0.5) * 0.25;
      pts.push(p);
    }
    pts.push(b.clone());
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    let c = 0;
    for (let i = 0; i < pts.length - 1 && c < 24; i++) {
      const s = pts[i + 1].clone().sub(pts[i]); const len = s.length() || 1e-4;
      q.setFromUnitVectors(UPV, s.divideScalar(len));
      m.compose(pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5), q, V().set(0.008, len, 0.008));
      this.boltSegs.setMatrixAt(c++, m);
    }
    this.boltSegs.count = c;
    this.boltSegs.instanceMatrix.needsUpdate = true;
  }

  castFireball(pos, dir, charge) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06 + charge * 0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.fireballs.push({ mesh, vel: dir.clone().multiplyScalar(11 + charge * 7), charge, life: 3 });
    sfx.fire();
  }

  updateFireballs(dt) {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.life -= dt;
      f.vel.y -= 2 * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      const p = f.mesh.position;
      if (Math.random() < 0.8) this.fx.emit(p, V(), 1, { color: Math.random() < 0.5 ? 0xff6a20 : 0xffd060, spread: 0.6, size: 0.03, life: 0.35, gravity: -0.3, blood: false });
      let hit = p.y < 0.05 || Math.hypot(p.x, p.z) > ARENA_R + 1 || f.life <= 0;
      if (!hit) for (const en of this.enemies) { if (en.body.nearest(p).d < 0.12) { hit = true; break; } }
      if (hit) { this.explode(p.clone(), f.charge); this.scene.remove(f.mesh); f.mesh.geometry.dispose(); this.fireballs.splice(i, 1); }
    }
  }

  explode(p, charge) {
    sfx.boom();
    const R = 1.5 + charge * 2;
    this.boom.position.copy(p); this.boomT = 0; this.boomR = R;
    this.boomLight.position.copy(p); this.boomLight.intensity = 30;
    this.fx.emit(p, V().set(0, 2, 0), 40, { color: 0xff8a30, spread: 7, size: 0.04, life: 0.6, gravity: 0.3, blood: false });
    for (const en of this.enemies) {
      const c = en.body.center(V());
      const d = c.distanceTo(p);
      if (d > R) continue;
      const k = 1 - d / R;
      const dir = c.clone().sub(p).setY(0).normalize();
      const v = dir.multiplyScalar(9 * k * (0.5 + charge)).add(V().set(0, 4 * k + 1.5, 0));
      if (!en.dead) {
        en.hp -= 70 * k * (0.4 + charge);
        if (en.hp <= 0) this.kill(en, null, v, {});
        else en.knockDown(k > 0.5);
      }
      en.body.addVelAll(v);
      if (en.dead) en.body.addVelAll(v.multiplyScalar(0.3));
    }
    const pd = this.headPos.distanceTo(p);
    if (pd < 1.2) this.damagePlayer(8, null);
  }

  // ------------------------------------------------------------ waves
  startWave(n) {
    this.wave = n;
    const count = Math.min(14, 2 + n);
    this.toSpawn = [];
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let t = 'sword';
      if (n >= 2 && r < 0.3) t = 'spear';
      if (n >= 3 && r > 0.75) t = 'axe';
      this.toSpawn.push(t);
    }
    this.spawnT = 0.5;
    this.msgFlash(`第${n}波`, `敵 ${count}体`, 2.5);
    sfx.wave();
  }

  spawn(type) {
    const a = (this.headYaw || 0) + (Math.random() - 0.5) * 2.0; // roughly in front of the player
    let x = this.playerPos.x - Math.sin(a) * 6, z = this.playerPos.z - Math.cos(a) * 6;
    const rr = Math.hypot(x, z);
    if (rr > ARENA_R - 1) { x *= (ARENA_R - 1) / rr; z *= (ARENA_R - 1) / rr; }
    const en = new Enemy(this, type, x, z);
    this.enemies.push(en);
  }

  waves(dt) {
    const alive = this.enemies.filter((e) => !e.dead);
    if (alive.length === 0 && this.toSpawn.length === 0) {
      if (!this.betweenWaves) {
        this.betweenWaves = true;
        this.waveBreak = this.wave === 0 ? 2.5 : 4;
        if (this.wave > 0) { this.hp = Math.min(100, this.hp + 30); this.msgFlash(`第${this.wave}波 突破！`, '体力が回復した', 3); }
      }
      this.waveBreak -= dt;
      if (this.waveBreak <= 0) { this.betweenWaves = false; this.startWave(this.wave + 1); }
      return;
    }
    this.spawnT -= dt;
    if (this.toSpawn.length && alive.length < 4 && this.spawnT <= 0) {
      this.spawn(this.toSpawn.shift());
      this.spawnT = 1.4;
    }
    // choose who may attack: the two closest standing enemies
    const st = alive.filter((e) => e.standing).sort((a, b) => a.e.pos.distanceTo(this.playerPos) - b.e.pos.distanceTo(this.playerPos));
    for (const e of [...this.attackers]) if (!st.slice(0, 2).includes(e) && e.state === 'idle') this.attackers.delete(e);
    for (const e of st.slice(0, 2)) if (this.attackers.size < 2) this.attackers.add(e);
  }

  // ------------------------------------------------------------ main update
  update(rdt) {
    const inp = this.input;
    if (inp.pressed.recenter) { this.recenter(); this.yaw = 0; this.hands.calibrate(); this.msgFlash('正面をリセット', '', 1); }
    if (this.state === 'over') {
      if (inp.pressed.confirm || inp.pressed.pause || (inp.mouse.left && this._overArmed)) { this.reset(); return; }
      this._overArmed = !inp.mouse.left;
    }
    if (inp.pressed.weapon) { this.weapon = (this.weapon + 1) % WEAPONS.length; this.msgFlash(WEAPONS[this.weapon].name, '', 0.8); }
    if (inp.pressed.spell) { this.spell = (this.spell + 1) % SPELLS.length; this.charge = 0; this.grab = null; this.msgFlash('魔法: ' + SPELLS[this.spell].name, '', 0.8); }
    if (inp.pressed.confirm && this.state === 'play' && !this.hand[1].tracked && this.slashAnim < 0) { this.slashAnim = 0; }
    if (inp.pressed.slowmo && this.state === 'play') {
      if (!this.slowOn && this.slow > 0.15) { this.slowOn = true; sfx.slowIn(); } else if (this.slowOn) { this.slowOn = false; sfx.slowOut(); }
    }
    if (this.slowOn) { this.slow -= rdt * 0.22; if (this.slow <= 0) { this.slow = 0; this.slowOn = false; sfx.slowOut(); } }
    else this.slow = Math.min(1, this.slow + rdt * 0.03);
    const targetTS = this.state === 'over' ? 0.35 : this.slowOn ? 0.3 : 1;
    this.timeScale += (targetTS - this.timeScale) * Math.min(1, rdt * 8);
    setAudioTimeScale(this.timeScale);
    const dt = rdt * this.timeScale;
    this.time += dt;

    this.updateHead(rdt);
    if (this.state === 'play') this.move(rdt); else this.moveVel = V();
    this.updateHands(rdt);
    this.syncWeapon();
    if (this.state === 'play') { this.magic(rdt, dt); this.bladeCombat(rdt); }
    else { this.orb.visible = false; this.boltSegs.count = 0; this.tkBeam.count = 0; }
    this.syncHandMeshes();

    if (this.state === 'play') this.waves(dt);
    for (const en of this.enemies) en.update(dt);
    this.updateFireballs(dt);
    for (let i = this.bleeders.length - 1; i >= 0; i--) {
      const bl = this.bleeders[i];
      bl.t -= dt;
      if (Math.random() < 0.7) this.fx.emit(bl.b.points[bl.i].p, V().set(0, 1.2, 0), 1, { spread: 1.2, size: 0.02 });
      if (bl.t <= 0) this.bleeders.splice(i, 1);
    }
    this.fx.update(dt);
    // explosion visual
    if (this.boomT < 1) {
      this.boomT += dt / 0.45;
      this.boom.scale.setScalar(this.boomR * Math.min(1, this.boomT * 1.6));
      this.boom.material.opacity = Math.max(0, 0.7 * (1 - this.boomT));
    } else this.boom.material.opacity = 0;
    this.boomLight.intensity *= Math.pow(0.02, dt);
    if (this.time - this.lastHurt > 5 && this.state === 'play') this.hp = Math.min(100, this.hp + rdt * 2);
    this.flash = Math.max(0, this.flash - rdt * 1.5);
    this.hud.flash.material.opacity = this.flash * 0.45 + (this.state === 'over' ? 0.25 : 0) + (this.hp < 30 && this.state === 'play' ? 0.08 + Math.sin(this.time * 6) * 0.04 : 0);
    if (this.msgT < 1e8) this.msgT -= rdt;
    // HUD at ~15 Hz
    this.hudT = (this.hudT || 0) - rdt;
    if (this.hudT <= 0) {
      this.hudT = 1 / 15;
      const tracking = this.hands.status === 'running';
      let hint = '';
      if (tracking && !this.hand[1].tracked && !this.hand[0].tracked) hint = this.mode === 'vr' ? '両手をカメラの前に出してください' : '両手をカメラに映してください';
      this.hud.draw({
        hp: this.hp / 100, mana: this.mana, slow: this.slow, slowOn: this.slowOn,
        weapon: WEAPONS[this.weapon].name, spell: SPELLS[this.spell].name, spellCss: SPELLS[this.spell].css,
        wave: this.wave, kills: this.kills,
        msg: this.msgT > 0 ? this.msg : '', sub: this.msgT > 0 ? this.sub : '', hint,
      });
    }
  }
}

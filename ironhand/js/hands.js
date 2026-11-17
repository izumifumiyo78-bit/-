// Camera hand tracking (MediaPipe Hand Landmarker) -> 3D hand poses in the player's frame.
//
// Frames used here ("user frame"): x = right, y = up, z = toward the player's back (-z is forward).
//  - 'vr' mode: phone in a headset, rear camera looks the same way as the eyes. Output is head-local.
//  - 'pc' mode: webcam on the monitor faces the player. Output is relative to a calibrated rest pose.
import * as THREE from '../lib/three.module.min.js';

const LIB = new URL('../lib/mediapipe/', import.meta.url).href;
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35';

const PAIRS = [[0, 5], [0, 17], [5, 17], [0, 9], [5, 9], [9, 13], [13, 17], [0, 1]];
const V = () => new THREE.Vector3();

class Euro { // one-euro filter for a vector
  constructor(minCut = 1.2, beta = 0.6) { this.minCut = minCut; this.beta = beta; this.x = null; this.dx = V(); }
  filter(v, dt) {
    if (!this.x) { this.x = v.clone(); return this.x; }
    const a = (c) => { const r = 2 * Math.PI * c * dt; return r / (r + 1); };
    const d = v.clone().sub(this.x).divideScalar(Math.max(dt, 1e-3));
    this.dx.lerp(d, a(1.0));
    const cut = this.minCut + this.beta * this.dx.length();
    this.x.lerp(v, a(cut));
    return this.x;
  }
  reset() { this.x = null; this.dx.set(0, 0, 0); }
}

function makeHand(side) {
  return {
    side, tracked: false, seen: -1e9,
    pos: V(), vel: V(), raw: V(), lastRaw: V(), lastT: 0,
    dir: new THREE.Vector3(0, 1, -1).normalize(), // blade direction (fist grip, along the knuckles)
    up: V().set(0, 1, 0), // wrist -> middle knuckle
    fist: 0, joints: Array.from({ length: 21 }, V),
    euro: new Euro(1.5, 0.8),
  };
}

export class HandTracker {
  constructor() {
    this.status = 'off'; // off | loading | running | error
    this.error = '';
    this.mode = 'pc';
    this.hfov = 60;
    this.hands = [makeHand('L'), makeHand('R')];
    this.video = document.createElement('video');
    this.video.playsInline = true; this.video.muted = true;
    this.lastVideoTime = -1;
    this.lastDetect = 0;
    this.lastResult = null;
    this.calib = [new THREE.Vector3(-0.2, -0.25, 0.6), new THREE.Vector3(0.2, -0.25, 0.6)];
    this.rest = [new THREE.Vector3(-0.22, -0.38, -0.35), new THREE.Vector3(0.22, -0.38, -0.35)];
    this.gain = 1.7;
    this.detectMs = 0;
  }

  async start(mode, hfov) {
    this.mode = mode; this.hfov = hfov;
    if (this.status === 'running' || this.status === 'loading') { await this.switchCamera(); return; }
    this.status = 'loading';
    try {
      await this.openCamera();
      const vision = await import(LIB + 'vision_bundle.mjs');
      const fileset = await this.fileset();
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: LIB + 'hand_landmarker.task', delegate },
        runningMode: 'VIDEO', numHands: 2,
        minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
      });
      try { this.lm = await vision.HandLandmarker.createFromOptions(fileset, opts('GPU')); }
      catch { this.lm = await vision.HandLandmarker.createFromOptions(fileset, opts('CPU')); }
      this.status = 'running';
    } catch (e) {
      console.warn(e);
      this.status = 'error';
      this.error = e && e.name === 'NotAllowedError' ? 'カメラの使用が許可されませんでした'
        : e && e.name === 'NotFoundError' ? 'カメラが見つかりません' : String((e && e.message) || e);
    }
  }

  async fileset() {
    let simd = true;
    try {
      simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    } catch { simd = false; }
    if (simd) return { wasmLoaderPath: LIB + 'wasm/vision_wasm_internal.js', wasmBinaryPath: LIB + 'wasm/vision_wasm_internal.wasm' };
    return { wasmLoaderPath: CDN + '/wasm/vision_wasm_nosimd_internal.js', wasmBinaryPath: CDN + '/wasm/vision_wasm_nosimd_internal.wasm' };
  }

  async openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('このブラウザはカメラに対応していません（https で開いてください）');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: this.mode === 'vr' ? { ideal: 'environment' } : 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
    });
    this.stream = stream;
    this.video.srcObject = stream;
    await this.video.play();
  }

  async switchCamera() {
    const want = this.mode === 'vr' ? 'environment' : 'user';
    const track = this.stream && this.stream.getVideoTracks()[0];
    const cur = track && track.getSettings().facingMode;
    if (cur && cur !== want) {
      this.stream.getTracks().forEach((t) => t.stop());
      await this.openCamera();
    }
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.lm) { try { this.lm.close(); } catch { /* ignore */ } }
    this.lm = null;
    this.status = 'off';
    for (const h of this.hands) h.tracked = false;
  }

  // Capture the current hand positions as the "ready stance" (PC mode).
  calibrate() {
    for (let i = 0; i < 2; i++) {
      const h = this.hands[i];
      if (performance.now() - h.seen < 300) this.calib[i].copy(h.lastRaw);
    }
  }

  toUser(out, x, y, z) { // camera frame (x right, y down, z away from camera) -> user frame
    if (this.mode === 'vr') return out.set(x, -y, -z);
    return out.set(-x, -y, z);
  }

  update(now) {
    const dt = 1 / 60;
    if (this.status === 'running' && this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime && now - this.lastDetect > 30) {
      this.lastVideoTime = this.video.currentTime;
      this.lastDetect = now;
      const t0 = performance.now();
      try { this.lastResult = this.lm.detectForVideo(this.video, now); } catch (e) { console.warn(e); this.lastResult = null; }
      this.detectMs = this.detectMs * 0.9 + (performance.now() - t0) * 0.1;
      if (this.lastResult) this.ingest(this.lastResult, now);
    }
    for (const h of this.hands) {
      const age = now - h.seen;
      h.tracked = age < 350;
      if (age < 120) {
        // extrapolate between camera frames so the blade moves every render frame
        const ex = Math.min((now - h.lastT) / 1000, 0.06);
        const target = h.raw.clone().addScaledVector(h.vel, ex);
        h.pos.copy(h.euro.filter(target, dt));
      }
    }
  }

  ingest(res, now) {
    const W = this.video.videoWidth || 640, H = this.video.videoHeight || 480;
    const focal = W / 2 / Math.tan(THREE.MathUtils.degToRad(this.hfov) / 2);
    const lms = res.landmarks || [];
    const wls = res.worldLandmarks || [];
    const found = [];
    for (let i = 0; i < lms.length; i++) {
      const l = lms[i], w = wls[i];
      if (!l || !w) continue;
      // metres per pixel at the hand, from the least-foreshortened bone
      let mpp = Infinity;
      for (const [a, b] of PAIRS) {
        const ip = Math.hypot((l[a].x - l[b].x) * W, (l[a].y - l[b].y) * H);
        const wm = Math.hypot(w[a].x - w[b].x, w[a].y - w[b].y, w[a].z - w[b].z);
        if (ip > 4) mpp = Math.min(mpp, wm / ip);
      }
      if (!isFinite(mpp)) continue;
      const cx = ((l[0].x + l[5].x + l[9].x + l[17].x) / 4) * W - W / 2;
      const cy = ((l[0].y + l[5].y + l[9].y + l[17].y) / 4) * H - H / 2;
      const depth = Math.min(1.5, Math.max(0.12, mpp * focal));
      const p = this.toUser(V(), cx * mpp, cy * mpp, depth);
      const joints = w.map((j) => this.toUser(V(), j.x - w[0].x, j.y - w[0].y, j.z - w[0].z));
      found.push({ p, joints });
    }
    // Assign detections to left / right hands
    const recent = this.hands.map((h) => now - h.seen < 400);
    const mid = this.mode === 'pc' ? (this.calib[0].x + this.calib[1].x) / 2 : 0;
    let assign = [];
    if (found.length >= 2) {
      found.sort((a, b) => a.p.x - b.p.x);
      assign = [[0, found[0]], [1, found[found.length - 1]]];
    } else if (found.length === 1) {
      const f = found[0];
      let side = f.p.x < mid ? 0 : 1;
      if (recent[0] && recent[1]) side = f.p.distanceTo(this.hands[0].lastRaw) < f.p.distanceTo(this.hands[1].lastRaw) ? 0 : 1;
      else if (recent[0] && f.p.distanceTo(this.hands[0].lastRaw) < 0.15) side = 0;
      else if (recent[1] && f.p.distanceTo(this.hands[1].lastRaw) < 0.15) side = 1;
      assign = [[side, f]];
    }
    for (const [i, f] of assign) this.apply(this.hands[i], i, f, now);
  }

  apply(h, i, f, now) {
    h.lastRaw.copy(f.p);
    let pos;
    if (this.mode === 'vr') {
      pos = f.p.clone().multiplyScalar(1.15);
    } else {
      pos = f.p.clone().sub(this.calib[i]);
      pos.x *= this.gain; pos.y *= this.gain; pos.z *= this.gain * 1.3;
      pos.add(this.rest[i]);
    }
    const dtS = (now - h.lastT) / 1000;
    if (now - h.seen < 200 && dtS > 0.005) h.vel.copy(pos).sub(h.raw).divideScalar(dtS).clampLength(0, 25);
    else { h.vel.set(0, 0, 0); h.euro.reset(); h.pos.copy(pos); }
    h.raw.copy(pos);
    h.lastT = now; h.seen = now;
    for (let k = 0; k < 21; k++) h.joints[k].copy(f.joints[k]);
    const j = f.joints;
    const palm = j[9].length() || 0.09;
    let curl = 0;
    for (const t of [8, 12, 16, 20]) curl += j[t].length() / palm;
    curl /= 4;
    h.fist = THREE.MathUtils.clamp((1.75 - curl) / 0.6, 0, 1);
    const across = j[5].clone().sub(j[17]).normalize();
    const up = j[9].clone().normalize();
    h.up.lerp(up, 0.6).normalize();
    // in a sword grip the blade continues the line from the little finger to the index knuckle
    const dir = across.addScaledVector(up, 0.25).normalize();
    h.dir.lerp(dir, 0.55).normalize();
  }

  drawPreview(cv) {
    const g = cv.getContext('2d');
    const w = cv.width, hgt = cv.height;
    g.save();
    if (this.mode === 'pc') { g.translate(w, 0); g.scale(-1, 1); }
    if (this.video.readyState >= 2) g.drawImage(this.video, 0, 0, w, hgt);
    else { g.fillStyle = '#111'; g.fillRect(0, 0, w, hgt); }
    const r = this.lastResult;
    if (r && r.landmarks) {
      for (const l of r.landmarks) {
        g.fillStyle = '#ffcc33';
        for (const p of l) { g.beginPath(); g.arc(p.x * w, p.y * hgt, 3, 0, 7); g.fill(); }
      }
    }
    g.restore();
  }
}

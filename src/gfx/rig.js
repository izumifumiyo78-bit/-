// ---------------------------------------------------------------------------
// rig.js : procedural animation for a footballer. No clips, no mocap, no
// skeleton files -- joint positions are solved every frame from the state the
// simulation already tracks (speed, gait phase, lean, kick timer, dive).
//
// The important part is the feet: a scripted foot trajectory (planted during
// stance, arcing during swing) with two-bone IK up to the knee. That is what
// removes the "skating mannequin" look that kills procedural characters.
//
// Joint layout (flat Float32Array, 3 floats each, world space, Z up):
//   0 pelvis   1 chest    2 neck    3 crown
//   4 shL      5 elbL     6 wriL    7 fingL
//   8 shR      9 elbR    10 wriR   11 fingR
//  12 hipL    13 kneeL   14 ankL   15 toeL
//  16 hipR    17 kneeR   18 ankR   19 toeR
// ---------------------------------------------------------------------------
import { clamp, clamp01, lerp, TAU } from '../core/util.js';
import { PLAY } from '../core/config.js';

export const J = {
  pelvis: 0, chest: 1, neck: 2, crown: 3,
  shL: 4, elbL: 5, wriL: 6, fingL: 7,
  shR: 8, elbR: 9, wriR: 10, fingR: 11,
  hipL: 12, kneeL: 13, ankL: 14, toeL: 15,
  hipR: 16, kneeR: 17, ankR: 18, toeR: 19,
  COUNT: 20,
};

// Body proportions, in metres, for a 1.82 m footballer.
export const BODY = {
  hipH: 0.925, spine: 0.465, neck: 0.115, head: 0.135,
  shoulder: 0.186, hip: 0.105,
  upperArm: 0.295, foreArm: 0.265, hand: 0.085,
  thigh: 0.455, shin: 0.425, foot: 0.235,
};

/** Two-bone IK in a plane: given root, target and bone lengths, find the knee.
 *  `bendX/bendZ` is the preferred bend direction (knee forward). */
function solveIK(rx, ry, rz, tx, ty, tz, l1, l2, bx, by, bz, out) {
  let dx = tx - rx, dy = ty - ry, dz = tz - rz;
  let d = Math.hypot(dx, dy, dz);
  const maxD = (l1 + l2) * 0.998;
  if (d > maxD) { const k = maxD / d; dx *= k; dy *= k; dz *= k; d = maxD; }
  if (d < 1e-4) { d = 1e-4; dz = -d; }
  const ux = dx / d, uy = dy / d, uz = dz / d;
  // distance from root to the knee's projection on the root->target axis
  const a = clamp((d * d + l1 * l1 - l2 * l2) / (2 * d), -l1, l1);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  // bend direction, orthogonalised against the limb axis
  let px = bx - ux * (bx * ux + by * uy + bz * uz);
  let py = by - uy * (bx * ux + by * uy + bz * uz);
  let pz = bz - uz * (bx * ux + by * uy + bz * uz);
  const pl = Math.hypot(px, py, pz);
  if (pl < 1e-5) { px = -uz; py = 0; pz = ux; }
  else { px /= pl; py /= pl; pz /= pl; }
  out[0] = rx + ux * a + px * h;
  out[1] = ry + uy * a + py * h;
  out[2] = rz + uz * a + pz * h;
  return out;
}

const ik = [0, 0, 0];

/**
 * Fill `out` (Float32Array(60)) with the player's joints, and return a small
 * record of extra orientation the renderer needs.
 */
export function poseOf(p, t, out, info) {
  const sp = p.speed || 0;
  const stride = clamp01(sp / 7.4);
  const sprint = p.sprint ? 1 : 0;
  const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
  const lx = -fy, ly = fx;                 // player's left
  const ph = p.animPhase;

  // --- posture ------------------------------------------------------------
  let hipH = BODY.hipH;
  let lean = 0.07 + stride * 0.21 + sprint * 0.05;   // forward pitch, radians
  let roll = p.lean * 0.8;
  let twist = -p.lean * 0.5;
  let crouch = 0;
  let bodyX = 0, bodyY = 0;                // body offset from the ground point
  let armMode = 0;                         // 0 run, 1 up, 2 forward, 3 back
  let stateMix = 0;                        // 1 = fully in a special pose

  const st = p.state;
  const kick = p.kickAnim > 0 ? clamp01(1 - p.kickAnim / 0.26) : -1;

  if (st === 'slide') {
    const u = clamp01(p.stateT / PLAY.slideTime);
    stateMix = Math.min(1, u * 6);
    hipH = lerp(BODY.hipH, 0.30, stateMix);
    lean = lerp(lean, -0.95, stateMix);
    armMode = 3;
  } else if (st === 'dive') {
    const u = clamp01(p.stateT / PLAY.gkDiveTime);
    stateMix = Math.min(1, u * 5);
    const arc = Math.sin(Math.PI * Math.min(u * 1.15, 1));
    hipH = lerp(BODY.hipH, 0.42 + arc * 0.62, stateMix);
    lean = lerp(lean, -0.15, stateMix);
    // the keeper's body rolls over toward the dive side
    const side = Math.sin(p.diveDir - p.facing);
    roll = lerp(roll, clamp(side, -1, 1) * 1.25, stateMix);
    armMode = 2;
  } else if (st === 'getup') {
    const u = clamp01(p.stateT / 0.55);
    crouch = (1 - u) * 0.42;
    hipH -= crouch;
    lean += (1 - u) * 0.5;
    armMode = 3;
  } else if (st === 'stunned') {
    hipH -= 0.12;
    lean += 0.45;
    armMode = 3;
  } else if (st === 'celebrate') {
    const hop = Math.max(0, Math.sin(p.stateT * 7.2));
    hipH += hop * 0.18;
    lean -= 0.12;
    armMode = 1;
  }

  // vertical bob of the pelvis through the gait, lowest at mid-stance
  const bob = st === 'run' ? -0.016 + Math.cos(ph * 2) * 0.020 * (0.3 + stride) : 0;
  const pelZ = hipH + bob;

  // --- spine --------------------------------------------------------------
  const cl = Math.cos(lean), sl = Math.sin(lean);
  // spine axis: tilted forward by `lean`, rolled by `roll`
  const spX = fx * sl + lx * Math.sin(roll) * 0.9;
  const spY = fy * sl + ly * Math.sin(roll) * 0.9;
  const spZ = cl * Math.cos(roll * 0.6);
  const sLen = Math.hypot(spX, spY, spZ) || 1;
  const sx = spX / sLen, sy = spY / sLen, sz = spZ / sLen;

  const px = p.x + bodyX, py = p.y + bodyY;
  const set = (i, x, y, z) => { out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z; };

  set(J.pelvis, px, py, pelZ);
  const chX = px + sx * BODY.spine, chY = py + sy * BODY.spine, chZ = pelZ + sz * BODY.spine;
  set(J.chest, chX, chY, chZ);
  // the head stays more upright than the torso: counter-rotate a little
  const hLean = lean * 0.35;
  const hx = fx * Math.sin(hLean), hy = fy * Math.sin(hLean), hz = Math.cos(hLean);
  const nkX = chX + hx * BODY.neck, nkY = chY + hy * BODY.neck, nkZ = chZ + hz * BODY.neck;
  set(J.neck, nkX, nkY, nkZ);
  set(J.crown, nkX + hx * BODY.head, nkY + hy * BODY.head, nkZ + hz * BODY.head);

  // --- legs ---------------------------------------------------------------
  // Shoulders/hips sit either side of the spine, in the body's left direction.
  const shoulderAxisX = lx * Math.cos(twist) + fx * Math.sin(twist);
  const shoulderAxisY = ly * Math.cos(twist) + fy * Math.sin(twist);
  const hipAxisX = lx * Math.cos(-twist * 0.6) + fx * Math.sin(-twist * 0.6);
  const hipAxisY = ly * Math.cos(-twist * 0.6) + fy * Math.sin(-twist * 0.6);

  for (let side = 0; side < 2; side++) {
    const s = side === 0 ? 1 : -1;          // +1 = left
    const hipX = px + hipAxisX * BODY.hip * s;
    const hipY = py + hipAxisY * BODY.hip * s;
    const hipZ = pelZ - 0.015;
    set(side === 0 ? J.hipL : J.hipR, hipX, hipY, hipZ);

    // --- foot target ---
    const legPh = (ph + (side === 0 ? 0 : Math.PI)) % TAU;
    const u = legPh / TAU;                  // 0..1 through this leg's cycle
    const strideLen = 0.42 + stride * 0.95 + sprint * 0.12;
    let along, up2;
    const DUTY = 0.58;
    if (u < DUTY) {                         // stance: planted, sliding back
      const k = u / DUTY;
      along = lerp(strideLen * 0.5, -strideLen * 0.45, k);
      up2 = 0.058 + Math.sin(Math.PI * k) * 0.006;
    } else {                                // swing: lifts and reaches forward
      const k = (u - DUTY) / (1 - DUTY);
      const e = k * k * (3 - 2 * k);
      along = lerp(-strideLen * 0.45, strideLen * 0.5, e);
      up2 = 0.058 + Math.sin(Math.PI * k) * (0.085 + stride * 0.17);
    }
    if (sp < 0.35) { along *= 0.12; up2 = 0.058; }   // standing still

    let footX = hipX + fx * along;
    let footY = hipY + fy * along;
    let footZ = up2;
    let footDir = 0;                        // extra toe pitch

    // --- kicking leg override ---
    const kicking = kick >= 0 && ((p.kickFoot >= 0) === (side === 1));
    if (kicking) {
      const k = kick;
      // back swing -> strike -> follow through
      const swing = k < 0.34 ? lerp(0.0, -0.62, k / 0.34)
        : k < 0.62 ? lerp(-0.62, 0.78, (k - 0.34) / 0.28)
          : lerp(0.78, 0.30, (k - 0.62) / 0.38);
      const lift = k < 0.34 ? 0.10 + k * 0.5
        : k < 0.62 ? 0.22 + Math.sin((k - 0.34) / 0.28 * Math.PI) * 0.28
          : 0.42 - (k - 0.62) * 0.6;
      footX = hipX + fx * swing;
      footY = hipY + fy * swing;
      footZ = Math.max(0.055, lift);
      footDir = swing * 0.5;
    }

    if (st === 'slide') {
      // legs scythe forward, one tucked under the body
      const ext = side === 0 ? 1.0 : 0.45;
      footX = px + fx * (0.55 + ext * 0.5);
      footY = py + fy * (0.55 + ext * 0.5) + lx * 0.12 * s;
      footZ = lerp(footZ, 0.09 + (1 - ext) * 0.18, stateMix);
    } else if (st === 'dive') {
      const ext = side === 0 ? 0.9 : 0.55;
      footX = px - fx * 0.15 + lx * ext * 0.35 * s;
      footY = py - fy * 0.15 + ly * ext * 0.35 * s;
      footZ = lerp(footZ, pelZ - 0.25, stateMix * 0.8);
    } else if (st === 'celebrate') {
      footX = hipX + fx * (side === 0 ? 0.2 : -0.2);
      footY = hipY + fy * (side === 0 ? 0.2 : -0.2);
    }

    // --- knee by IK (bend forward) ---
    solveIK(hipX, hipY, hipZ, footX, footY, footZ, BODY.thigh, BODY.shin,
      fx, fy, 0.12, ik);
    set(side === 0 ? J.kneeL : J.kneeR, ik[0], ik[1], ik[2]);
    set(side === 0 ? J.ankL : J.ankR, footX, footY, footZ);
    // toe points along the body's forward, pitched by the gait
    const toePitch = clamp(footDir + (footZ - 0.058) * 1.2, -0.5, 0.9);
    set(side === 0 ? J.toeL : J.toeR,
      footX + fx * BODY.foot * Math.cos(toePitch),
      footY + fy * BODY.foot * Math.cos(toePitch),
      footZ + Math.sin(toePitch) * BODY.foot * 0.5);
  }

  // --- arms ---------------------------------------------------------------
  for (let side = 0; side < 2; side++) {
    const s = side === 0 ? 1 : -1;
    const shX = chX + shoulderAxisX * BODY.shoulder * s;
    const shY = chY + shoulderAxisY * BODY.shoulder * s;
    const shZ = chZ + 0.055;
    set(side === 0 ? J.shL : J.shR, shX, shY, shZ);

    let handX, handY, handZ;
    const swing = Math.sin(ph + (side === 0 ? Math.PI : 0)) * (0.22 + stride * 0.55);
    if (armMode === 1) {                       // arms up (celebration)
      const w = Math.sin(t * 6 + s) * 0.12;
      handX = shX - fx * 0.10 + lx * s * (0.30 + w);
      handY = shY - fy * 0.10 + ly * s * (0.30 + w);
      handZ = shZ + 0.62;
    } else if (armMode === 2) {                // reaching (keeper dive)
      const reach = 0.78;
      handX = shX + fx * 0.12 + lx * s * reach;
      handY = shY + fy * 0.12 + ly * s * reach;
      handZ = shZ + 0.30 + (s > 0 ? 0.1 : -0.05);
    } else if (armMode === 3) {                // braced back
      handX = shX - fx * 0.34 + lx * s * 0.26;
      handY = shY - fy * 0.34 + ly * s * 0.26;
      handZ = shZ - 0.42;
    } else {                                   // running swing
      // A footballer's hands travel in front of the hips with the elbows bent
      // near a right angle -- never out at the sides, which is what an
      // unconstrained two-bone solve wants to do.
      const bal = p.hasBall ? 0.7 : 1.0;
      // standing still the arms hang; at pace they come up and drive
      // Standing, the arm is near full extension so it hangs straight down;
      // at pace it shortens, which is what folds the elbow.
      const reach = 0.03 + 0.14 * stride + swing * 0.42 * bal;
      handX = shX + fx * reach + lx * s * (0.03 + stride * 0.03);
      handY = shY + fy * reach + ly * s * (0.03 + stride * 0.03);
      handZ = shZ - 0.555 + stride * 0.13 + Math.abs(swing) * 0.09;
    }
    // elbows fold back and down, never up or out
    solveIK(shX, shY, shZ, handX, handY, handZ, BODY.upperArm, BODY.foreArm,
      -fx * 0.80 + lx * s * 0.22, -fy * 0.80 + ly * s * 0.22, -0.45, ik);
    set(side === 0 ? J.elbL : J.elbR, ik[0], ik[1], ik[2]);
    set(side === 0 ? J.wriL : J.wriR, handX, handY, handZ);
    const dx = handX - ik[0], dy = handY - ik[1], dz = handZ - ik[2];
    const dl = Math.hypot(dx, dy, dz) || 1;
    set(side === 0 ? J.fingL : J.fingR,
      handX + dx / dl * BODY.hand, handY + dy / dl * BODY.hand, handZ + dz / dl * BODY.hand);
  }

  if (info) {
    info.fx = fx; info.fy = fy;
    info.lean = lean; info.roll = roll;
    info.spine = [sx, sy, sz];
    info.stride = stride;
    info.airborne = st === 'dive' ? 1 : 0;
    info.contact = st === 'run' && sp > 0.4 ? 1 : 0;
  }
  return out;
}

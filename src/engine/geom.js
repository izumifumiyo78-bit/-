// ---------------------------------------------------------------------------
// geom.js : pitch constants and frame conversions shared by the engine.
// x runs along the pitch (-52.5 .. 52.5), y across it (-34 .. 34).
// A team with side = +1 attacks toward +x. In a team's attacking frame
// nx = 0 is its own goal line and 1 the opponent's, ny < 0 is its left.
// ---------------------------------------------------------------------------
export const HL = 52.5;
export const HW = 34;
export const LEN = 105;
export const GOAL_HALF = 3.66;
export const GOAL_H = 2.44;
export const BOX_D = 16.5;
export const BOX_HW = 20.16;
export const SIX_D = 5.5;
export const SIX_HW = 9.16;
export const PEN_SPOT = 11;
export const G = 9.81;
export const DT = 0.1;

export const toWX = (side, nx) => (nx * LEN - HL) * side;
export const toWY = (side, ny) => -ny * HW * side;
export const frameNX = (side, x) => (x * side + HL) / LEN;
export const frameNY = (side, y) => (-y * side) / HW;
/** distance of x from the given team's own goal line, in metres */
export const depthFromOwn = (side, x) => x * side + HL;
export const oppGoalX = (side) => HL * side;
export const ownGoalX = (side) => -HL * side;

export function inPitch(x, y) { return Math.abs(x) <= HL && Math.abs(y) <= HW; }

/** Goal-angle-aware expected goals for a shot from (x,y) at the goal on x = gx. */
export function shotXG(x, y, gx, opts = {}) {
  const dx = Math.abs(gx - x), dy = Math.abs(y);
  const d = Math.hypot(dx, dy);
  const a1 = Math.atan2(dy - GOAL_HALF, dx), a2 = Math.atan2(dy + GOAL_HALF, dx);
  const ang = Math.max(0.0001, Math.abs(a2 - a1));
  const angN = Math.min(1.4, ang / 0.643);
  let xg = 1.05 * Math.exp(-0.135 * d) * (0.3 + 0.7 * angN);
  if (opts.header) xg *= 0.5;
  if (opts.volley) xg *= 0.8;
  if (opts.oneOnOne) xg *= 1.45;
  if (opts.pressure) xg *= 1 - Math.min(0.55, opts.pressure * 0.45);
  if (opts.weak) xg *= 0.86;
  return Math.max(0.005, Math.min(0.85, xg));
}

/**
 * Expected threat of having the ball at (nx, ny) in an attacking frame.
 * Smooth approximation of the classic xT surface.
 */
export function xT(nx, ny) {
  const ax = nx * LEN, ay = Math.abs(ny) * HW;
  const dGoal = Math.hypot(LEN - ax, ay);
  const central = Math.max(0, 1 - Math.max(0, ay - 9) / 26);
  return 0.006 + 0.05 * nx * nx * nx + 0.36 * Math.exp(-dGoal / 8.5) * (0.35 + 0.65 * central);
}

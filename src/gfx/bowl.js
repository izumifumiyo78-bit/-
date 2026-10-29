// ---------------------------------------------------------------------------
// bowl.js : the parametric shape of the stadium.
//
// One rounded-rectangle sweep around the pitch, one step profile outward and
// upward. Both the stand geometry and the 24,000 spectators are generated from
// these two functions, which is what keeps every person sitting exactly on a
// seat instead of floating in front of one.
// ---------------------------------------------------------------------------
import { PITCH } from '../core/config.js';

export const BOWL = {
  innerX: PITCH.halfL + PITCH.runOffX + 5.0,    // 66.0
  innerY: PITCH.halfW + PITCH.runOffY + 4.6,    // 46.1
  corner: 19.0,                                  // corner arc radius
  moat: 3.2,                                     // flat area before row 1
  base: 1.25,                                    // height of the pitch wall
  lower: { rows: 21, tread: 0.82, riser: 0.42 },
  concourse: { depth: 4.2, rise: 1.1 },
  upper: { rows: 24, tread: 0.80, riser: 0.56 },
  backWall: 5.0,
  seatPitch: 0.54,
};

/** Rounded-rect perimeter, parameterised by normalised arc length. */
export function makePerimeter() {
  const { innerX: X, innerY: Y, corner: R } = BOWL;
  const sx = X - R, sy = Y - R;                 // straight half-lengths
  const quarter = Math.PI * 0.5 * R;
  const segs = [
    { len: 2 * sy, kind: 'x+' },                // right side (x = +X)
    { len: quarter, kind: 'c1' },               // corner +x+y
    { len: 2 * sx, kind: 'y+' },
    { len: quarter, kind: 'c2' },
    { len: 2 * sy, kind: 'x-' },
    { len: quarter, kind: 'c3' },
    { len: 2 * sx, kind: 'y-' },
    { len: quarter, kind: 'c4' },
  ];
  const total = segs.reduce((a, s) => a + s.len, 0);
  return {
    total,
    /** t in [0,1) -> { x, y, nx, ny } where n is the outward normal. */
    at(t, out = {}) {
      let d = ((t % 1) + 1) % 1 * total;
      for (const s of segs) {
        if (d > s.len) { d -= s.len; continue; }
        const f = d / s.len;
        switch (s.kind) {
          case 'x+': out.x = X; out.y = -sy + 2 * sy * f; out.nx = 1; out.ny = 0; break;
          case 'x-': out.x = -X; out.y = sy - 2 * sy * f; out.nx = -1; out.ny = 0; break;
          case 'y+': out.x = sx - 2 * sx * f; out.y = Y; out.nx = 0; out.ny = 1; break;
          case 'y-': out.x = -sx + 2 * sx * f; out.y = -Y; out.nx = 0; out.ny = -1; break;
          default: {
            const a = f * Math.PI * 0.5;
            const sgn = s.kind === 'c1' ? [1, 1] : s.kind === 'c2' ? [-1, 1]
              : s.kind === 'c3' ? [-1, -1] : [1, -1];
            // c1 goes from (+X, sy) to (sx, +Y)
            const ang = s.kind === 'c1' ? a : s.kind === 'c2' ? a + Math.PI * 0.5
              : s.kind === 'c3' ? a + Math.PI : a + Math.PI * 1.5;
            const cx = sgn[0] * sx, cy = sgn[1] * sy;
            const nx = Math.cos(ang), ny = Math.sin(ang);
            out.x = cx + nx * R; out.y = cy + ny * R;
            out.nx = nx; out.ny = ny;
            break;
          }
        }
        return out;
      }
      out.x = X; out.y = 0; out.nx = 1; out.ny = 0;
      return out;
    },
  };
}

/**
 * The step profile, outward (u) and upward (v).
 * `tier` is 0 for the lower bowl, 1 for the upper, -1 for structure.
 */
export function makeProfile() {
  const p = [];
  const push = (u, v, tier, row, face) => p.push({ u, v, tier, row, face });
  push(0, 0, -1, -1, 'wall');
  push(0, BOWL.base, -1, -1, 'wall');
  let u = BOWL.moat, v = BOWL.base;
  push(u, v, -1, -1, 'tread');
  for (let r = 0; r < BOWL.lower.rows; r++) {
    push(u, v + BOWL.lower.riser, 0, r, 'riser');
    v += BOWL.lower.riser;
    push(u + BOWL.lower.tread, v, 0, r, 'tread');
    u += BOWL.lower.tread;
  }
  push(u + BOWL.concourse.depth, v + BOWL.concourse.rise, -1, -1, 'tread');
  u += BOWL.concourse.depth; v += BOWL.concourse.rise;
  push(u, v + 2.4, -1, -1, 'riser');      // the back of the lower tier
  v += 2.4;
  for (let r = 0; r < BOWL.upper.rows; r++) {
    push(u, v + BOWL.upper.riser, 1, r, 'riser');
    v += BOWL.upper.riser;
    push(u + BOWL.upper.tread, v, 1, r, 'tread');
    u += BOWL.upper.tread;
  }
  push(u, v + BOWL.backWall, -1, -1, 'riser');
  push(u + 1.6, v + BOWL.backWall, -1, -1, 'tread');
  return p;
}

/** Seat rows as world positions, for the crowd. */
export function seatRows() {
  const prof = makeProfile();
  const rows = [];
  for (let i = 0; i < prof.length; i++) {
    const s = prof[i];
    if (s.face !== 'tread' || s.tier < 0) continue;
    rows.push({ u: s.u - 0.34, v: s.v, tier: s.tier, row: s.row });
  }
  return rows;
}

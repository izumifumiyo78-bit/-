// Precise checks on what the human player's buttons actually do.
import { createWorld, stepWorld, setUserPlayer } from '../src/sim/match.js';
import { SIM, PITCH } from '../src/core/config.js';
import { placeBall } from '../src/sim/ball.js';
import { takeControl } from '../src/sim/actions.js';

function fresh(opts = {}) {
  const w = createWorld({ home: 'AUR', away: 'IRO', halfMinutes: 4,
    difficulty: opts.difficulty || 'pro', seed: opts.seed || 42 });
  w.phase = 'play'; w.restart = null; w.outGrace = 0;
  w.diff.assist = opts.assist === undefined ? 0.6 : opts.assist;
  return w;
}
function give(w, p, x, y) {
  p.x = x; p.y = y; p.vx = p.vy = 0; p.facing = w.teams[p.team].side > 0 ? 0 : Math.PI;
  placeBall(w.ball, x + Math.cos(p.facing) * 0.4, y);
  takeControl(w, p);
  setUserPlayer(w, p);
}
function run(w, frames, cmd) {
  for (let i = 0; i < frames; i++) { Object.assign(w.cmd, cmd); stepWorld(w, SIM.dt); }
}
const clearCmd = { mx: 0, my: 0, sprint: false, shoot: false, pass: false, through: false, tackle: false, switchBtn: false };

// ── 1. shooting ────────────────────────────────────────────────────────────
console.log('--- unmarked shots (hold 0.5s) ---');
for (const [range, hold] of [[8, 16], [14, 24], [18, 30], [26, 42]]) {
  let saved = 0, goals = 0, wide = 0, speeds = [];
  const N = 48;
  for (let t = 0; t < N; t++) {
    const w = fresh({ seed: 100 + t + range * 31, assist: 0.6 });
    const st = w.teams[0].players[9];
    for (const q of w.teams[1].players) if (!q.isGK) { q.x = -40; q.y = 30; }
    give(w, st, 52.5 - range, (t % 5 - 2) * 2.5);
    run(w, hold, { ...clearCmd, shoot: true, mx: 1, my: 0 });
    run(w, 2, { ...clearCmd, mx: 1 });
    speeds.push(Math.hypot(w.ball.vx, w.ball.vy, w.ball.vz));
    let hit = false;
    const sv0 = w.teams[1].stats.saves;
    for (let i = 0; i < 150; i++) {
      stepWorld(w, SIM.dt);
      if (w.phase === 'goal') { goals++; hit = true; break; }
      if (w.phase === 'deadball') break;
    }
    if (!hit) { if (w.teams[1].stats.saves > sv0) saved++; else wide++; }
  }
  console.log(`  ${range}m: goals ${goals}/${N} (${Math.round(goals / N * 100)}%)  saved ${saved}  off-target ${wide}  v0 ${(speeds.reduce((a, b) => a + b, 0) / N).toFixed(0)} m/s`);
}

// ── 2. passing accuracy by assist level ───────────────────────────────────
console.log('--- 15m pass to a marked team-mate ---');
for (const assist of [0.25, 0.6, 1.0]) {
  let ok = 0, n = 24;
  for (let t = 0; t < n; t++) {
    const w = fresh({ seed: 500 + t, assist });
    const cm = w.teams[0].players[6];
    const src = w.teams[0].players[5];
    cm.x = 5; cm.y = 9; cm.vx = cm.vy = 0;
    give(w, src, -6, 2);
    // a defender loosely goal-side of the receiver
    w.teams[1].players[6].x = 9; w.teams[1].players[6].y = 11;
    const dx = cm.x - src.x, dy = cm.y - src.y, d = Math.hypot(dx, dy);
    run(w, 12, { ...clearCmd, pass: true, mx: dx / d, my: dy / d });
    run(w, 2, { ...clearCmd, mx: dx / d, my: dy / d });
    for (let i = 0; i < 110; i++) {
      stepWorld(w, SIM.dt);
      if (w.carrier) break;
    }
    if (w.carrier && w.carrier.team === 0 && w.carrier !== src) ok++;
  }
  console.log(`  assist ${assist}: completed ${ok}/${n} (${Math.round(ok / n * 100)}%)`);
}

// ── 3. through ball ───────────────────────────────────────────────────────
{
  let ok = 0, n = 16;
  for (let t = 0; t < n; t++) {
    const w = fresh({ seed: 900 + t, assist: 0.8 });
    const src = w.teams[0].players[7];
    const run1 = w.teams[0].players[9];
    give(w, src, 5, 0);
    run1.x = 22; run1.y = 6; run1.vx = 6; run1.vy = 0;
    run(w, 4, { ...clearCmd, through: true, mx: 1, my: 0.2 });
    run(w, 2, { ...clearCmd, mx: 1 });
    for (let i = 0; i < 160; i++) { stepWorld(w, SIM.dt); if (w.carrier) break; }
    if (w.carrier && w.carrier.team === 0 && w.carrier !== src) ok++;
  }
  console.log(`--- through ball: reached a team-mate ${ok}/${n}`);
}

// ── 4. tackling ───────────────────────────────────────────────────────────
{
  let won = 0, fouls = 0, n = 30;
  for (let t = 0; t < n; t++) {
    const w = fresh({ seed: 1300 + t });
    const atk = w.teams[1].players[9];
    const def = w.teams[0].players[2];
    give(w, atk, 0, 0);
    atk.user = false;
    def.x = -1.4; def.y = 0.3; setUserPlayer(w, def);
    run(w, 8, { ...clearCmd, shoot: true, mx: 1 });
    if (w.carrier && w.carrier.team === 0) won++;
    if (w.phase === 'deadball' && w.restart && w.restart.kind !== 'kickoff') fouls++;
  }
  console.log(`--- standing tackle: won ${won}/${n}, fouls ${fouls}/${n}`);
}

// ── 5. player switching ───────────────────────────────────────────────────
{
  const w = fresh({ seed: 7 });
  const before = w.user.player;
  run(w, 3, { ...clearCmd, switchBtn: true });
  run(w, 3, clearCmd);
  console.log(`--- switch: ${before ? '#' + before.shirt : 'none'} -> #${w.user.player.shirt} (${before !== w.user.player ? 'changed' : 'SAME'})`);
}

// Every restart must resolve, put the ball back in play, and not loop.
import { createWorld, stepWorld, beginRestart } from '../src/sim/match.js';
import { SIM, PITCH } from '../src/core/config.js';

const kinds = [
  { kind: 'kickoff', team: 0 },
  { kind: 'throwin', team: 1, x: 12, y: 34.2 },
  { kind: 'throwin', team: 0, x: -30, y: -34.2 },
  { kind: 'corner', team: 0, x: 52.3, y: 33.8 },
  { kind: 'corner', team: 1, x: -52.3, y: -33.8 },
  { kind: 'goalkick', team: 1, x: 47, y: 5 },
  { kind: 'freekick', team: 0, x: 30, y: -8 },
  { kind: 'freekick', team: 0, x: -20, y: 14 },
  { kind: 'penalty', team: 0, x: 41.5, y: 0 },
  { kind: 'penalty', team: 1, x: -41.5, y: 0 },
];

let bad = 0;
for (const r of kinds) {
  for (const user of [false, true]) {
    const w = createWorld({ home: 'AUR', away: 'IRO', halfMinutes: 4,
      difficulty: 'pro', noUser: !user, seed: 2024 });
    w.played = 1;
    beginRestart(w, r);
    let frames = 0, played = false, outcome = '';
    while (frames < 60 * 25) {
      stepWorld(w, SIM.dt);
      frames++;
      if (w.phase === 'play') { played = true; break; }
      if (w.phase === 'goal') { played = true; outcome = ' GOAL'; break; }
    }
    // then make sure play continues for a few seconds without an instant restart loop
    let restarts = 0, lastPhase = w.phase;
    for (let i = 0; i < 60 * 8; i++) {
      stepWorld(w, SIM.dt);
      if (w.phase === 'deadball' && lastPhase !== 'deadball') restarts++;
      lastPhase = w.phase;
    }
    const taker = w.restart && w.restart.taker;
    const ok = played && restarts < 6;
    if (!ok) bad++;
    console.log(`${(r.kind + (user ? ' [user]' : ' [ai]  ')).padEnd(22)} ` +
      `resolved in ${(frames / 60).toFixed(1)}s${outcome}  restarts/8s ${restarts}  ${ok ? 'ok' : 'FAIL'}`);
  }
}
console.log(bad === 0 ? '\nall set pieces ok' : `\n${bad} FAILURES`);
process.exit(bad ? 1 : 0);

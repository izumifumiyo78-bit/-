// Headless match simulation: validates the engine end to end without a canvas.
import { createWorld, stepWorld, displayClock } from '../src/sim/match.js';
import { TEAMS } from '../src/data/teams.js';
import { SIM } from '../src/core/config.js';

const args = process.argv.slice(2);
const halves = Number(args[0] || 4);
const games = Number(args[1] || 1);
const diff = args[2] || 'pro';
const verbose = args.includes('-v');

let agg = { goals: 0, shots: 0, fouls: 0, offsides: 0, corners: 0, cards: 0,
  saves: 0, passes: 0, passOk: 0, phase: {}, maxStall: 0 };

for (let g = 0; g < games; g++) {
  const home = TEAMS[(g * 3) % TEAMS.length].id;
  const away = TEAMS[(g * 5 + 1) % TEAMS.length].id;
  const w = createWorld({ home, away, halfMinutes: halves, difficulty: diff,
    noUser: true, seed: 1234 + g * 77 });
  let steps = 0, stall = 0, maxStall = 0;
  const log = [];
  const t0 = Date.now();
  while (w.phase !== 'fulltime' && steps < halves * 120 * 60 * 3) {
    stepWorld(w, SIM.dt);
    steps++;
    agg.phase[w.phase] = (agg.phase[w.phase] || 0) + 1;
    if (w.phase === 'play') { stall = 0; } else { stall++; maxStall = Math.max(maxStall, stall); }
    for (const e of w.events) {
      if (e.name === 'goal') log.push(`${displayClock(w)} GOAL ${w.teams[e.data.team].club.abbr} ${e.data.scorer ? '#' + e.data.scorer.shirt + ' ' + e.data.scorer.name : ''}${e.data.ownGoal ? ' (OG)' : ''}`);
      if (e.name === 'card') log.push(`${displayClock(w)} ${e.data.kind.toUpperCase()} #${e.data.p.shirt}`);
    }
  }
  const ms = Date.now() - t0;
  const [A, B] = w.teams;
  const poss = A.stats.possSec / Math.max(0.01, A.stats.possSec + B.stats.possSec);
  agg.goals += A.score + B.score;
  agg.shots += A.stats.shots + B.stats.shots;
  agg.fouls += A.stats.fouls + B.stats.fouls;
  agg.offsides += A.stats.offsides + B.stats.offsides;
  agg.cards += A.stats.yellow + B.stats.yellow + A.stats.red + B.stats.red;
  agg.saves += A.stats.saves + B.stats.saves;
  agg.passes += A.stats.passes + B.stats.passes;
  agg.passOk += A.stats.passOk + B.stats.passOk;
  agg.maxStall = Math.max(agg.maxStall, maxStall);
  console.log(`#${g} ${A.club.abbr} ${A.score}-${B.score} ${B.club.abbr}  ` +
    `shots ${A.stats.shots}/${B.stats.shots} poss ${(poss * 100).toFixed(0)}% ` +
    `fouls ${A.stats.fouls}/${B.stats.fouls} off ${A.stats.offsides}/${B.stats.offsides} ` +
    `saves ${A.stats.saves}/${B.stats.saves} pass ${A.stats.passOk}/${A.stats.passes} ` +
    `| ${steps} steps in ${ms}ms (${(steps / (ms / 1000) / 60).toFixed(1)}x realtime) stall ${(maxStall / 60).toFixed(1)}s`);
  if (verbose) log.forEach((l) => console.log('   ', l));
}
const tot = Object.values(agg.phase).reduce((a, b) => a + b, 0);
console.log('\nphase split:', Object.entries(agg.phase)
  .map(([k, v]) => `${k} ${(v / tot * 100).toFixed(1)}%`).join('  '));
console.log(`per game: goals ${(agg.goals / games).toFixed(1)} shots ${(agg.shots / games).toFixed(1)} ` +
  `fouls ${(agg.fouls / games).toFixed(1)} offsides ${(agg.offsides / games).toFixed(1)} ` +
  `cards ${(agg.cards / games).toFixed(1)} saves ${(agg.saves / games).toFixed(1)} ` +
  `passAcc ${(agg.passOk / Math.max(1, agg.passes) * 100).toFixed(0)}%  worst stall ${(agg.maxStall / 60).toFixed(1)}s`);

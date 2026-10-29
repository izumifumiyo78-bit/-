// ---------------------------------------------------------------------------
// tools/shot.mjs : headless screenshots + console/WebGL error capture.
//   node tools/shot.mjs [--tier 2] [--theme night] [--url http://...]
// Shots land in shots/.
// ---------------------------------------------------------------------------
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, BASE } from './launch.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const base = arg('url', BASE);
const tier = arg('tier', '2');
const themes = (arg('theme', 'night,dusk,day,rain')).split(',');
const outDir = arg('out', 'shots');
mkdirSync(outDir, { recursive: true });

const vw = Number(arg('w', 1280)), vh = Number(arg('h', 720));
const browser = await launch(['--force-device-scale-factor=1']);
const logs = [];
let bad = 0;

for (const theme of themes) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.setDefaultTimeout(180000);
  page.on('console', (m) => {
    const t = m.text();
    logs.push(`[${theme}][${m.type()}] ${t}`);
    if (/error|invalid|fail|undeclared|cannot|NaN/i.test(t) && m.type() !== 'warning') bad++;
  });
  page.on('pageerror', (e) => { logs.push(`[${theme}][pageerror] ${e.message}`); bad++; });
  const url = `${base}/?tier=${tier}&theme=${theme}&fps`;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/${theme}-menu.png`, timeout: 180000 });
  // kick off and let the match settle
  await page.evaluate((th) => window.__pitch26.start({ theme: th, halfMinutes: 2 }), theme);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${outDir}/${theme}-play.png`, timeout: 180000 });
  // run a while so players spread out, the ball moves and the turf gets chewed
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${outDir}/${theme}-play2.png`, timeout: 180000 });
  // --- close-ups, so the detail work can actually be judged -------------
  const shots = [
    ['closeup-player', { near: 'player', d: 5.2, h: 1.55, fovDeg: 34 }],
    ['closeup-ball', { near: 'ball', d: 1.5, h: 0.42, fovDeg: 30 }],
    ['closeup-goal', { near: 'goal', d: 13, h: 2.6, fovDeg: 42 }],
    ['closeup-turf', { near: 'ball', d: 2.6, h: 0.5, fovDeg: 52 }],
    ['wide-stadium', { near: 'wide', d: 95, h: 42, fovDeg: 44 }],
  ];
  for (const [name, cfg2] of shots) {
    await page.evaluate((c) => {
      const w = window.__pitch26.world;
      const b = w.ball;
      let tx = b.x, ty = b.y, tz = 0.4;
      if (c.near === 'player') {
        const p = w.players.reduce((best, q) => {
          const d = Math.hypot(q.x - b.x, q.y - b.y);
          return d < best.d ? { p: q, d } : best;
        }, { p: null, d: 1e9 });
        if (p.p) { tx = p.p.x; ty = p.p.y; tz = 1.0; }
      } else if (c.near === 'goal') {
        tx = 52.5 - 6; ty = 0; tz = 1.2;
      } else if (c.near === 'wide') {
        tx = 0; ty = 0; tz = 1;
      }
      const a = c.near === 'goal' ? 0.5 : 2.3;
      window.__pitch26.setCam({
        px: tx + Math.cos(a) * c.d, py: ty + Math.sin(a) * c.d, pz: c.h,
        tx, ty, tz, fovDeg: c.fovDeg,
      });
      window.__pitch26.freeze(true);
    }, cfg2);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${outDir}/${theme}-${name}.png`, timeout: 180000 });
  }
  await page.evaluate(() => { window.__pitch26.setCam(null); window.__pitch26.freeze(false); });

  const info = await page.evaluate(() => ({
    fps: window.__pitch26.fpsValue,
    tier: window.__pitch26.gfx ? window.__pitch26.gfx.tier : -1,
    scale: window.__pitch26.perf.scale,
    phase: window.__pitch26.world ? window.__pitch26.world.phase : '?',
    score: window.__pitch26.world ? window.__pitch26.world.teams.map((t) => t.score) : [],
    ball: window.__pitch26.world ? [
      +window.__pitch26.world.ball.x.toFixed(1),
      +window.__pitch26.world.ball.y.toFixed(1),
      +window.__pitch26.world.ball.z.toFixed(2)] : [],
  }));
  logs.push(`[${theme}] ${JSON.stringify(info)}`);
  await page.close();
}

await browser.close();
writeFileSync(`${outDir}/log.txt`, logs.join('\n'));
console.log(logs.join('\n'));
console.log(bad ? `\n!! ${bad} console errors` : '\nno console errors');
process.exit(bad ? 1 : 0);

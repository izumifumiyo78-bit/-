// Full-match end-to-end: user input, half time, result screen, offline launch.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = '/tmp/claude-0/-home-user--/d6e564b5-fc65-5b1a-bae9-81ec76d33564/scratchpad/shots';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctxp = await browser.newContext({ viewport: { width: 1024, height: 576 } });
const page = await ctxp.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.click('[data-go="setup"]');
await page.waitForTimeout(300);
// shortest match
await page.click('#lenList .chip');
await page.click('#kickoff');
await page.waitForTimeout(900);

// Scripted "player": chase the ball, sprint, pass/shoot near goal.
const log = await page.evaluate(async () => {
  const g = window.__pitch26;
  const out = { halves: [], events: [], userTouches: 0, userPasses: 0, userShots: 0, err: null };
  const w = g.world;
  let lastPhase = '';
  for (let step = 0; step < 60 * 60 * 9; step++) {
    const p = w.user.player;
    if (p) {
      const b = w.ball;
      const mine = w.carrier === p;
      const goalX = w.teams[w.userTeam].side * 52.5;
      let mx, my, cmd = {};
      if (mine) {
        const d = Math.hypot(goalX - p.x, 0 - p.y);
        mx = (goalX - p.x) / d; my = (0 - p.y) / d;
        if (d < 22 && Math.random() < 0.06) { cmd.shoot = true; out.userShots++; }
        else if (Math.random() < 0.02) { cmd.pass = true; out.userPasses++; }
        cmd.sprint = d > 30;
      } else {
        const d = Math.hypot(b.x - p.x, b.y - p.y) || 1;
        mx = (b.x - p.x) / d; my = (b.y - p.y) / d;
        cmd.sprint = d > 6;
        if (d < 2.2 && Math.random() < 0.08) cmd.shoot = true;   // tackle
      }
      g.setCmd({ mx, my, ...cmd });
      // release charged buttons next frame
      if (cmd.shoot || cmd.pass) { g.tick(2); g.setCmd({ shoot: false, pass: false }); }
    }
    g.tick(1);
    if (w.phase !== lastPhase) { out.events.push(`${w.played.toFixed(0)}s ${lastPhase}->${w.phase}`); lastPhase = w.phase; }
    if (w.phase === 'fulltime') break;
  }
  out.score = w.teams.map((t) => t.score);
  out.stats = w.teams.map((t) => ({ ab: t.club.abbr, sh: t.stats.shots, p: t.stats.passes,
    ok: t.stats.passOk, f: t.stats.fouls, off: t.stats.offsides, sv: t.stats.saves,
    poss: Math.round(t.stats.possSec) }));
  out.userPlayerStats = w.teams[w.userTeam].players.map((p) => p.stats.goals).reduce((a, b) => a + b, 0);
  out.half = w.half; out.phase = w.phase;
  return out;
});
console.log('phase transitions:', log.events.slice(0, 24).join(' | '));
console.log('score', log.score, 'half', log.half, 'phase', log.phase);
console.log('stats', JSON.stringify(log.stats));
console.log('user inputs: shots', log.userShots, 'passes', log.userPasses);
await page.waitForTimeout(2500);
const resultVisible = await page.isVisible('#s-result');
await page.screenshot({ path: `${OUT}/e2e-result.png` });
console.log('result screen visible:', resultVisible);

// ── offline launch ──────────────────────────────────────────────────────
await page.waitForTimeout(1200);
const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(() => true).catch(() => false));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await ctxp.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const offlineOk = await page.evaluate(() => !!(window.__pitch26 && document.getElementById('s-title')));
await page.screenshot({ path: `${OUT}/e2e-offline.png` });
console.log('service worker ready:', swReady, '| offline boot:', offlineOk);
console.log('errors:', errs.length ? errs.slice(0, 8) : 'none');
await browser.close();

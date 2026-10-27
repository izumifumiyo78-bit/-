// Captures a spread of game moments for visual review.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = '/tmp/claude-0/-home-user--/d6e564b5-fc65-5b1a-bae9-81ec76d33564/scratchpad/shots';
const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function shoot(w, h, tag, dsf = 1) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf,
    hasTouch: w < 1000, isMobile: w < 1000 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tag}-title.png` });
  await page.click('[data-go="setup"]'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-setup.png` });
  await page.click('#kickoff'); await page.waitForTimeout(1200);

  // fast-forward to an attacking phase near a box
  const found = await page.evaluate(async () => {
    const g = window.__pitch26;
    for (let i = 0; i < 400; i++) {
      g.tick(12);
      const w = g.world;
      if (Math.abs(w.ball.x) > 34 && w.phase === 'play') return { x: w.ball.x, t: w.played };
    }
    return null;
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${tag}-attack.png` });

  // stage a shot on goal so we can see the keeper, the net and the celebration
  await page.evaluate(() => {
    const g = window.__pitch26, w = g.world;
    const t = w.teams[0];
    const b = w.ball;
    b.x = 36 * t.side; b.y = 4; b.z = 0.2;
    b.vx = 26 * t.side; b.vy = -2.4; b.vz = 3.2; b.wz = 10;
    b.kickKind = 'shot'; b.lastTouchTeam = 0;
    b.lastTouch = t.players[9];
    w.carrier = null;
  });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/${tag}-shot.png` });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${tag}-after.png` });
  const st = await page.evaluate(() => ({ s: window.__pitch26.state, p: window.__pitch26.world.phase,
    sc: window.__pitch26.world.teams.map(t=>t.score).join('-') }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-replay.png` });
  console.log(tag, 'attack@', found && found.x.toFixed(1), 'state', JSON.stringify(st),
    'errors', errs.length ? errs.slice(0,4) : 'none');
  await page.close();
}

await shoot(1280, 720, 'desk');
await shoot(844, 390, 'phone');
await shoot(390, 844, 'port');
await browser.close();

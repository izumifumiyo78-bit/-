// Drives the real game in Chromium: screenshots, FPS and console errors.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = '/tmp/claude-0/-home-user--/d6e564b5-fc65-5b1a-bae9-81ec76d33564/scratchpad/shots';
const URL = 'http://127.0.0.1:8099/index.html?fps=1';
const size = (process.argv[2] || '1280x720').split('x').map(Number);

const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type()+': '+m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/01-title.png` });

await page.click('[data-go="setup"]');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-setup.png` });

await page.click('#kickoff');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/03-kickoff.png` });

// let the AI play a while and sample fps
const samples = [];
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1400);
  const s = await page.evaluate(() => {
    const g = window.__pitch26;
    return { fps: document.getElementById('fpsTag').textContent, phase: g.world.phase,
      score: g.world.teams.map(t=>t.score).join('-'), t: g.world.played.toFixed(1),
      ball: [g.world.ball.x.toFixed(1), g.world.ball.y.toFixed(1)].join(','),
      user: g.world.user.player ? g.world.user.player.shirt : null };
  });
  samples.push(s);
}
await page.screenshot({ path: `${OUT}/04-play.png` });

// drive the user player for a few seconds
await page.evaluate(() => { window.__pitch26.setCmd({ mx: 1, my: 0, sprint: true }); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/05-sprint.png` });
await page.evaluate(() => { window.__pitch26.setCmd({ mx: 0, my: 0, sprint: false }); });

// jump the clock near the end to check the result screen path
await page.waitForTimeout(1200);
const state = await page.evaluate(() => ({ state: window.__pitch26.state, phase: window.__pitch26.world.phase }));
console.log('samples:'); samples.forEach(s=>console.log('  ', JSON.stringify(s)));
console.log('state:', JSON.stringify(state));
console.log('errors:', errs.length ? errs.slice(0, 12) : 'none');
await browser.close();

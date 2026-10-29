// ---------------------------------------------------------------------------
// tools/e2e.mjs : drives a whole match through the real UI -- menu, kickoff,
// touch controls, half time, full time, result screen -- and then reloads
// offline to prove the service worker really serves the game.
//   node tools/e2e.mjs            (needs `npm run preview` on :4173)
// ---------------------------------------------------------------------------
import { launch, watch, BASE } from './launch.mjs';

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } });
const page = await ctx.newPage();
const errs = [];
watch(page, errs);
page.setDefaultTimeout(120000);

const step = (s) => console.log('  ' + s);

await page.goto(`${BASE}/?tier=0`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
step('loaded');

await page.click('[data-go="setup"]');
await page.waitForTimeout(400);
await page.click('#lenList .chip');          // shortest half
await page.click('#kickoff');
await page.waitForTimeout(2500);
step('kicked off');

let st = await page.evaluate(() => window.__pitch26.state);
if (st !== 'play') throw new Error('did not reach play state: ' + st);

// drive the user player for a few seconds through the real command path
for (let i = 0; i < 12; i++) {
  await page.evaluate((k) => window.__pitch26.setCmd({
    mx: Math.cos(k), my: Math.sin(k), sprint: true, pass: k % 3 === 0, shoot: k % 7 === 0,
  }), i);
  await page.waitForTimeout(250);
}
await page.evaluate(() => window.__pitch26.setCmd({ mx: 0, my: 0, sprint: false, pass: false, shoot: false }));
step('played a spell');

// fast-forward the simulation to full time
await page.evaluate(() => {
  const w = window.__pitch26.world;
  w.halfTime = 12; w.totalTime = 24;
});
const deadline = Date.now() + 90000;
while (Date.now() < deadline) {
  const s = await page.evaluate(() => window.__pitch26.state);
  if (s === 'result') break;
  await page.waitForTimeout(1000);
}
st = await page.evaluate(() => window.__pitch26.state);
if (st !== 'result') throw new Error('never reached full time (state ' + st + ')');
step('full time reached');

const score = await page.evaluate(() => document.getElementById('ftScore').textContent);
step('result: ' + score.replace(/\s+/g, ' ').trim());

// --- offline reload -------------------------------------------------------
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(2500);
const offlineOk = await page.evaluate(() => !!window.__pitch26 && !!document.getElementById('gl'));
step('offline reload: ' + (offlineOk ? 'ok' : 'FAILED'));
await ctx.setOffline(false);

await browser.close();
if (errs.length) { console.log('\nerrors:\n' + errs.join('\n')); process.exit(1); }
if (!offlineOk) process.exit(1);
console.log('\ne2e ok');

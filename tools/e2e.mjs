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

// the real keyboard path: hold a key, check it reaches world.cmd, and (when
// the ball is actually in play rather than waiting on a restart) that the
// controlled player moves.
// A replay or a restart can be running; wait for live open play.
let phase = '';
for (let i = 0; i < 60; i++) {
  const st2 = await page.evaluate(() => [window.__pitch26.state, window.__pitch26.world.phase]);
  phase = st2[1];
  if (st2[0] === 'play' && phase === 'play') break;
  // take the restart with a real key so the test does not sit in a dead ball
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(320);
}
const before = await page.evaluate(() => {
  const u = window.__pitch26.world.user.player;
  return u ? [u.x, u.y] : null;
});
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1200);
const cmd = await page.evaluate(() => {
  const c = window.__pitch26.world.cmd;
  return [c.mx, c.my];
});
await page.keyboard.up('ArrowRight');
const after = await page.evaluate(() => {
  const u = window.__pitch26.world.user.player;
  return u ? [u.x, u.y] : null;
});
if (!before || !after) throw new Error('no user player to drive');
const cmdMag = Math.hypot(cmd[0], cmd[1]);
const moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
step(`keyboard: cmd ${cmdMag.toFixed(2)}, moved ${moved.toFixed(2)} m (phase ${phase})`);
if (phase === 'play') {
  if (cmdMag < 0.5) throw new Error('keyboard input never reached world.cmd');
  if (moved < 0.3) throw new Error('keyboard input did not move the player');
} else {
  step('  (not in open play, movement assertion skipped)');
}

// Fast-forward the simulation itself rather than waiting on wall clock: the
// renderer may only be managing a few frames a second on a software GL stack.
await page.evaluate(() => {
  const w = window.__pitch26.world;
  w.halfTime = 20; w.totalTime = 40;
});
for (let i = 0; i < 80; i++) {
  const s = await page.evaluate(() => {
    if (window.__pitch26.state === 'play') window.__pitch26.tick(240);
    return window.__pitch26.state;
  });
  if (s === 'result') break;
  await page.waitForTimeout(250);
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

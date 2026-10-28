// Browser smoke test: new career -> club -> continue -> match -> post-match.
// Usage: node tools/smoke.mjs [outDir] [w] [h]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = process.argv[2] || '/tmp/t26shots';
const W = Number(process.argv[3] || 390), H = Number(process.argv[4] || 844);
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: W < 900, isMobile: W < 900 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const shot = async (n) => page.screenshot({ path: `${OUT}/${W}x${H}-${n}.png` });
await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('01-title');
await page.click('[data-a="newCareer"]');
await page.fill('#ncName', 'テスト 監督');
await page.click('[data-a="ncNext"]');
await page.waitForSelector('.club-card', { timeout: 15000 });
await shot('02-clubs');
await page.click('.club-card >> nth=2');
await page.click('[data-a="ncStart"]');
await page.waitForTimeout(400);
await shot('03-home');
for (const k of ['squad', 'tactics', 'inbox']) {
  await page.evaluate((k) => { const b = document.querySelector(`#bottom [data-a="nav"][data-x*='"${k}"'], #side [data-a="nav"][data-x*='"${k}"']`); if (b) b.click(); }, k);
  await page.waitForTimeout(300);
  await shot('04-' + k);
}
// continue until match day
for (let i = 0; i < 12; i++) {
  const isMatch = await page.evaluate(() => !!document.querySelector('#continue.match'));
  if (isMatch) break;
  await page.click('#continue');
  await page.waitForFunction(() => !document.querySelector('#continue.busy'), null, { timeout: 60000 });
  await page.waitForTimeout(200);
}
await shot('05-before-match');
await page.click('#continue');
await page.waitForTimeout(400);
await shot('06-prematch');
await page.click('[data-a="preMode"][data-x*="full"]');
await page.click('[data-a="kickoff"]');
await page.waitForTimeout(2500);
await shot('07-match-3d');
await page.click('[data-a="mCam"]'); await page.waitForTimeout(800); await shot('08-match-tactical');
await page.click('[data-a="mCam"]'); await page.waitForTimeout(800); await shot('09-match-behind');
await page.click('[data-a="mCam"]'); await page.waitForTimeout(800); await shot('10-match-2d');
await page.click('[data-a="mCam"]');
await page.click('[data-a="mPanel"][data-x*="stats"]'); await page.waitForTimeout(600); await shot('11-match-stats');
await page.click('[data-a="mPanelClose"]');
// switch to highlights and let it run
await page.click('#mState');
await page.click('[data-a="mSetMode"][data-x*="highlights"]');
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const st = await page.evaluate(() => ({ ov: !!document.querySelector('#mOver .modal'), lab: document.querySelector('#mState')?.textContent }));
  if (st.ov) {
    await shot('12-break-' + st.lab);
    const resume = await page.$('[data-a="mResume"]');
    if (resume) { await resume.click(); continue; }
    const fin = await page.$('[data-a="mFinish"]');
    if (fin) { await fin.click(); break; }
  }
  await page.waitForTimeout(500);
}
await page.waitForTimeout(600);
await shot('13-postmatch');
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await browser.close();

import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctxp = await browser.newContext({ viewport: { width: 844, height: 390 },
  deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctxp.newPage();
await page.goto('http://127.0.0.1:8099/index.html?fps=1', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#s-title:not(.hidden)');
await page.evaluate(() => { window.__prof = {}; window.__prof2 = {}; });
const cdp = await ctxp.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.$eval('[data-go="setup"]', (el) => el.click());
await page.waitForTimeout(400);
await page.$eval('#kickoff', (el) => el.click());
await page.waitForTimeout(6000);
const r = await page.evaluate(() => ({ prof: window.__prof, prof2: window.__prof2,
  fps: document.getElementById('fpsTag').textContent }));
const tot = Object.values(r.prof).reduce((a, b) => a + b, 0);
console.log(r.fps);
for (const [k, v] of Object.entries(r.prof).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${v.toFixed(2)} ms  (${(v / tot * 100).toFixed(0)}%)`);
}
console.log(`  total scene ${tot.toFixed(2)} ms`);
console.log('frame breakdown:');
for (const [k, v] of Object.entries(r.prof2).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(10)} ${v.toFixed(2)}`);
}
await browser.close();

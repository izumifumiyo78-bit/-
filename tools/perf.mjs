// FPS under CPU throttling, to approximate mid-range phones.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const cases = (process.env.PERF_CASES ? JSON.parse(process.env.PERF_CASES) : [
  [1280, 720, 1, 1, 'desktop 720p'],
  [844, 390, 2, 4, 'phone 4x slower @2dpr'],
  [844, 390, 3, 6, 'phone 6x slower @3dpr'],
  [390, 844, 3, 4, 'portrait 4x @3dpr'],
]);
for (const [w, h, dsf, throttle, label] of cases) {
  const ctxp = await browser.newContext({ viewport: { width: w, height: h },
    deviceScaleFactor: dsf, hasTouch: true, isMobile: w < 1000 });
  const page = await ctxp.newPage();
  page.setDefaultTimeout(25000);
  try {
    await page.goto('http://127.0.0.1:8099/index.html?fps=1', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#s-title:not(.hidden)', { timeout: 15000 });
    const cdp = await ctxp.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await page.$eval('[data-go="setup"]', (el) => el.click());
    await page.waitForTimeout(400);
    await page.$eval('#kickoff', (el) => el.click());
    await page.waitForTimeout(14000);   // let adaptive scaling converge
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(800);
      samples.push(await page.evaluate(() => parseFloat(document.getElementById('fpsTag').textContent)));
    }
    const sorted = samples.slice().sort((x, y) => x - y);
    const sc = await page.evaluate(() => window.__pitch26.perf.scale);
    console.log(`${label.padEnd(24)} median ${sorted[3].toFixed(0)} fps  min ${sorted[0].toFixed(0)}  scale ${sc.toFixed(2)}  [${samples.map((s) => s.toFixed(0)).join(',')}]`);
  } catch (e) {
    console.log(`${label.padEnd(24)} FAILED: ${e.message.split('\n')[0]}`);
  }
  await ctxp.close();
}
await browser.close();

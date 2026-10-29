// ---------------------------------------------------------------------------
// tools/perf.mjs : frame rate under CPU throttling, to approximate phones.
// Reports the fps the adaptive controller settles on and the resolution scale
// it had to take to get there.
//   node tools/perf.mjs     (needs `npm run preview` on :4173)
// ---------------------------------------------------------------------------
import { launch, BASE } from './launch.mjs';

const browser = await launch();
const cases = process.env.PERF_CASES ? JSON.parse(process.env.PERF_CASES) : [
  [1280, 720, 1, 1, 2, 'desktop 720p / ultra'],
  [900, 420, 2, 4, 1, 'phone 4x slower @2dpr / high'],
  [844, 390, 3, 6, 0, 'phone 6x slower @3dpr / performance'],
];
for (const [w, h, dsf, throttle, tier, label] of cases) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: dsf,
    hasTouch: w < 1000, isMobile: w < 1000,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.goto(`${BASE}/?fps&tier=${tier}`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.__pitch26.start({ halfMinutes: 2 }));
  await page.waitForTimeout(12000);
  const out = await page.evaluate(() => ({
    fps: +window.__pitch26.fpsValue.toFixed(1),
    scale: +window.__pitch26.perf.scale.toFixed(2),
    tier: window.__pitch26.gfx.tier,
  }));
  console.log(`${label.padEnd(34)} fps ${String(out.fps).padStart(5)}  scale ${out.scale}  tier ${out.tier}`);
  await ctx.close();
}
await browser.close();

// Shared Chromium launch for the headless tools. SwiftShader is enabled so
// WebGL2 works on a machine with no GPU (CI, containers).
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
let pw;
try {
  pw = req('playwright');
} catch {
  pw = req('/opt/node-tools/node_modules/playwright/index.js');
}

export const BASE = process.env.PITCH_URL || 'http://127.0.0.1:4173';

export async function launch(extra = []) {
  return pw.chromium.launch({
    args: [
      '--no-sandbox',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
      ...extra,
    ],
  });
}

export function watch(page, errs) {
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
}

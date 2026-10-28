// Syntax-checks every ES module under src/ (node --check needs .mjs).
import { execSync } from 'node:child_process';
import { readdirSync, statSync, copyFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const root = new URL('..', import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), 'chk'));
let bad = 0;
function walk(d) {
  for (const f of readdirSync(join(root, d))) {
    const p = join(d, f);
    if (statSync(join(root, p)).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.js')) continue;
    const t = join(tmp, p.replace(/[\\/]/g, '_') + '.mjs');
    copyFileSync(join(root, p), t);
    try { execSync(`node --check "${t}"`, { stdio: 'pipe' }); } catch (e) { bad++; console.log('✗', p, '\n', e.stderr.toString().split('\n').slice(0, 4).join('\n')); }
  }
}
walk('src');
console.log(bad ? `${bad} file(s) with syntax errors` : 'all modules parse');
process.exit(bad ? 1 : 0);

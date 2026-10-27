import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = process.cwd();
const TYPES = { '.html':'text/html;charset=utf-8', '.js':'text/javascript;charset=utf-8',
  '.css':'text/css;charset=utf-8', '.json':'application/json', '.png':'image/png',
  '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.md':'text/markdown' };
http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const file = join(root, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(8099, () => console.log('serving on http://127.0.0.1:8099'));

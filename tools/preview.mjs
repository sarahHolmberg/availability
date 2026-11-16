#!/usr/bin/env node
/**
 * tools/preview.mjs
 * -----------------------------------------------------------------------
 * Local preview: the whole website (the page + the real function in netlify/functions) on your computer or Codespace,
 * with a TEST database. Nothing touches the live site or its data, so try anything.
 *
 *   npm install          (once)
 *   npm run preview      -> http://localhost:8888
 *
 * The test database starts fresh (with the first people) every time; Ctrl+C stops the preview.
 * Organiser key in the preview: test
 * -----------------------------------------------------------------------
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8888;
process.env.ADMIN_KEY ??= 'test'; // CHANGE HERE: the organiser key of the preview (the real one is in Netlify)

register('./preview/hooks.mjs', import.meta.url); // "@netlify/database" -> the test database
const road = (await import(pathToFileURL(path.join(ROOT, 'netlify/functions/road.mjs')).href)).default;

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api' || url.pathname === '/.netlify/functions/road') {
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
      const r = await road(new Request(url, { method: req.method, headers: req.headers, body }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT) || /(^|[\\/])(\.|node_modules|tools|netlify)/.test(path.relative(ROOT, file))) { res.writeHead(404); return res.end('Not found'); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error('[preview] error:', err);
    res.writeHead(500); res.end('Preview error: ' + err.message);
  }
}).listen(PORT, () => {
  console.log(`\nLocal preview with a TEST database. Nothing here touches the live site.\n  Open: http://localhost:${PORT}\n  Organiser key: ${process.env.ADMIN_KEY}\n  Ctrl+C stops it.\n`);
});

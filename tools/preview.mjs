#!/usr/bin/env node
/**
 * tools/preview.mjs
 * -----------------------------------------------------------------------
 * Local preview: the whole website (the pages + the real functions in netlify/functions) on your computer or Codespace,
 * with a TEST database. Nothing touches the live site or its data, so try anything.
 *
 *   npm install          (once)
 *   npm run preview      -> http://localhost:8888
 *
 * The test database and the test contract store start fresh every time; Ctrl+C stops the preview.
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
const fn = async (name) => (await import(pathToFileURL(path.join(ROOT, `netlify/functions/${name}.mjs`)).href)).default;
const ROUTES = { '/api': await fn('road'), '/api/contract': await fn('contract') };

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf' };
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    const route = ROUTES[url.pathname];
    if (route) {
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
      const r = await route(new Request(url, { method: req.method, headers: req.headers, body }));
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

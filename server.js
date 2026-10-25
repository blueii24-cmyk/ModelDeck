import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(projectDir, process.argv[2] || '.');
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const normalized = normalize(urlPath).replace(/^([/\\]|\.\.(?:[/\\]|$))+/, '');
    let filePath = resolve(rootDir, `.${sep}${normalized}`);
    if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (urlPath.endsWith('/') || !extname(filePath)) filePath = join(filePath, 'index.html');
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (_error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`ModelDeck is running at http://localhost:${port}`);
  console.log('Press Ctrl+C to stop.');
});

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5173;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.gz': 'application/gzip',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url!);

  // Fallback to public directory for static assets
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', req.url!);
  }

  // SPA fallback
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Required headers for SharedArrayBuffer
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('COOP/COEP headers enabled for SharedArrayBuffer support');
});

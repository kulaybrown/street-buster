const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 8000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const safePath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(root, safePath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.statusCode = 404;
      response.end('Not found');
      return;
    }

    response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    response.end(data);
  });
}).listen(port, () => {
  console.log(`Street Buster preview running at http://localhost:${port}`);
});
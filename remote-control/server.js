#!/usr/bin/env node
/*
 * Controle remoto do treinamento — servidor local, sem dependências.
 *
 * Uso:
 *   node remote-control/server.js
 *
 * No notebook, abra a apresentação em:
 *   http://<ip-mostrado-abaixo>:8787/
 * No celular (mesma rede Wi-Fi), abra o controle remoto em:
 *   http://<ip-mostrado-abaixo>:8787/remote
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8787;
const ROOT = path.join(__dirname, '..');

let state = { index: 0, total: 0, title: '', chapter: '', notes: '', titles: [] };
let pendingCmd = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { send(res, 404, 'Não encontrado'); return; }
    send(res, 200, data, MIME[path.extname(filePath)] || 'application/octet-stream');
  });
}

function readJsonBody(req, cb) {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    try { cb(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
    catch (e) { cb({}); }
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') { send(res, 204, ''); return; }

  if (url === '/' && req.method === 'GET') { serveFile(res, path.join(ROOT, 'index.html')); return; }
  if (url === '/jabez.png' && req.method === 'GET') { serveFile(res, path.join(ROOT, 'jabez.png')); return; }
  if ((url === '/remote' || url === '/remote.html') && req.method === 'GET') {
    serveFile(res, path.join(__dirname, 'remote.html'));
    return;
  }

  if (url === '/state' && req.method === 'GET') { send(res, 200, JSON.stringify(state), MIME['.json']); return; }
  if (url === '/state' && req.method === 'POST') {
    readJsonBody(req, data => {
      state = Object.assign({}, state, data);
      send(res, 200, '{"ok":true}', MIME['.json']);
    });
    return;
  }

  if (url === '/cmd' && req.method === 'GET') {
    const c = pendingCmd;
    pendingCmd = null;
    send(res, 200, JSON.stringify(c || {}), MIME['.json']);
    return;
  }
  if (url === '/cmd' && req.method === 'POST') {
    readJsonBody(req, data => {
      pendingCmd = data;
      send(res, 200, '{"ok":true}', MIME['.json']);
    });
    return;
  }

  send(res, 404, 'Não encontrado');
});

function localIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = localIP();
  console.log('');
  console.log('  Apresentação (abra no notebook)   ->  http://' + ip + ':' + PORT + '/');
  console.log('  Controle remoto (abra no celular) ->  http://' + ip + ':' + PORT + '/remote');
  console.log('');
  console.log('  Celular e notebook precisam estar na mesma rede Wi-Fi.');
  console.log('  Ctrl+C para encerrar.');
  console.log('');
});

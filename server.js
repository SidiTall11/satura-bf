const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const SEED = path.join(ROOT, 'data', 'demo-cases.json');
const LOCAL_DATA = path.resolve(process.env.SUTURA_DATA_DIR || path.join(ROOT, '.sutura-demo'));
const DATABASE = path.join(LOCAL_DATA, 'cases.json');
const STATUSES = new Set(['À examiner', 'Orientation à préparer', 'En cours', 'Clôturé']);
const token = process.env.SUTURA_DEMO_TOKEN || crypto.randomBytes(18).toString('base64url');
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const eventClients = new Set();
const allowedAreas = new Set(['Ouagadougou · Centre', 'Bobo-Dioulasso · Houet', 'Koudougou · Boulkiemdé', 'Tenkodogo · Boulgou', 'Ouahigouya · Yatenga']);
const allowedCategories = new Set(['Écoute et soutien', 'Orientation psychosociale', 'Information juridique', 'Mise à l’abri', 'Information santé']);

function publishEvent(type, item) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(item)}\n\n`;
  for (const response of eventClients) response.write(payload);
}

const intakeWindow = new Map();
function intakeAllowed(ip) {
  const now = Date.now();
  const recent = (intakeWindow.get(ip) || []).filter((time) => now - time < 600000);
  intakeWindow.set(ip, recent);
  if (recent.length >= 10) return false;
  recent.push(now);
  if (intakeWindow.size > 500) intakeWindow.clear();
  return true;
}

function readCases() {
  if (!fs.existsSync(DATABASE)) {
    fs.mkdirSync(LOCAL_DATA, { recursive: true, mode: 0o700 });
    fs.copyFileSync(SEED, DATABASE, fs.constants.COPYFILE_EXCL);
    try { fs.chmodSync(DATABASE, 0o600); } catch {}
  }
  return JSON.parse(fs.readFileSync(DATABASE, 'utf8'));
}

function saveCases(cases) {
  fs.mkdirSync(LOCAL_DATA, { recursive: true, mode: 0o700 });
  const temporary = `${DATABASE}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(cases, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, DATABASE);
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function authorized(request, response) {
  const header = request.headers.authorization || '';
  const encoded = header.startsWith('Basic ') ? header.slice(6) : '';
  let credentials = '';
  try { credentials = Buffer.from(encoded, 'base64').toString('utf8'); } catch {}
  const expected = `demo:${token}`;
  const actualBuffer = Buffer.from(credentials);
  const expectedBuffer = Buffer.from(expected);
  const valid = actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  if (!valid) {
    // Les en-têtes HTTP doivent rester en ASCII : le tiret long fait planter Node.
    response.writeHead(401, { 'www-authenticate': 'Basic realm="Sutura demo", charset="UTF-8"', 'cache-control': 'no-store' });
    response.end('Authentification requise.');
    return false;
  }
  return true;
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2048) reject(new Error('Payload trop volumineux'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('JSON invalide')); }
    });
    request.on('error', reject);
  });
}

async function handleApi(request, response, pathname) {
  if (request.method === 'POST' && pathname === '/api/cases') {
    if (!authorized(request, response)) return;
    let body;
    try { body = await getRequestBody(request); } catch (error) { return sendJson(response, 400, { error: error.message }); }
    if (!intakeAllowed(request.socket?.remoteAddress)) {
      return sendJson(response, 429, { error: 'Trop de créations depuis ce poste. Patientez quelques minutes.' });
    }
    if (!allowedAreas.has(body.area) || !allowedCategories.has(body.category)) {
      return sendJson(response, 400, { error: 'Choisissez une zone et un besoin dans la liste.' });
    }
    const cases = readCases();
    let id;
    do { id = `ST-${String(crypto.randomInt(10000, 99999))}`; } while (cases.some((item) => item.id === id));
    const item = {
      id,
      createdAt: new Date().toISOString(),
      area: body.area,
      category: body.category,
      priority: 'À évaluer par l’équipe',
      status: 'À examiner',
      service: 'Orientation à définir après échange',
      callback: 'Non renseigné',
      consent: 'Aucun partage externe'
    };
    cases.unshift(item);
    saveCases(cases);
    publishEvent('case-created', item);
    return sendJson(response, 201, { demo: true, case: item });
  }
  if (request.method === 'GET' && pathname === '/api/events') {
    if (!authorized(request, response)) return;
    response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'connection': 'keep-alive', 'x-accel-buffering': 'no' });
    response.write(': Sutura dashboard stream connected\n\n');
    eventClients.add(response);
    const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 20000);
    request.on('close', () => { clearInterval(heartbeat); eventClients.delete(response); });
    return;
  }
  if (!authorized(request, response)) return;
  if (request.method === 'GET' && pathname === '/api/cases') {
    return sendJson(response, 200, { demo: true, cases: readCases() });
  }
  const match = pathname.match(/^\/api\/cases\/([A-Z0-9-]+)$/);
  if (request.method === 'PATCH' && match) {
    let body;
    try { body = await getRequestBody(request); } catch (error) { return sendJson(response, 400, { error: error.message }); }
    if (!STATUSES.has(body.status)) return sendJson(response, 400, { error: 'Statut de démonstration invalide.' });
    const cases = readCases();
    const item = cases.find((entry) => entry.id === match[1]);
    if (!item) return sendJson(response, 404, { error: 'Dossier de démonstration introuvable.' });
    item.status = body.status;
    saveCases(cases);
    publishEvent('case-updated', item);
    return sendJson(response, 200, { demo: true, case: item });
  }
  return sendJson(response, 404, { error: 'Route API introuvable.' });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  if (request.method === 'GET' && url.pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return response.end(JSON.stringify({ status: 'ok' }));
  }
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url.pathname);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    return response.end('Méthode non autorisée.');
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  // '.git' et '.sutura-demo' contiennent l'historique et les dossiers : jamais servis.
  if (requested.split('/').some((segment) => segment.startsWith('.'))) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return response.end('Page introuvable.');
  }
  // Le serveur ne livre que le site : ni son propre code, ni sa configuration.
  const isPage = requested.endsWith('.html') && !requested.slice(1).includes('/');
  const isRuntime = ['/fonts.css', '/styles.css', '/dashboard.css', '/script.js', '/dashboard.js'].includes(requested);
  if (!isPage && !isRuntime && !requested.startsWith('/assets/')) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return response.end('Page introuvable.');
  }
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return response.end('Page introuvable.');
  }
  response.writeHead(200, {
    'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  });
  if (request.method === 'HEAD') return response.end();
  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`Sutura démo : http://${HOST}:${PORT}/dashboard.html`);
  console.log(`Identifiant dashboard : demo`);
  console.log(`Mot de passe temporaire : ${token}`);
  console.log('Mode local uniquement. Données fictives ; aucun appel, audio ou témoignage réel n’est collecté.');
});

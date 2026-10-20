import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { JsonStore } from './store.mjs';
import { ApiError, requireThat } from './errors.mjs';
import {
  checkPassword,
  hashPassword,
  createSession,
  sessionHash,
} from './auth.mjs';
import { newPerson, SCHEMA_VERSION } from './seed.mjs';
import {
  stateFor,
  performAction,
  accountExport,
  generateProgram,
} from './domain.mjs';
import * as v from './validation.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MAX_BODY_BYTES = 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readJson(req) {
  requireThat(
    /^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? ''),
    'Use Content-Type: application/json.',
    415,
    'unsupported_media_type',
  );
  requireThat(
    !req.headers['content-encoding'] ||
      req.headers['content-encoding'] === 'identity',
    'Compressed request bodies are not supported.',
    415,
    'unsupported_encoding',
  );
  const declared = Number(req.headers['content-length'] ?? 0);
  requireThat(
    Number.isFinite(declared) && declared <= MAX_BODY_BYTES,
    'Request body is too large (maximum 1 MiB).',
    413,
    'body_too_large',
  );
  return await new Promise((resolveBody, rejectBody) => {
    let bytes = 0;
    let done = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (done) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        done = true;
        rejectBody(
          new ApiError(
            413,
            'Request body is too large (maximum 1 MiB).',
            'body_too_large',
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        rejectBody(
          new ApiError(
            400,
            'Request body must contain valid JSON.',
            'invalid_json',
          ),
        );
      }
    });
    req.on('error', (error) => {
      if (!done) {
        done = true;
        rejectBody(error);
      }
    });
    req.on('aborted', () => {
      if (!done) {
        done = true;
        rejectBody(
          new ApiError(400, 'The request was interrupted.', 'request_aborted'),
        );
      }
    });
  });
}

function getSession(db, req) {
  const authorization = req.headers.authorization ?? '';
  requireThat(
    /^Bearer [A-Za-z0-9_-]{43}$/.test(authorization),
    'Sign in to continue.',
    401,
    'unauthenticated',
  );
  const hash = sessionHash(authorization.slice(7));
  const session = db.sessions.find(
    (item) => item.hash === hash && Date.parse(item.expiresAt) > Date.now(),
  );
  requireThat(
    session && db.users.some((user) => user.id === session.userId),
    'Your session ended. Sign in again.',
    401,
    'session_expired',
  );
  return session;
}

class RateLimits {
  constructor() {
    this.buckets = new Map();
  }
  take(key, maximum, windowMs) {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now)
      bucket = { count: 0, resetAt: now + windowMs };
    requireThat(
      bucket.count < maximum,
      'Too many attempts. Wait a few minutes and try again.',
      429,
      'rate_limited',
    );
    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 1000)
      for (const [id, value] of this.buckets)
        if (value.resetAt <= now) this.buckets.delete(id);
  }
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:8094 http://localhost:8094; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  );
}

function checkLocalOrigin(req, res, port) {
  let host;
  try {
    host = new URL(`http://${req.headers.host}`);
  } catch {
    throw new ApiError(400, 'Invalid request host.', 'invalid_host');
  }
  requireThat(
    ['localhost', '127.0.0.1'].includes(host.hostname) &&
      Number(host.port || 80) === port,
    'This preview accepts local requests only.',
    403,
    'invalid_host',
  );
  const origin = req.headers.origin;
  if (!origin) return;
  const allowed = new Set([
    'http://localhost:8093',
    'http://127.0.0.1:8093',
    'http://localhost:8094',
    'http://127.0.0.1:8094',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);
  requireThat(
    allowed.has(origin),
    'This origin is not allowed to use the local API.',
    403,
    'invalid_origin',
  );
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');
}

async function serveStatic(req, res, pathname, directory) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new ApiError(400, 'Invalid URL encoding.', 'invalid_path');
  }
  requireThat(
    !decoded.includes('\0') &&
      !decoded.includes('\\') &&
      !decoded.split('/').some((part) => part.startsWith('.')),
    'This path is not available.',
    404,
    'not_found',
  );
  const base = resolve(directory);
  let target = resolve(base, `.${decoded === '/' ? '/index.html' : decoded}`);
  requireThat(
    target === base || target.startsWith(`${base}${sep}`),
    'This path is not available.',
    404,
    'not_found',
  );
  let info;
  try {
    info = await stat(target);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
  }
  if (!info?.isFile()) {
    // Asset typos must stay 404; app routes use the exported single-page shell.
    requireThat(
      !extname(decoded) &&
        !decoded.startsWith('/assets/') &&
        !decoded.startsWith('/_expo/'),
      'File not found.',
      404,
      'not_found',
    );
    target = join(base, 'index.html');
    try {
      info = await stat(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!info?.isFile()) {
    sendJson(res, 503, {
      error:
        'The local API is ready. Build the web preview first, or open the Expo development server on port 8093.',
      code: 'web_build_missing',
    });
    return;
  }
  const canonical = await realpath(target);
  const canonicalBase = await realpath(base);
  requireThat(
    canonical.startsWith(`${canonicalBase}${sep}`),
    'This path is not available.',
    404,
    'not_found',
  );
  res.writeHead(200, {
    'Content-Type':
      MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control':
      extname(target) === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') res.end();
  else res.end(await readFile(canonical));
}

/** Create a loopback API server. Tests must pass an isolated dataDir. */
export async function createApiServer({
  dataDir = process.env.AI_GYM_DATA_DIR || join(projectRoot, '.local-web'),
  seed = true,
  staticDir = join(projectRoot, 'web-dist'),
  logger = console,
} = {}) {
  const store = await JsonStore.open(dataDir, { seed });
  const limits = new RateLimits();
  const server = http.createServer(async (req, res) => {
    setSecurityHeaders(res);
    try {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 8094;
      checkLocalOrigin(req, res, port);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const path = url.pathname;
      if (!path.startsWith('/api/')) {
        requireThat(
          req.method === 'GET' || req.method === 'HEAD',
          'Method not allowed.',
          405,
          'method_not_allowed',
        );
        await serveStatic(req, res, path, staticDir);
        return;
      }
      if (req.method === 'GET' && path === '/api/health') {
        sendJson(res, 200, {
          ok: true,
          mode: 'local',
          schemaVersion: SCHEMA_VERSION,
        });
        return;
      }
      if (
        req.method === 'POST' &&
        ['/api/auth/login', '/api/auth/register'].includes(path)
      ) {
        limits.take(`auth:${req.socket.remoteAddress}`, 60, 15 * 60000);
        const input = await readJson(req);
        v.object(
          input,
          'Credentials',
          path.endsWith('register')
            ? ['email', 'password', 'name', 'role']
            : ['email', 'password'],
        );
        const email = v.email(input.email);
        requireThat(
          typeof input.password === 'string' &&
            input.password.length >= 1 &&
            input.password.length <= 128,
          'Enter your password (maximum 128 characters).',
        );
        limits.take(`email:${email}`, 20, 15 * 60000);
        const result = await store.transact(async (db) => {
          let user;
          if (path.endsWith('register')) {
            const name = v.text(input.name, 'Name', 80, 1);
            const role = v.choice(input.role, 'Role', ['member', 'trainer']);
            const password = v.password(input.password);
            requireThat(
              !db.users.some((item) => item.email === email),
              'An account already uses this email. Sign in instead.',
              409,
              'email_in_use',
            );
            user = {
              ...newPerson({ id: randomUUID(), name, email, role }),
              passwordHash: await hashPassword(password),
            };
            db.users.push(user);
          } else {
            user = db.users.find((item) => item.email === email);
            const valid = await checkPassword(
              input.password,
              user?.passwordHash,
            );
            requireThat(
              valid && user,
              'Email or password is incorrect.',
              401,
              'invalid_credentials',
            );
          }
          const token = createSession(db, user.id);
          return { token, state: stateFor(db, user.id) };
        });
        sendJson(res, path.endsWith('register') ? 201 : 200, result);
        return;
      }
      // Authenticate before body parsing, and repeat within the serialized write
      // to prevent a queued action outliving logout or account deletion.
      const session = getSession(store.data, req);
      if (req.method === 'GET' && path === '/api/state') {
        sendJson(res, 200, stateFor(store.data, session.userId));
        return;
      }
      if (req.method === 'GET' && path === '/api/export') {
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="ai-gym-account.json"',
        );
        sendJson(res, 200, accountExport(store.data, session.userId));
        return;
      }
      if (req.method === 'POST' && path === '/api/auth/logout') {
        await store.transact((db) => {
          getSession(db, req);
          db.sessions = db.sessions.filter(
            (item) => item.hash !== session.hash,
          );
        });
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method === 'POST' && path === '/api/action') {
        limits.take(`action:${session.userId}`, 300, 60000);
        const action = await readJson(req);
        const result = await store.transact(async (db) => {
          const current = getSession(db, req);
          return performAction(db, current.userId, action, {
            sessionHash: current.hash,
          });
        });
        sendJson(res, 200, result);
        return;
      }
      if (req.method === 'POST' && path === '/api/generate') {
        limits.take(`generate:${session.userId}`, 30, 3600000);
        const input = await readJson(req);
        const result = await store.transact((db) => {
          const current = getSession(db, req);
          return generateProgram(db, current.userId, input);
        });
        sendJson(res, 200, result);
        return;
      }
      throw new ApiError(404, 'API endpoint not found.', 'not_found');
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      if (status === 500)
        logger.error?.(
          'Local API request failed:',
          error?.message ?? String(error),
        );
      if (!res.headersSent && !res.destroyed) {
        if (status === 429) res.setHeader('Retry-After', '60');
        sendJson(res, status, {
          error:
            status === 500
              ? 'The local API could not save or load your data. Your previous saved state is retained; retry after checking the server.'
              : error.message,
          code: error instanceof ApiError ? error.code : 'internal_error',
        });
      } else if (!res.destroyed) res.end();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 1000;
  server.store = store;
  server.shutdown = async () => {
    if (server.listening)
      await new Promise((resolveClose, rejectClose) =>
        server.close((error) => (error ? rejectClose(error) : resolveClose())),
      );
    await store.close();
  };
  return server;
}

export async function startServer({
  port = Number(process.env.AI_GYM_PORT || 8094),
  ...options
} = {}) {
  requireThat(
    Number.isInteger(port) && port >= 0 && port <= 65535,
    'AI_GYM_PORT must be a valid port.',
  );
  const server = await createApiServer(options);
  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', rejectListen);
        resolveListen();
      });
    });
    return server;
  } catch (error) {
    await server.store.close();
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const server = await startServer();
    console.log(
      `AI Gym local web preview: http://127.0.0.1:${server.address().port}`,
    );
    console.log(
      'Local-only data storage. Hosted AI, email, billing and push are disabled.',
    );
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      await server.shutdown();
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
  } catch (error) {
    console.error(`Could not start the local API: ${error.message}`);
    process.exitCode = 1;
  }
}

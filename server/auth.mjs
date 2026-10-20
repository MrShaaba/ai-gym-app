import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PARAMETERS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, PARAMETERS);
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}

export async function checkPassword(password, encoded) {
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  // Run a real derivation for missing accounts too, avoiding a fast username probe.
  const salt =
    parts.length === 6 ? parts[4] : '00000000000000000000000000000000';
  const expected =
    parts.length === 6 && /^[a-f0-9]{128}$/.test(parts[5])
      ? Buffer.from(parts[5], 'hex')
      : Buffer.alloc(64);
  const key = await scrypt(
    typeof password === 'string' ? password : '',
    salt,
    64,
    PARAMETERS,
  );
  return timingSafeEqual(key, expected) && parts.length === 6;
}

export const sessionHash = (token) =>
  createHash('sha256').update(token).digest('hex');

export function createSession(db, userId, now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  db.sessions = db.sessions.filter(
    (session) => Date.parse(session.expiresAt) > now,
  );
  // Keep a bounded number of active sessions per account.
  const previous = db.sessions
    .filter((session) => session.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const evicted = new Set(
    previous
      .slice(0, Math.max(0, previous.length - 9))
      .map((session) => session.hash),
  );
  db.sessions = db.sessions.filter((session) => !evicted.has(session.hash));
  db.sessions.push({
    hash: sessionHash(token),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 86400000).toISOString(),
  });
  return token;
}

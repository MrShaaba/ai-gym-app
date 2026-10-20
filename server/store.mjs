import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedDatabase, emptyDatabase, SCHEMA_VERSION } from './seed.mjs';

const COLLECTIONS = [
  'users',
  'sessions',
  'relationships',
  'programs',
  'assignments',
  'occurrences',
  'workouts',
  'notifications',
  'messages',
  'reviews',
  'operations',
  'generatedDrafts',
];

export class JsonStore {
  constructor(directory) {
    this.directory = resolve(directory);
    this.path = join(this.directory, 'data.json');
    this.lockPath = join(this.directory, 'server.lock');
    this.pending = Promise.resolve();
    this.closed = false;
  }

  static async open(directory, { seed = true } = {}) {
    const store = new JsonStore(directory);
    await mkdir(store.directory, { recursive: true, mode: 0o700 });
    await store.acquireLock();
    try {
      let raw;
      try {
        raw = await readFile(store.path, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (raw !== undefined) {
        try {
          store.data = JSON.parse(raw);
        } catch {
          throw new Error(
            `Local data is invalid JSON at ${store.path}. Preserve this file and restore a known-good backup; it was not overwritten.`,
          );
        }
        if (
          store.data?.schemaVersion !== SCHEMA_VERSION ||
          COLLECTIONS.some((key) => !Array.isArray(store.data[key]))
        ) {
          throw new Error(
            `Unsupported or incomplete local data schema at ${store.path}; expected version ${SCHEMA_VERSION}. The existing file was not modified.`,
          );
        }
      } else {
        store.data = seed ? await seedDatabase() : emptyDatabase();
        await store.write(store.data);
      }
      return store;
    } catch (error) {
      await store.releaseLock();
      throw error;
    }
  }

  async acquireLock() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const lock = await open(this.lockPath, 'wx', 0o600);
        await lock.writeFile(
          JSON.stringify({
            pid: process.pid,
            createdAt: new Date().toISOString(),
          }),
        );
        await lock.close();
        this.hasLock = true;
        return;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        let existing;
        try {
          existing = JSON.parse(await readFile(this.lockPath, 'utf8'));
        } catch {
          throw new Error(
            'Local data lock is unreadable. Stop any running API before removing server.lock.',
          );
        }
        let running = true;
        try {
          process.kill(existing.pid, 0);
        } catch (check) {
          if (check.code === 'ESRCH') running = false;
        }
        if (running)
          throw new Error(
            `Another local API (PID ${existing.pid}) is using this data directory. Use a different AI_GYM_DATA_DIR or stop that process.`,
          );
        await unlink(this.lockPath);
      }
    }
    throw new Error('Could not acquire the local data lock.');
  }

  async releaseLock() {
    if (!this.hasLock) return;
    this.hasLock = false;
    await unlink(this.lockPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  async write(data) {
    const temporary = join(this.directory, `.data-${randomUUID()}.tmp`);
    let file;
    try {
      file = await open(temporary, 'wx', 0o600);
      await file.writeFile(`${JSON.stringify(data, null, 2)}\n`);
      await file.sync();
      await file.close();
      file = undefined;
      await rename(temporary, this.path);
      // Flush directory metadata where supported after the atomic rename.
      const directory = await open(this.directory, 'r');
      try {
        await directory.sync();
      } catch (error) {
        if (!['EINVAL', 'ENOTSUP', 'EBADF'].includes(error.code)) throw error;
      } finally {
        await directory.close();
      }
    } catch (error) {
      if (file) await file.close().catch(() => {});
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }

  transact(operation) {
    if (this.closed)
      return Promise.reject(new Error('The local data store is closed.'));
    const job = this.pending.then(async () => {
      const next = structuredClone(this.data);
      const result = await operation(next);
      await this.write(next);
      this.data = next;
      return result;
    });
    this.pending = job.catch(() => {});
    return job;
  }

  snapshot() {
    return structuredClone(this.data);
  }

  async close() {
    this.closed = true;
    await this.pending;
    await this.releaseLock();
  }
}

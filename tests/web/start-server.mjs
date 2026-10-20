import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
if (!existsSync(join(root, 'web-dist/index.html'))) {
  throw new Error('Build the browser application first: yarn web:build');
}

// Each Playwright invocation gets its own store, never the interactive demo store.
const testRoot = join(root, '.local-web-test');
mkdirSync(testRoot, { recursive: true });
const dataDir = mkdtempSync(join(testRoot, 'run-'));
process.on('exit', () => rmSync(dataDir, { recursive: true, force: true }));
const server = spawn(process.execPath, [join(root, 'server/index.mjs')], {
  cwd: root,
  env: {
    ...process.env,
    AI_GYM_DATA_DIR: dataDir,
    AI_GYM_PORT: process.env.AI_GYM_PORT || '8095',
  },
  stdio: 'inherit',
});
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
server.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
server.on('exit', (code) => process.exit(code ?? 0));

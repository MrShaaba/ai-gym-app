import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/index.mjs'], {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  }),
  spawn('yarn', ['exec', 'expo', 'start', '--web', '--port', '8093'], {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      // Expo is a grandchild of Yarn. End its process group as well so a failed
      // API startup or Ctrl+C does not leave an orphaned development server.
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message);
    }
  }
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

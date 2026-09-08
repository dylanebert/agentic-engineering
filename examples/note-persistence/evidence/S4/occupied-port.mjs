import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const server = createServer((req, res) => { res.end('owned qualification listener'); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(18765, '127.0.0.1', resolve); });
try {
  const start = new Date().toISOString();
  const child = spawn('bunx', ['--no-install', 'playwright', 'test', '--config', 'playwright.config.ts'], { cwd: new URL('./workspace/', import.meta.url), env: { ...process.env, DEBUG: 'pw:webserver,pw:browser', DEBUG_COLORS: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', bytes => output += bytes);
  child.stderr.on('data', bytes => output += bytes);
  const exit = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  writeFileSync(new URL('occupied-port.log', import.meta.url), output);
  const body = await (await fetch('http://127.0.0.1:18765')).text();
  const receipt = { start, end: new Date().toISOString(), ownerPid: process.pid, childPid: child.pid, exit, preserved: body === 'owned qualification listener', refused: output.includes('is already used'), browserLaunched: output.includes('<launched>') };
  writeFileSync(new URL('occupied-port.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
  if (exit !== 1 || !receipt.preserved || !receipt.refused || receipt.browserLaunched) throw new Error('occupied-port qualification failed');
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
console.log('occupied port refused; owned listener preserved until owner close');

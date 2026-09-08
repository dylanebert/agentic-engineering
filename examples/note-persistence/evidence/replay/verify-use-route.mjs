import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = '/tmp/agentic-engineering-dogfood-loop-20260908-2012/final-reader-replay';
const command = ['gtimeout', '--signal=TERM', '--kill-after=5', '300', 'node', 'node_modules/http-server/bin/http-server', 'app', '-a', '127.0.0.1', '-p', '18765', '-c-1'];
const start = new Date().toISOString();
const child = spawn(command[0], command.slice(1), { cwd: `${root}/final`, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stdout.on('data', b => log += b); child.stderr.on('data', b => log += b);
const exited = new Promise((resolve, reject) => { child.once('exit', (code, signal) => resolve({ code, signal })); child.once('error', reject); });
let observation;
try {
  const deadline = Date.now() + 10000;
  while (!log.includes('Available on:')) {
    if (child.exitCode !== null || Date.now() > deadline) throw new Error('owned server failed to bind');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  const response = await fetch('http://127.0.0.1:18765/');
  const body = Buffer.from(await response.arrayBuffer());
  const equal = body.equals(readFileSync(`${root}/final/app/index.html`));
  const outsideStatus = (await fetch('http://127.0.0.1:18765/package.json')).status;
  observation = { status: response.status, sameFinalBytes: equal, sha256: createHash('sha256').update(body).digest('hex'), outsideStatus };
  if (response.status !== 200 || !equal || outsideStatus !== 404) throw new Error('use route snapshot mismatch');
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  const exit = await exited;
  writeFileSync(`${root}/use-route.log`, log);
  writeFileSync(`${root}/use-route.json`, JSON.stringify({ start, end: new Date().toISOString(), cwd: `${root}/final`, command, ownerPid: child.pid, observation, exit, teardown: 'owner sent SIGTERM to its timeout process; no browser opened' }, null, 2) + '\n');
}
console.log('bounded use route serves exact final app, excludes package.json and closes');

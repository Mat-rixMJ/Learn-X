#!/usr/bin/env node
/**
 * Cross-platform orchestrator to:
 * 1. Launch Python microservices (audio, translation, caption)
 * 2. Wait for their /health endpoints to be healthy (with timeout & retries)
 * 3. Start backend
 * 4. Start frontend
 * Provides colored, prefixed logs and exit-on-failure behavior.
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const PY_SERVICES = [
  { name: 'audio', dir: 'python-services/audio-service', port: 8001, path: '/health' },
  { name: 'translation', dir: 'python-services/translation-service', port: 8002, path: '/health' },
  { name: 'caption', dir: 'python-services/caption-service', port: 8003, path: '/health' }
];

const COLORS = { reset: '\u001b[0m', cyan: '\u001b[36m', yellow: '\u001b[33m', green: '\u001b[32m', red: '\u001b[31m', magenta: '\u001b[35m' };
function log(scope, msg, color='cyan') {
  const ts = new Date().toISOString().split('T')[1].replace('Z','');
  console.log(`${COLORS[color]}[${ts}] [${scope}]${COLORS.reset} ${msg}`);
}

function spawnService(scope, command, args, options = {}) {
  log(scope, `Starting: ${command} ${args.join(' ')}`, 'magenta');
  const child = spawn(command, args, { cwd: ROOT, env: process.env, shell: process.platform === 'win32', ...options });
  child.stdout.on('data', d => process.stdout.write(`${COLORS.green}[${scope}]${COLORS.reset} ${d}`));
  child.stderr.on('data', d => process.stderr.write(`${COLORS.red}[${scope} ERR]${COLORS.reset} ${d}`));
  child.on('exit', code => log(scope, `Exited with code ${code}`, code === 0 ? 'yellow' : 'red'));
  return child;
}

function httpGet(host, port, path, timeoutMs=3000) {
  return new Promise((resolve) => {
    const req = http.request({ host, port, path, method: 'GET', timeout: timeoutMs }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({ ok: res.statusCode === 200, status: res.statusCode, body });
      });
    });
    req.on('error', err => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

async function waitForHealth(service, attempts=60, intervalMs=2000) {
  for (let i=1;i<=attempts;i++) {
    const res = await httpGet('127.0.0.1', service.port, service.path);
    if (res.ok) {
      log(service.name, `Healthy after ${i} attempt(s)`, 'green');
      return true;
    }
    if (i % 5 === 0) log(service.name, `Still waiting (attempt ${i}/${attempts})... last: ${res.error||res.status}`, 'yellow');
    await new Promise(r => setTimeout(r, intervalMs));
  }
  log(service.name, `Failed to become healthy after ${attempts} attempts`, 'red');
  return false;
}

async function main() {
  const pythonDisabled = process.env.ENABLE_PYTHON_SERVICES !== 'true';
  if (pythonDisabled) {
    log('orchestrator', 'Python services disabled via ENABLE_PYTHON_SERVICES flag. Skipping their startup.', 'yellow');
  }
  if (!pythonDisabled) log('orchestrator', 'Launching Python microservices...');
  const pyChildren = [];
  const win = process.platform === 'win32';
  const venvPythonWin = path.join(ROOT, 'python-services', 'venv', 'Scripts', 'python.exe');
  const venvPythonNix = path.join(ROOT, 'python-services', 'venv', 'bin', 'python');
  const pyCmdBase = win ? venvPythonWin : venvPythonNix;
  const pyExists = require('fs').existsSync(pyCmdBase);
  if (!pyExists) {
    log('orchestrator', `WARNING: Expected venv python not found at ${pyCmdBase}, falling back to system python`, 'yellow');
  }

  if (!pythonDisabled) for (const svc of PY_SERVICES) {
    const pyCmd = pyExists ? pyCmdBase : (win ? 'python' : 'python3');
    const entry = 'main.py';
    const cwd = path.join(ROOT, svc.dir);
    const args = [path.join(cwd, entry)];
    const env = { ...process.env };
    // Pass through model size envs if user set them before calling script
    if (!env.WHISPER_MODEL_SIZE) env.WHISPER_MODEL_SIZE = 'base';
    if (!env.TRANSLATION_MODEL) env.TRANSLATION_MODEL = 'facebook/nllb-200-distilled-600M';
    const child = spawn(pyCmd, args, { cwd, env, shell: false });
    child.stdout.on('data', d => process.stdout.write(`${COLORS.green}[py-${svc.name}]${COLORS.reset} ${d}`));
    child.stderr.on('data', d => process.stderr.write(`${COLORS.red}[py-${svc.name} ERR]${COLORS.reset} ${d}`));
    child.on('exit', code => log(`py-${svc.name}`, `Exited code ${code}`, code === 0 ? 'yellow':'red'));
    pyChildren.push(child);
  }

  // Wait for all health
  let allHealthy = true;
  if (!pythonDisabled) {
    for (const svc of PY_SERVICES) {
      const healthy = await waitForHealth(svc);
      if (!healthy) allHealthy = false;
    }
    if (!allHealthy) {
      log('orchestrator', 'One or more Python services failed to become healthy. Exiting.', 'red');
      process.exit(1);
    }
  }

  log('orchestrator', 'Starting backend and frontend...');
  const backend = spawnService('backend', 'npm', ['run', 'dev:backend']);
  const frontend = spawnService('frontend', 'npm', ['run', 'dev:frontend']);

  process.on('SIGINT', () => {
    log('orchestrator', 'Shutting down...', 'yellow');
    [...pyChildren, backend, frontend].forEach(p => { if (p && !p.killed) p.kill(); });
    process.exit(0);
  });
}

main().catch(err => {
  log('orchestrator', `Fatal error: ${err.stack || err.message}`, 'red');
  process.exit(1);
});

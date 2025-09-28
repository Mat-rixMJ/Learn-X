#!/usr/bin/env node
/**
 * Unified orchestrator to start backend, frontend, and python microservices.
 * Uses cross-platform child_process spawning. Assumes python services started via PowerShell script on Windows.
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');

function log(section, msg, color="") {
  const ts = new Date().toISOString().split('T')[1].replace('Z','');
  console.log(`[${ts}] [${section}] ${msg}`);
}

function start(name, command, args, options = {}) {
  log(name, `Starting: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { cwd: root, stdio: 'pipe', shell: false, ...options });
  child.stdout.on('data', d => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[${name}][ERR] ${d}`));
  child.on('exit', code => log(name, `Exited with code ${code}`));
  return child;
}

// Start backend
const backend = start('backend', 'npm', ['run', 'dev:backend']);
// Start frontend
const frontend = start('frontend', 'npm', ['run', 'dev:frontend']);
// Start python services via PowerShell orchestrator (Windows only)
if (os.platform() === 'win32') {
  const psScript = path.join(root, 'start-system-simple.ps1');
  const python = start('python-services', 'powershell.exe', ['-ExecutionPolicy','Bypass','-File', psScript, '-SkipFrontend','-SkipBackend']);
}

process.on('SIGINT', () => {
  log('orchestrator','Shutting down...');
  [backend, frontend].forEach(p => p && p.kill());
  process.exit(0);
});

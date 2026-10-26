#!/usr/bin/env node

/**
 * Inspectra — One-Command Full Stack Process Orchestrator
 * Starts Test Fixtures, Browser Worker, Spring Boot Backend, and React Frontend.
 * Performs readiness probing and graceful cleanup on exit.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT_DIR, '.inspectra-pids.json');

// ANSI Color Codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

const SERVICES = [
  {
    name: 'FIXTURES',
    dir: 'test-fixtures',
    cmd: 'node',
    args: ['server.js'],
    port: 4000,
    healthUrl: 'http://localhost:4000',
    color: COLORS.cyan
  },
  {
    name: 'WORKER  ',
    dir: 'worker',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['start'],
    port: 5001,
    healthUrl: 'http://localhost:5001/health',
    color: COLORS.yellow
  },
  {
    name: 'BACKEND ',
    dir: 'backend',
    cmd: process.platform === 'win32' ? path.join(ROOT_DIR, 'backend', 'mvnw.cmd') : './mvnw',
    args: ['spring-boot:run'],
    port: 8080,
    healthUrl: 'http://localhost:8080/api/health',
    color: COLORS.magenta
  },
  {
    name: 'FRONTEND',
    dir: 'frontend',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    port: 5173,
    healthUrl: 'http://localhost:5173',
    color: COLORS.green
  }
];

const children = [];
let isShuttingDown = false;

// 1. Check prerequisites
function checkPrerequisites() {
  console.log(`\n${COLORS.bright}${COLORS.blue}🔍 Checking system prerequisites...${COLORS.reset}`);

  // Check Node version
  const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVersion < 18) {
    console.error(`${COLORS.red}❌ Node.js 18+ required (detected v${process.versions.node})${COLORS.reset}`);
    process.exit(1);
  }
  console.log(`   ${COLORS.green}✔${COLORS.reset} Node.js v${process.versions.node}`);

  // Check Java
  try {
    const javaOutput = execSync('java -version 2>&1', { encoding: 'utf-8' });
    const match = javaOutput.match(/(?:version\s+"?|build\s+)(\d+)/i);
    const javaVer = match ? parseInt(match[1], 10) : 17;
    console.log(`   ${COLORS.green}✔${COLORS.reset} Java ${javaVer >= 17 ? 'v' + javaVer : '(detected)'}`);
  } catch (err) {
    console.warn(`   ${COLORS.yellow}⚠ Java command check skipped (using bundled Maven wrapper)${COLORS.reset}`);
  }

  // Load .env if present
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    console.log(`   ${COLORS.green}✔${COLORS.reset} Loaded configuration from .env`);
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    });
  }
}

// 2. Check if a port is in use
function checkPortInUse(port) {
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

// 3. Wait for HTTP readiness
function pollHealth(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        return reject(new Error(`Timed out waiting for ${url}`));
      }

      http.get(url, res => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          clearInterval(interval);
          resolve(true);
        }
      }).on('error', () => {
        // Keep waiting
      });
    }, 1000);
  });
}

// 4. Start a service
function startService(svc) {
  const cwd = path.join(ROOT_DIR, svc.dir);
  const child = spawn(svc.cmd, svc.args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.serviceName = svc.name;
  child.servicePort = svc.port;
  children.push(child);

  child.stdout.on('data', chunk => {
    if (isShuttingDown) return;
    const lines = chunk.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${svc.color}[${svc.name}]${COLORS.reset} ${line}`);
      }
    });
  });

  child.stderr.on('data', chunk => {
    if (isShuttingDown) return;
    const lines = chunk.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${svc.color}[${svc.name}]${COLORS.reset} ${line}`);
      }
    });
  });

  child.on('exit', code => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.error(`${COLORS.red}[${svc.name}] exited unexpectedly with code ${code}${COLORS.reset}`);
    }
  });

  return child;
}

// 5. Shutdown all services gracefully
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n\n${COLORS.bright}${COLORS.yellow}🛑 Shutting down Inspectra full stack...${COLORS.reset}`);

  for (const child of children) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${child.pid} /T /F 2>nul`);
      } else {
        process.kill(-child.pid, 'SIGINT');
      }
    } catch (e) {
      // Process already terminated
    }
  }

  // Remove PID file
  if (fs.existsSync(PID_FILE)) {
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
  }

  console.log(`${COLORS.green}✔ All services stopped cleanly.${COLORS.reset}`);
  process.exit(exitCode);
}

// Register exit handlers
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));

// Main Orchestration Flow
async function main() {
  const isRestart = process.argv.includes('--restart');
  const isBuild = process.argv.includes('--build');

  checkPrerequisites();

  // If restart requested or PID file exists, stop previous running instances
  if (isRestart || fs.existsSync(PID_FILE)) {
    try {
      require('./stop.js');
    } catch (e) {}
  }

  // Check if any ports are currently in use
  console.log(`\n${COLORS.bright}${COLORS.blue}🔌 Checking service ports availability...${COLORS.reset}`);
  for (const svc of SERVICES) {
    const inUse = await checkPortInUse(svc.port);
    if (inUse) {
      console.warn(`   ${COLORS.yellow}⚠ Port ${svc.port} (${svc.name.trim()}) is already occupied. Attempting to free...${COLORS.reset}`);
      if (process.platform === 'win32') {
        try {
          const out = execSync(`netstat -ano | findstr :${svc.port}`, { encoding: 'utf-8' });
          const lines = out.trim().split('\n');
          for (const l of lines) {
            const parts = l.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== process.pid.toString()) {
              execSync(`taskkill /PID ${pid} /F 2>nul`);
            }
          }
        } catch (e) {}
      }
    } else {
      console.log(`   ${COLORS.green}✔${COLORS.reset} Port ${svc.port} free (${svc.name.trim()})`);
    }
  }

  console.log(`\n${COLORS.bright}${COLORS.blue}🚀 Launching all 4 Inspectra services concurrently...${COLORS.reset}\n`);

  // Start all services
  for (const svc of SERVICES) {
    console.log(`   ${svc.color}▶ Launching ${svc.name.trim()} (port ${svc.port})...${COLORS.reset}`);
    startService(svc);
  }

  // Persist PIDs
  const pidData = children.map(c => ({ name: c.serviceName.trim(), pid: c.pid, port: c.servicePort }));
  fs.writeFileSync(PID_FILE, JSON.stringify(pidData, null, 2));

  // Perform readiness probing
  console.log(`\n${COLORS.bright}${COLORS.cyan}⏳ Probing service readiness...${COLORS.reset}`);
  const probes = [
    { name: 'Test Fixtures Server', url: 'http://localhost:4000' },
    { name: 'Browser Worker', url: 'http://localhost:5001/health' },
    { name: 'Backend Orchestrator', url: 'http://localhost:8080/api/health' },
    { name: 'Frontend Cockpit', url: 'http://localhost:5173' }
  ];

  for (const probe of probes) {
    process.stdout.write(`   Waiting for ${probe.name}... `);
    try {
      await pollHealth(probe.url, 45000);
      console.log(`${COLORS.green}ONLINE ✔${COLORS.reset}`);
    } catch (err) {
      console.log(`${COLORS.red}FAILED ❌ (${err.message})${COLORS.reset}`);
      console.error(`\n${COLORS.red}Error: ${probe.name} did not become ready in time.${COLORS.reset}`);
      console.error(`Run 'npm run logs' to inspect service outputs.`);
      shutdown(1);
      return;
    }
  }

  // Final Success Banner
  console.log('\n' + '='.repeat(74));
  console.log(`${COLORS.bright}${COLORS.green}  🚀 INSPECTRA FULL STACK IS RUNNING & VERIFIED HEALTHY!${COLORS.reset}`);
  console.log('='.repeat(74));
  console.log(`  🖥️   ${COLORS.bright}Frontend Cockpit:${COLORS.reset}    ${COLORS.cyan}http://localhost:5173${COLORS.reset}`);
  console.log(`  ⚙️   ${COLORS.bright}Backend Health:${COLORS.reset}      ${COLORS.magenta}http://localhost:8080/api/health${COLORS.reset}`);
  console.log(`  🤖  ${COLORS.bright}Browser Worker:${COLORS.reset}      ${COLORS.yellow}http://localhost:5001/health${COLORS.reset}`);
  console.log(`  🎯  ${COLORS.bright}Test Fixture Site:${COLORS.reset}   ${COLORS.cyan}http://localhost:4000${COLORS.reset}`);
  console.log('='.repeat(74));
  console.log(`  💡 ${COLORS.dim}Live log streaming active. Press ${COLORS.bright}Ctrl+C${COLORS.reset}${COLORS.dim} to stop all services.${COLORS.reset}`);
  console.log('='.repeat(74) + '\n');
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  shutdown(1);
});

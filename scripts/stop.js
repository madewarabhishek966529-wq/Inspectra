#!/usr/bin/env node

/**
 * Inspectra — Stop All Services
 * Gracefully terminates all background services running on Inspectra ports.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const PID_FILE = path.join(ROOT_DIR, '.inspectra-pids.json');
const PORTS = [4000, 5001, 8080, 5173];

console.log('\n🛑 Stopping Inspectra services...');

// 1. Kill from PID file if present
if (fs.existsSync(PID_FILE)) {
  try {
    const list = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
    for (const item of list) {
      if (item.pid) {
        console.log(`   Terminating ${item.name} (PID: ${item.pid})...`);
        if (process.platform === 'win32') {
          try { execSync(`taskkill /PID ${item.pid} /T /F 2>nul`); } catch (e) {}
        } else {
          try { process.kill(item.pid, 'SIGTERM'); } catch (e) {}
        }
      }
    }
    fs.unlinkSync(PID_FILE);
  } catch (err) {
    console.warn(`   Could not parse PID file: ${err.message}`);
  }
}

// 2. Scan ports and ensure all Inspectra ports are freed
for (const port of PORTS) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
      const lines = out.trim().split('\n');
      for (const l of lines) {
        const parts = l.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== process.pid.toString()) {
          console.log(`   Freeing port ${port} (PID: ${pid})...`);
          try { execSync(`taskkill /PID ${pid} /F 2>nul`); } catch (e) {}
        }
      }
    } catch (e) {
      // Port already free
    }
  } else {
    try {
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null`);
    } catch (e) {}
  }
}

console.log('✔ All Inspectra services have been stopped.\n');

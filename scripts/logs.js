#!/usr/bin/env node

/**
 * Inspectra — Service Logs & Status Viewer
 *
 * Usage:
 *   npm run logs         # Shows status & last 50 log lines
 *   npm run logs -- -f   # Follows/tails live logs
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT_DIR, '.inspectra.log');
const PID_FILE = path.join(ROOT_DIR, '.inspectra-pids.json');

const PORTS = [
  { name: 'Target Test Fixtures', port: 4000, url: 'http://localhost:4000' },
  { name: 'Browser Worker', port: 5001, url: 'http://localhost:5001/health' },
  { name: 'Spring Boot Backend', port: 8080, url: 'http://localhost:8080/api/health' },
  { name: 'React 18 Frontend', port: 5173, url: 'http://localhost:5173' }
];

function checkService(svc) {
  return new Promise(resolve => {
    http.get(svc.url, res => {
      resolve({ ...svc, online: res.statusCode >= 200 && res.statusCode < 400 });
    }).on('error', () => {
      resolve({ ...svc, online: false });
    });
  });
}

async function main() {
  const follow = process.argv.includes('-f') || process.argv.includes('--follow');

  console.log('\n📊 === Inspectra Service Status ===');
  for (const svc of PORTS) {
    const status = await checkService(svc);
    const indicator = status.online ? '🟢 ONLINE' : '🔴 OFFLINE';
    console.log(`  ${svc.name.padEnd(24)} (Port ${svc.port}): ${indicator}`);
  }

  if (fs.existsSync(PID_FILE)) {
    try {
      const pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
      console.log('\n📌 === Active Tracked Processes ===');
      for (const p of pids) {
        console.log(`  Service: ${p.name.padEnd(12)} PID: ${p.pid} (Port ${p.port})`);
      }
    } catch (e) {}
  }

  console.log('\n📄 === Inspectra Logs (Last 50 entries) ===\n');

  if (!fs.existsSync(LOG_FILE)) {
    console.log('No log file (.inspectra.log) found. Start the platform using: npm run dev\n');
    return;
  }

  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const tail = lines.slice(-50);
  tail.forEach(l => console.log(l));

  if (follow) {
    console.log('\n👀 Following live log stream (Press Ctrl+C to exit)...');
    let currentSize = fs.statSync(LOG_FILE).size;

    fs.watchFile(LOG_FILE, { interval: 500 }, curr => {
      if (curr.size > currentSize) {
        const stream = fs.createReadStream(LOG_FILE, {
          start: currentSize,
          end: curr.size
        });
        stream.on('data', chunk => {
          process.stdout.write(chunk.toString());
        });
        currentSize = curr.size;
      }
    });
  } else {
    console.log('\n💡 Tip: Run \'npm run logs -- -f\' to stream logs in real time.\n');
  }
}

main().catch(console.error);

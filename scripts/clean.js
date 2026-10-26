#!/usr/bin/env node

/**
 * Inspectra — Development Artifact Cleaner
 *
 * Safely removes disposable build artifacts and temporary files.
 * GUARANTEE: Does NOT delete database data (./data) or saved audit artifacts (./artifacts).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const DISPOSABLE_PATHS = [
  path.join(ROOT_DIR, 'frontend', 'dist'),
  path.join(ROOT_DIR, 'worker', 'dist'),
  path.join(ROOT_DIR, 'backend', 'target'),
  path.join(ROOT_DIR, '.inspectra-pids.json'),
  path.join(ROOT_DIR, '.inspectra.log')
];

console.log('\n🧹 === Inspectra Clean Utility ===');
console.log('The following disposable build artifacts will be removed:');
DISPOSABLE_PATHS.forEach(p => console.log(` - ${path.relative(ROOT_DIR, p)}`));

console.log('\n🛡️  PRESERVED (Safe from deletion):');
console.log(' - ./data (Persistent H2 Database & test histories)');
console.log(' - ./artifacts (Audit screenshots & reports)');
console.log(' - .env (Configuration variables)\n');

let removedCount = 0;

for (const target of DISPOSABLE_PATHS) {
  if (fs.existsSync(target)) {
    try {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
      } else {
        fs.unlinkSync(target);
      }
      console.log(`✔ Removed: ${path.relative(ROOT_DIR, target)}`);
      removedCount++;
    } catch (err) {
      console.warn(`⚠ Could not remove ${target}: ${err.message}`);
    }
  }
}

if (removedCount === 0) {
  console.log('✨ Workspace is already clean. No disposable artifacts found.');
} else {
  console.log(`\n✔ Clean completed: ${removedCount} artifact(s) removed.`);
}
console.log('Database and audit histories preserved.\n');

#!/usr/bin/env node

/**
 * Inspectra — End-to-End Automated Integration Test Suite
 *
 * Verifies:
 *  1. All 4 service health endpoints
 *  2. Frontend-to-backend proxying
 *  3. Backend-to-worker and database connectivity
 *  4. User authentication & JWT flow
 *  5. Project creation & validation
 *  6. Real autonomous scan against test-fixtures (port 4000)
 *  7. Findings discovery & scoring
 *  8. Multi-format report export
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to make HTTP requests
function request(url, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 15000
    };

    const req = http.request(reqOpts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout connecting to ${url}`));
    });

    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 INSPECTRA END-TO-END AUTOMATED INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name, fn) {
    totalTests++;
    process.stdout.write(` [Test ${totalTests}] ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passedTests++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error(`          Reason: ${err.message}`);
    }
  }

  // --- Step 1: Health Probes ---
  await test('Test Fixtures server response (port 4000)', async () => {
    const res = await request('http://localhost:4000');
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
  });

  await test('Browser Worker /health endpoint (port 5001)', async () => {
    const res = await request('http://localhost:5001/health');
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
    if (res.json?.status !== 'healthy') throw new Error(`Expected status 'healthy', got ${res.json?.status}`);
  });

  await test('Backend Orchestrator /api/health endpoint (port 8080)', async () => {
    const res = await request('http://localhost:8080/api/health');
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
    if (res.json?.backend !== 'UP') throw new Error(`Expected backend 'UP', got ${res.json?.backend}`);
  });

  await test('Frontend Cockpit dashboard response (port 5173)', async () => {
    const res = await request('http://localhost:5173');
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
  });

  // --- Step 2: Inter-Service Connectivity ---
  await test('Frontend -> Backend proxy verification (/api/health through port 5173)', async () => {
    const res = await request('http://localhost:5173/api/health');
    if (res.statusCode !== 200) throw new Error(`Proxy returned HTTP ${res.statusCode}`);
    if (res.json?.backend !== 'UP') throw new Error('Proxied health response invalid');
  });

  await test('Backend -> Worker inter-service connection', async () => {
    const res = await request('http://localhost:8080/api/health');
    if (res.json?.worker !== 'CONNECTED') {
      throw new Error(`Worker status is ${res.json?.worker || 'UNKNOWN'}`);
    }
  });

  // --- Step 3: Auth & Security ---
  let authToken = null;
  const testUser = {
    email: `ci-engineer-${Date.now()}@inspectra.ai`,
    password: 'Password123!'
  };

  await test('User Registration & JWT issuance (/api/auth/register)', async () => {
    const res = await request('http://localhost:8080/api/auth/register', { method: 'POST' }, testUser);
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`Registration failed with status ${res.statusCode}: ${res.body}`);
    }
    authToken = res.json?.token;
    if (!authToken) throw new Error('No JWT token returned');
  });

  await test('JWT Authentication validation (/api/auth/me)', async () => {
    const res = await request('http://localhost:8080/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`Expected HTTP 200, got ${res.statusCode}`);
    if (res.json?.email !== testUser.email) throw new Error('User identity mismatch');
  });

  // --- Step 4: Project Management ---
  let testProject = null;
  await test('Project creation pointing to local test fixture', async () => {
    const payload = {
      name: `CI Test Project ${Date.now()}`,
      description: 'Automated integration test against local test fixture site',
      targetUrl: 'http://localhost:4000'
    };
    const res = await request('http://localhost:8080/api/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, payload);

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`Failed to create project: ${res.body}`);
    }
    testProject = res.json;
    if (!testProject?.id) throw new Error('No project ID returned');
  });

  // --- Step 5: Autonomous End-to-End Test Run ---
  let runId = null;
  await test('Trigger autonomous audit run against target fixture', async () => {
    const res = await request(`http://localhost:8080/api/projects/${testProject.id}/runs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      targetUrl: 'http://localhost:4000',
      allowPrivateIps: true,
      maxPages: 3
    });

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      throw new Error(`Failed to queue run: ${res.body}`);
    }
    runId = res.json?.id;
    if (!runId) throw new Error('No run ID returned');
  });

  let completedRun = null;
  await test('Autonomous crawl, test execution, and scoring completion', async () => {
    const maxPolls = 40;
    for (let i = 0; i < maxPolls; i++) {
      await sleep(1500);
      const res = await request(`http://localhost:8080/api/runs/${runId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (res.statusCode === 200) {
        const run = res.json;
        if (run.status === 'COMPLETED') {
          completedRun = run;
          break;
        } else if (run.status === 'FAILED') {
          throw new Error(`Run marked as FAILED`);
        }
      }
    }

    if (!completedRun) {
      throw new Error('Test run timed out waiting for completion');
    }

    if (typeof completedRun.overallScore !== 'number') {
      throw new Error('Run completed without calculating overall score');
    }
  });

  // --- Step 6: Findings & Reports ---
  await test('Findings detection and categorization', async () => {
    const res = await request(`http://localhost:8080/api/findings?runId=${runId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (res.statusCode !== 200) throw new Error(`Findings query failed: ${res.statusCode}`);
    const findings = Array.isArray(res.json) ? res.json : [];
    if (findings.length === 0) {
      throw new Error('Expected test fixtures to yield intentional defects, got 0 findings');
    }
  });

  await test('Report export in Markdown format (/report.md)', async () => {
    const res = await request(`http://localhost:8080/api/runs/${runId}/report.md`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.statusCode !== 200) throw new Error(`Markdown export returned ${res.statusCode}`);
    if (!res.body.includes('Inspectra') && !res.body.includes('Audit Report')) {
      throw new Error('Markdown report does not contain expected header');
    }
  });

  // --- Step 7: Persistence Check ---
  await test('Database state persistence on disk', async () => {
    const candidateDirs = [
      path.join(ROOT_DIR, 'backend', 'data'),
      path.join(ROOT_DIR, 'data')
    ];
    const hasDb = candidateDirs.some(dir => {
      if (!fs.existsSync(dir)) return false;
      const files = fs.readdirSync(dir);
      return files.some(f => f.includes('inspectradb'));
    });
    if (!hasDb) throw new Error('H2 database file not found in ./backend/data or ./data directory');
  });

  // --- Summary ---
  console.log('\n================================================================');
  console.log(`📊 INTEGRATION TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('================================================================');

  if (completedRun) {
    console.log(`  🎯 Target:        ${completedRun.targetUrl}`);
    console.log(`  ⭐ Overall Score: ${completedRun.overallScore}/100`);
    console.log(`  ⏱️  Duration:      ${completedRun.durationMs}ms`);
    console.log(`  🆔 Run ID:        ${completedRun.id}`);
  }
  console.log('================================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});

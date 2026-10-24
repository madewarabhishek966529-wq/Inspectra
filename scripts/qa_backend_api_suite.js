const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://localhost:8000';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      if (typeof postData === 'object') {
        postData = JSON.stringify(postData);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const start = Date.now();
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const durationMs = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: data,
          durationMs
        });
      });
    });

    req.on('error', err => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

const testResults = [];

function record(suite, testName, expected, actual, passed, details = {}) {
  const result = {
    suite,
    testName,
    expected,
    actual,
    passed,
    ...details
  };
  testResults.push(result);
  const statusMark = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusMark} [${suite}] ${testName} (${details.durationMs ? details.durationMs + 'ms' : ''})`);
  if (!passed) {
    console.log(`   Expected: ${expected} | Actual: ${actual}`);
    if (details.note) console.log(`   Note: ${details.note}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 EXECUTING DEVINSIGHTS API & SECURITY TEST SUITE');
  console.log('Target: ' + BASE_URL);
  console.log('====================================================\n');

  // 1. System Health & Root
  try {
    const res = await request({ path: '/api/health' });
    record('System Health', 'GET /api/health returns 200 OK', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      response: res.body
    });
  } catch (err) {
    record('System Health', 'GET /api/health returns 200 OK', '200 OK', err.message, false);
  }

  try {
    const res = await request({ path: '/' });
    record('Root', 'GET / returns 200 or 404', '200 or 404', res.statusCode, res.statusCode === 200 || res.statusCode === 404, {
      durationMs: res.durationMs,
      response: res.body
    });
  } catch (err) {
    record('Root', 'GET / returns 200', '200', err.message, false);
  }

  // 2. Security Headers & CORS Check
  try {
    const res = await request({ path: '/api/health' });
    const h = res.headers;
    const hasCors = !!h['access-control-allow-origin'];
    record('Security & Headers', 'CORS headers configured', 'Header present', hasCors ? h['access-control-allow-origin'] : 'Missing', hasCors, {
      headers: h
    });

    const hasNoSniff = h['x-content-type-options'] === 'nosniff';
    record('Security & Headers', 'X-Content-Type-Options: nosniff', 'nosniff', h['x-content-type-options'] || 'Missing', hasNoSniff, {
      note: 'Protects against MIME sniffing vulnerabilities'
    });

    const hasFrameOptions = !!h['x-frame-options'];
    record('Security & Headers', 'X-Frame-Options configured', 'DENY or SAMEORIGIN', h['x-frame-options'] || 'Missing', hasFrameOptions, {
      note: 'Protects against clickjacking'
    });
  } catch (err) {
    record('Security & Headers', 'Header inspection', 'Complete', err.message, false);
  }

  // 3. User Preferences CRUD
  let initialPrefs = null;
  try {
    const res = await request({ path: '/api/preferences' });
    record('Preferences', 'GET /api/preferences returns 200', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      body: res.body
    });
    initialPrefs = res.body;
  } catch (err) {
    record('Preferences', 'GET /api/preferences returns 200', '200 OK', err.message, false);
  }

  try {
    const updatePayload = {
      theme: 'dark',
      default_timeframe: '90d',
      excluded_languages: ['HTML', 'CSS']
    };
    const res = await request({ path: '/api/preferences', method: 'POST' }, updatePayload);
    record('Preferences', 'POST /api/preferences saves preferences', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      body: res.body
    });

    // Verify GET persists
    const verifyRes = await request({ path: '/api/preferences' });
    const isUpdated = verifyRes.body && verifyRes.body.theme === 'dark';
    record('Preferences', 'GET /api/preferences verifies persistence', 'theme == dark', verifyRes.body ? verifyRes.body.theme : 'null', isUpdated, {
      persisted: verifyRes.body
    });
  } catch (err) {
    record('Preferences', 'POST /api/preferences persistence', 'Success', err.message, false);
  }

  // 4. Developer Analytics Endpoints (Valid username: 'octocat')
  const devEndpoints = [
    '/api/developers/octocat/overview',
    '/api/developers/octocat/repositories',
    '/api/developers/octocat/languages',
    '/api/developers/octocat/activity',
    '/api/developers/octocat/contributions',
    '/api/developers/octocat/portfolio-audit',
    '/api/developers/octocat/insights'
  ];

  for (const ep of devEndpoints) {
    try {
      const res = await request({ path: ep });
      const pass = res.statusCode === 200;
      record('Developer Endpoints', `GET ${ep}`, '200 OK', res.statusCode, pass, {
        durationMs: res.durationMs,
        isObj: typeof res.body === 'object'
      });
    } catch (err) {
      record('Developer Endpoints', `GET ${ep}`, '200 OK', err.message, false);
    }
  }

  // 5. Repository Health Endpoint
  try {
    const res = await request({ path: '/api/repositories/octocat/Hello-World/health' });
    record('Repository Health', 'GET /api/repositories/octocat/Hello-World/health', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Repository Health', 'GET /api/repositories/octocat/Hello-World/health', '200 OK', err.message, false);
  }

  // 6. Developer Compare Endpoint
  try {
    const res = await request({ path: '/api/developers/compare?usernames=octocat,torvalds' });
    record('Developer Compare', 'GET /api/developers/compare (2 valid usernames)', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      count: Array.isArray(res.body) ? res.body.length : (res.body ? Object.keys(res.body).length : 0)
    });
  } catch (err) {
    record('Developer Compare', 'GET /api/developers/compare (2 valid usernames)', '200 OK', err.message, false);
  }

  // 7. Developer Snapshot Lifecycle
  try {
    const postRes = await request({ path: '/api/snapshots/octocat', method: 'POST' }, {
      label: 'QA Regression Test Snapshot',
      metrics: { score: 95 }
    });
    record('Snapshots', 'POST /api/snapshots/octocat creates snapshot', '200 or 201', postRes.statusCode, postRes.statusCode === 200 || postRes.statusCode === 201, {
      durationMs: postRes.durationMs,
      body: postRes.body
    });

    const getRes = await request({ path: '/api/snapshots/octocat' });
    const hasSnapshots = Array.isArray(getRes.body) || (getRes.body && getRes.body.snapshots);
    record('Snapshots', 'GET /api/snapshots/octocat retrieves snapshots list', '200 OK with list', `${getRes.statusCode}`, getRes.statusCode === 200 && !!hasSnapshots, {
      durationMs: getRes.durationMs,
      body: getRes.body
    });
  } catch (err) {
    record('Snapshots', 'Developer Snapshot Lifecycle', 'Success', err.message, false);
  }

  // 8. Report Export Endpoint
  try {
    const exportPayload = {
      username: 'octocat',
      sections: ['overview', 'languages', 'repositories'],
      format: 'json'
    };
    const res = await request({ path: '/api/reports/export', method: 'POST' }, exportPayload);
    record('Reports Export', 'POST /api/reports/export with valid JSON request', '200 OK', res.statusCode, res.statusCode === 200, {
      durationMs: res.durationMs,
      contentType: res.headers['content-type']
    });
  } catch (err) {
    record('Reports Export', 'POST /api/reports/export valid', '200 OK', err.message, false);
  }

  // 9. Negative, Edge Cases & Error Handling Tests
  // 9a. Non-existent developer
  try {
    const res = await request({ path: '/api/developers/this-user-definitely-does-not-exist-xyz9999/overview' });
    record('Negative Testing', 'GET overview for non-existent user returns 404', '404 Not Found', `${res.statusCode}`, res.statusCode === 404, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Negative Testing', 'Non-existent user 404 check', '404', err.message, false);
  }

  // 9b. Developer Compare boundary: only 1 username provided (requires 2-4)
  try {
    const res = await request({ path: '/api/developers/compare?usernames=octocat' });
    record('Negative Testing', 'Compare with only 1 user returns 400 or 422', '400 or 422', `${res.statusCode}`, res.statusCode === 400 || res.statusCode === 422, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Negative Testing', 'Compare 1 user boundary', '400 or 422', err.message, false);
  }

  // 9c. Developer Compare boundary: > 4 usernames provided (e.g. 5 users)
  try {
    const res = await request({ path: '/api/developers/compare?usernames=octocat,torvalds,gaearon,sindresorhus,addyosmani' });
    record('Negative Testing', 'Compare with > 4 users returns 400 or 422', '400 or 422', `${res.statusCode}`, res.statusCode === 400 || res.statusCode === 422, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Negative Testing', 'Compare >4 users boundary', '400 or 422', err.message, false);
  }

  // 9d. Malformed JSON payload on POST
  try {
    const res = await request({
      path: '/api/preferences',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, '{"theme": "dark", INVALID_JSON');
    record('Negative Testing', 'Malformed JSON payload returns 400 or 422', '400 or 422', `${res.statusCode}`, res.statusCode === 400 || res.statusCode === 422, {
      durationMs: res.durationMs
    });
  } catch (err) {
    record('Negative Testing', 'Malformed JSON payload', '400 or 422', err.message, false);
  }

  // 9e. HTTP Method Not Allowed (e.g. DELETE on /api/health)
  try {
    const res = await request({ path: '/api/health', method: 'DELETE' });
    record('Negative Testing', 'DELETE /api/health returns 405 Method Not Allowed', '405', `${res.statusCode}`, res.statusCode === 405, {
      durationMs: res.durationMs
    });
  } catch (err) {
    record('Negative Testing', 'Method Not Allowed check', '405', err.message, false);
  }

  // 10. Security Injection & Path Traversal Tests
  // 10a. Path Traversal in username parameter
  try {
    const res = await request({ path: '/api/developers/..%2F..%2F..%2Fetc%2Fpasswd/overview' });
    const safe = res.statusCode === 404 || res.statusCode === 400 || res.statusCode === 422;
    record('Security Tests', 'Path traversal in {username} blocked', '400/404/422', `${res.statusCode}`, safe, {
      durationMs: res.durationMs,
      note: 'Must not expose filesystem or cause 500 error'
    });
  } catch (err) {
    record('Security Tests', 'Path traversal check', 'Safe handling', err.message, false);
  }

  // 10b. SQL Injection payload in username
  try {
    const res = await request({ path: "/api/developers/octocat' OR '1'='1/overview" });
    const safe = res.statusCode !== 500 && (res.statusCode === 404 || res.statusCode === 400 || res.statusCode === 422);
    record('Security Tests', 'SQL Injection in {username} handled safely', '400/404/422 (Not 500)', `${res.statusCode}`, safe, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Security Tests', 'SQL Injection check', 'Safe handling', err.message, false);
  }

  // 10c. XSS injection payload in snapshot label
  try {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request({ path: '/api/snapshots/octocat', method: 'POST' }, {
      label: xssPayload,
      metrics: {}
    });
    record('Security Tests', 'XSS payload in snapshot label stored/sanitized without 500', '200 or 400 (Not 500)', `${res.statusCode}`, res.statusCode !== 500, {
      durationMs: res.durationMs,
      body: res.body
    });
  } catch (err) {
    record('Security Tests', 'XSS check in snapshot label', 'Not 500', err.message, false);
  }

  // 10d. Very long username string (> 1000 characters buffer overflow / DoS check)
  try {
    const longUsername = 'a'.repeat(2000);
    const res = await request({ path: `/api/developers/${longUsername}/overview` });
    const safe = res.statusCode === 414 || res.statusCode === 422 || res.statusCode === 400 || res.statusCode === 404;
    record('Security Tests', 'Oversized parameter handled without server crash', '400/404/414/422 (Not 500)', `${res.statusCode}`, safe, {
      durationMs: res.durationMs
    });
  } catch (err) {
    record('Security Tests', 'Oversized parameter check', 'Handled gracefully', err.message, false);
  }

  // 11. Performance & Latency Summary
  console.log('\n====================================================');
  console.log('📊 TEST RUN SUMMARY');
  console.log('====================================================');
  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Executed Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);

  const reportData = {
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: `${passRate}%`,
    results: testResults
  };

  fs.writeFileSync('devinsights_api_test_results.json', JSON.stringify(reportData, null, 2));
  console.log('\nResults saved to devinsights_api_test_results.json');
}

runAllTests().catch(console.error);

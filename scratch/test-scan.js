const http = require('http');

async function main() {
  const email = 'engineer@inspectra.ai';
  const password = 'Password123!';

  // 1. Authenticate (login or register)
  let token = null;
  try {
    const regRes = await postJson('http://localhost:8080/api/auth/register', { email, password });
    token = regRes.token;
    console.log('Registered successfully. Token acquired.');
  } catch (err) {
    console.log('Register failed, attempting login...');
    const loginRes = await postJson('http://localhost:8080/api/auth/login', { email, password });
    token = loginRes.token;
    console.log('Logged in successfully. Token acquired.');
  }

  // 2. Create or find project
  let projects = await getJson('http://localhost:8080/api/projects', token);
  let project = projects.find(p => p.targetUrl === 'http://localhost:4000');
  if (!project) {
    console.log('Creating test project for http://localhost:4000...');
    project = await postJson('http://localhost:8080/api/projects', {
      name: 'Local Test Fixture Portal',
      description: 'End-to-End local validation site with intentional defects',
      targetUrl: 'http://localhost:4000'
    }, token);
    console.log('Project created:', project.id);
  } else {
    console.log('Found existing project:', project.id);
  }

  // 3. Trigger test run
  console.log('Triggering test run for project', project.id, '...');
  const run = await postJson(`http://localhost:8080/api/projects/${project.id}/runs`, {}, token);
  console.log('Test run queued:', run.id, 'Status:', run.status);

  // 4. Poll until completed (or timeout)
  console.log('Polling run status...');
  let completedRun = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await getJson(`http://localhost:8080/api/runs/${run.id}`, token);
    console.log(`[${i+1}/30] Status: ${statusRes.status}, Score: ${statusRes.overallScore}`);
    if (statusRes.status === 'COMPLETED' || statusRes.status === 'FAILED') {
      completedRun = statusRes;
      break;
    }
  }

  if (!completedRun) {
    console.error('Scan timed out or did not complete within 60s');
    process.exit(1);
  }

  console.log('\n=== SCAN RUN COMPLETED ===');
  console.log('Run ID:', completedRun.id);
  console.log('Status:', completedRun.status);
  console.log('Overall Score (0-100):', completedRun.overallScore);
  console.log('Duration (ms):', completedRun.durationMs);
  console.log('Scoring Version:', completedRun.scoringVersion);
  console.log('Metrics JSON:', completedRun.metricsJson);

  // 5. Fetch Full Report & Findings
  const fullReport = await getJson(`http://localhost:8080/api/runs/${run.id}/report`, token);
  const results = fullReport.results || [];
  console.log(`\nExecuted Tests Count: ${results.length}`);
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped (Safe): ${skipped}`);
  results.slice(0, 10).forEach(r => console.log(` - [${r.status.toUpperCase()}] [${r.category}] ${r.name}`));

  const findings = await getJson(`http://localhost:8080/api/findings?runId=${run.id}`, token);
  console.log(`\nConfirmed Findings Count: ${findings.length}`);
  findings.slice(0, 10).forEach(f => console.log(` - [${f.severity.toUpperCase()}] [${f.category}] ${f.title} (${f.affectedUrl})`));

  // 6. Test HTML Report Download
  const htmlReport = await getText(`http://localhost:8080/api/runs/${run.id}/report.html`, token);
  console.log(`\nHTML Report Download Verified: ${htmlReport.length} bytes (starts with: ${htmlReport.substring(0, 30)}...)`);

  // 7. Test PDF Report Download
  const pdfReport = await getBuffer(`http://localhost:8080/api/runs/${run.id}/report.pdf`, token);
  console.log(`PDF Report Download Verified: ${pdfReport.length} bytes (magic bytes: ${pdfReport.subarray(0, 4).toString()})`);

  console.log('\nSUCCESS! Real workflow verified end-to-end.');
}

function postJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); } catch { resolve(buf); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    http.get(options, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); } catch { resolve(buf); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${buf}`));
        }
      });
    }).on('error', reject);
  });
}

function getText(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    http.get({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve(buf));
    }).on('error', reject);
  });
}

function getBuffer(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    http.get({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

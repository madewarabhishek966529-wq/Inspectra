const http = require('http');

async function main() {
  const email = 'engineer@inspectra.ai';
  const password = 'Password123!';

  // Login
  const loginRes = await postJson('http://localhost:8080/api/auth/login', { email, password });
  const token = loginRes.token;

  // Create project for https://example.com
  let project = await postJson('http://localhost:8080/api/projects', {
    name: 'Example Domain Public Audit',
    description: 'Real-world public web scan test against RFC 2606 example domain',
    targetUrl: 'https://example.com'
  }, token);
  console.log('Project created for https://example.com:', project.id);

  // Trigger run
  const run = await postJson(`http://localhost:8080/api/projects/${project.id}/runs`, {}, token);
  console.log('Public scan queued:', run.id);

  // Poll
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
    console.error('Public scan timed out');
    process.exit(1);
  }

  console.log('\n=== PUBLIC SCAN COMPLETED ===');
  console.log('Run ID:', completedRun.id);
  console.log('Target URL:', completedRun.targetUrl);
  console.log('Status:', completedRun.status);
  console.log('Overall Score (0-100):', completedRun.overallScore);
  console.log('Duration (ms):', completedRun.durationMs);
  console.log('Metrics JSON:', completedRun.metricsJson);

  const fullReport = await getJson(`http://localhost:8080/api/runs/${run.id}/report`, token);
  const results = fullReport.results || [];
  console.log(`\nTotal Executed Tests: ${results.length}`);
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);

  const findings = await getJson(`http://localhost:8080/api/findings?runId=${run.id}`, token);
  console.log(`\nFindings Identified: ${findings.length}`);
  findings.forEach(f => console.log(` - [${f.severity.toUpperCase()}] [${f.category}] ${f.title}`));
}

function postJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    http.get({
      hostname: u.hostname, port: u.port, path: u.pathname + (u.search || ''),
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, res => {
      let buf = ''; res.on('data', c => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    }).on('error', reject);
  });
}

main().catch(console.error);

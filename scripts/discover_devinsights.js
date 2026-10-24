const fs = require('fs');
const http = require('http');

let raw = fs.readFileSync('devinsights_openapi.json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}
const spec = JSON.parse(raw);

console.log('=== DEVINSIGHTS API ENDPOINT DISCOVERY ===');
console.log('API Title:', spec.info.title, 'Version:', spec.info.version);
console.log('Endpoints found:');
const endpoints = [];
for (const [p, methods] of Object.entries(spec.paths)) {
  for (const [m, details] of Object.entries(methods)) {
    endpoints.push({
      path: p,
      method: m.toUpperCase(),
      summary: details.summary || details.operationId,
      parameters: details.parameters || [],
      requestBody: !!details.requestBody,
      tags: details.tags || []
    });
    console.log(`- [${m.toUpperCase()}] ${p} (${details.summary})`);
  }
}

fs.writeFileSync('devinsights_discovered_endpoints.json', JSON.stringify(endpoints, null, 2));
console.log('Total endpoints discovered:', endpoints.length);

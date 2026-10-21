import { BrowserWorkerExecutor } from './executor.js';
import { RunConfig } from './types.js';

async function main() {
  console.log('=== Starting Inspectra Worker Verification Test ===');
  const executor = new BrowserWorkerExecutor();

  const config: RunConfig = {
    runId: `verification-test-${Date.now()}`,
    projectId: 'test-project-001',
    targetUrl: 'http://localhost:4000',
    categories: ['functional', 'navigation', 'forms', 'responsive', 'accessibility', 'seo', 'console', 'network'],
    viewports: [
      { name: 'Desktop (1440x900)', width: 1440, height: 900 },
      { name: 'Mobile (390x844)', width: 390, height: 844 }
    ],
    maxPages: 6,
    maxExecutionTimeMs: 60000,
    allowPrivateIps: true // authorized test bed
  };

  const report = await executor.executeRun(config, ev => {
    console.log(`[Event ${ev.type}] (${ev.step}) ${ev.message}`);
  });

  console.log('\n================ RUN RESULTS ================');
  console.log(`Status: ${report.status}`);
  console.log(`Discovered Pages: ${report.pagesDiscovered.length}`);
  console.log(`Executed Checks: ${report.results.length}`);
  console.log(`Total Findings: ${report.findings.length}`);
  console.log(`Overall Quality Score: ${report.metrics.overallScore}/100`);
  console.log(`Accessibility Score: ${report.metrics.accessibilityScore}/100`);
  console.log(`Responsive Score: ${report.metrics.responsiveScore}/100`);
  console.log(`SEO Score: ${report.metrics.seoScore}/100`);
  console.log(`Artifacts Captured: ${report.artifacts.length}`);

  console.log('\nTop Detected Defects:');
  report.findings.slice(0, 8).forEach((f, idx) => {
    console.log(` [${idx + 1}] [${f.severity.toUpperCase()}] (${f.category}) ${f.title}`);
  });

  if (report.findings.length > 0 && report.results.length > 0) {
    console.log('\n✓ Self-Verification Test Passed! Worker accurately detected seeded flaws in fixture.');
    process.exit(0);
  } else {
    console.error('\n✗ Verification Failed: No defects or results detected.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal Worker Error:', err);
  process.exit(1);
});

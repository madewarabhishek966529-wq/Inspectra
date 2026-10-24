import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function runDevInsightsE2E() {
  console.log('====================================================');
  console.log('🧪 DEVINSIGHTS PLAYWRIGHT E2E & WCAG AUDIT');
  console.log('Target: http://localhost:5173');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results: any[] = [];
  const artifactsDir = path.resolve(__dirname, '../../devinsights_test_artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const record = (category: string, name: string, passed: boolean, details: any = {}) => {
    results.push({ category, name, passed, ...details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${category}] ${name}`);
    if (!passed && details.error) console.log(`   Error: ${details.error}`);
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => pageErrors.push(err.message));

    // 1. Initial Page Load & Performance
    const navStart = Date.now();
    const response = await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
    const loadTimeMs = Date.now() - navStart;
    const status = response ? response.status() : 0;

    record('Page Load', 'Initial navigation to http://localhost:5173', status === 200, {
      status,
      loadTimeMs
    });

    const title = await page.title();
    console.log(`Page title: "${title}"`);
    record('Metadata', 'HTML Title tag present and non-empty', title.length > 0, { title });

    // Save Desktop Screenshot
    const desktopScreenshot = path.join(artifactsDir, 'screenshot_desktop_landing.png');
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    console.log(`Saved screenshot: ${desktopScreenshot}`);

    // 2. Search Bar Interaction
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[placeholder*="user" i]').first();
    const hasSearch = await searchInput.count() > 0;
    record('UI Components', 'Developer search input field visible', hasSearch);

    if (hasSearch) {
      await searchInput.fill('octocat');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);

      // Verify developer cards or profile content rendered
      const bodyText = await page.innerText('body');
      const foundOctocat = bodyText.toLowerCase().includes('octocat');
      record('Search Flow', 'Search for "octocat" renders developer profile data', foundOctocat, {
        snippetLength: bodyText.length
      });

      // Save Profile Screenshot
      const profileScreenshot = path.join(artifactsDir, 'screenshot_profile_octocat.png');
      await page.screenshot({ path: profileScreenshot, fullPage: true });
      console.log(`Saved screenshot: ${profileScreenshot}`);
    }

    // 3. Accessibility Scan via Axe-Core
    try {
      const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
      await page.evaluate(axeSource);
      const axeResults: any = await page.evaluate(async () => {
        // @ts-ignore
        return await window.axe.run();
      });

      console.log(`\nAccessibility Violations Found: ${axeResults.violations.length}`);
      const criticalA11y = axeResults.violations.filter((v: any) => v.impact === 'critical' || v.impact === 'serious');
      record('Accessibility', 'Zero critical/serious WCAG violations', criticalA11y.length === 0, {
        totalViolations: axeResults.violations.length,
        criticalCount: criticalA11y.length,
        violations: axeResults.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          nodesCount: v.nodes.length
        }))
      });
    } catch (axeErr: any) {
      record('Accessibility', 'Axe-core scan execution', false, { error: axeErr.message });
    }

    // 4. Responsive Viewport Audits
    // 4a. Mobile (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    record('Responsive', 'Mobile (390x844) viewport has no horizontal overflow', !mobileOverflow, {
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      innerWidth: 390
    });
    const mobileScreenshot = path.join(artifactsDir, 'screenshot_mobile_390.png');
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    // 4b. Tablet (768 x 1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    record('Responsive', 'Tablet (768x1024) viewport has no horizontal overflow', !tabletOverflow);
    const tabletScreenshot = path.join(artifactsDir, 'screenshot_tablet_768.png');
    await page.screenshot({ path: tabletScreenshot, fullPage: true });

    // 5. Console & Page Errors
    record('Console Stability', 'Zero uncaught JavaScript console errors', pageErrors.length === 0, {
      errors: pageErrors,
      consoleLogsCount: consoleLogs.length
    });

    await context.close();
  } catch (err: any) {
    record('Execution', 'End-to-end execution', false, { error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('📊 DEVINSIGHTS E2E TEST SUMMARY');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`Total E2E Tests: ${total} | Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%`);

  fs.writeFileSync(
    path.resolve(__dirname, '../../devinsights_e2e_results.json'),
    JSON.stringify({ total, passed, failed, passRate: `${passRate}%`, results }, null, 2)
  );
  console.log('Saved devinsights_e2e_results.json\n');
}

runDevInsightsE2E().catch(console.error);

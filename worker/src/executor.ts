import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import {
  DiscoveredPage,
  ExecutionEventPayload,
  Finding,
  QualityMetrics,
  RunConfig,
  TestResultItem,
  WorkerRunReport
} from './types.js';
import { validateTargetUrl } from './ssrf.js';
import { crawlWebsite } from './crawler.js';
import { runFunctionalChecks } from './checks/functional.js';
import { runAccessibilityChecks } from './checks/a11y.js';
import { runResponsiveChecks } from './checks/responsive.js';
import { runSeoChecks } from './checks/seo.js';
import { runVisualCheck } from './checks/visual.js';
import { runPerformanceChecks, PerformanceCheckResult } from './checks/performance.js';
import { runSecurityChecks, SecurityCheckResult } from './checks/security.js';


export class BrowserWorkerExecutor {
  private activeRuns: Map<string, { browser: Browser; isCancelled: boolean }> = new Map();

  public cancelRun(runId: string): boolean {
    const active = this.activeRuns.get(runId);
    if (active) {
      active.isCancelled = true;
      active.browser.close().catch(() => {});
      return true;
    }
    return false;
  }

  public async executeRun(
    config: RunConfig,
    onEvent: (event: ExecutionEventPayload) => void
  ): Promise<WorkerRunReport> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const artifactsDir = config.artifactsDir || path.resolve(process.cwd(), 'artifacts', config.runId);
    fs.mkdirSync(artifactsDir, { recursive: true });

    const emit = (
      type: ExecutionEventPayload['type'],
      step: string,
      message: string,
      details?: Record<string, any>
    ) => {
      onEvent({
        runId: config.runId,
        type,
        step,
        message,
        timestamp: new Date().toISOString(),
        details
      });
    };

    // 1. URL Security & SSRF Validation
    emit('STATE_CHANGE', 'VALIDATING', `Validating target URL security and network boundary for ${config.targetUrl}...`);
    const ssrfCheck = await validateTargetUrl(config.targetUrl, config.allowPrivateIps);
    if (!ssrfCheck.safe) {
      emit('STEP_FAILURE', 'VALIDATING', `Target URL rejected: ${ssrfCheck.reason}`);
      const errReport: WorkerRunReport = {
        runId: config.runId,
        targetUrl: config.targetUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: 'FAILED',
        pagesDiscovered: [],
        results: [
          {
            id: `sec-reject-${Date.now()}`,
            name: 'Target URL Security & SSRF Validation',
            category: 'functional',
            url: config.targetUrl,
            status: 'failed',
            durationMs: Date.now() - startTime,
            expectedOutcome: 'Target URL complies with security egress policies',
            actualOutcome: `Blocked: ${ssrfCheck.reason}`,
            errorSummary: ssrfCheck.reason
          }
        ],
        findings: [
          {
            id: `sec-finding-${Date.now()}`,
            title: 'SSRF Boundary Violation or Invalid Target URL',
            category: 'functional',
            severity: 'critical',
            affectedUrl: config.targetUrl,
            description: ssrfCheck.reason || 'Restricted network destination blocked by security policy.',
            reproductionSteps: [`Submit target ${config.targetUrl}`],
            expectedResult: 'Valid publicly resolvable domain or authorized test fixture',
            actualResult: ssrfCheck.reason || 'Blocked',
            suggestedFix: 'Provide a valid public URL or explicitly authorize private network testing.',
            confidence: 1.0,
            verificationStatus: 'verified'
          }
        ],
        metrics: this.computeMetrics([], [{} as any]),
        artifacts: []
      };
      emit('STATE_CHANGE', 'FAILED', `Execution failed security validation: ${ssrfCheck.reason}`);
      return errReport;
    }

    // 2. Launch Browser
    emit('STATE_CHANGE', 'STARTING_WORKER', 'Launching isolated Chromium browser instance...');
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--mute-audio'
        ]
      });

      this.activeRuns.set(config.runId, { browser, isCancelled: false });

      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) InspectraBot/1.0 (+https://inspectra.ai/bot)'
      });

      page = await context.newPage();
    } catch (err: any) {
      emit('STEP_FAILURE', 'STARTING_WORKER', `Failed to start Chromium browser: ${err.message}`);
      throw err;
    }

    const allResults: TestResultItem[] = [];
    const allFindings: Finding[] = [];
    const artifactsList: WorkerRunReport['artifacts'] = [];

    try {
      // 3. Page Discovery & Crawling
      emit('STATE_CHANGE', 'DISCOVERING', `Discovering pages on ${config.targetUrl} (max pages: ${config.maxPages || 5})...`);
      const pages = await crawlWebsite(
        page,
        config.targetUrl,
        config.maxPages || 5,
        msg => emit('LOG', 'DISCOVERING', msg)
      );

      emit('STEP_SUCCESS', 'DISCOVERING', `Discovered ${pages.length} accessible pages within scope.`);

      // 4. Test Planning
      emit('STATE_CHANGE', 'PLANNING', 'Synthesizing test execution matrix across selected categories...');
      emit('LOG', 'PLANNING', `Categories configured: ${config.categories.join(', ')}`);

      // 5. Execution Phase
      emit('STATE_CHANGE', 'RUNNING', `Beginning browser test execution across ${pages.length} pages...`);

      let latestPerfData: any = undefined;
      let latestSecData: any = undefined;

      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        // Check cancellation
        if (this.activeRuns.get(config.runId)?.isCancelled) {
          emit('STATE_CHANGE', 'CANCELLED', 'Test execution cancelled by user request.');
          break;
        }

        const currentPage = pages[pIdx];
        emit('LOG', 'RUNNING', `Testing Page [${pIdx + 1}/${pages.length}]: ${currentPage.url}`);

        // A. Functional checks
        if (config.categories.includes('functional') || config.categories.includes('navigation') || config.categories.includes('forms')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Executing functional, form, and link checks...`);
          const fnOut = await runFunctionalChecks(page, currentPage.url, msg => emit('LOG', 'FUNCTIONAL', msg));
          allResults.push(...fnOut.results);
          allFindings.push(...fnOut.findings);
        }

        // B. Accessibility checks (axe-core)
        if (config.categories.includes('accessibility')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Running axe-core automated WCAG 2.1 accessibility scan...`);
          const a11yOut = await runAccessibilityChecks(page, currentPage.url, msg => emit('LOG', 'ACCESSIBILITY', msg));
          allResults.push(...a11yOut.results);
          allFindings.push(...a11yOut.findings);
        }

        // C. Responsive checks
        if (config.categories.includes('responsive')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Inspecting responsive layouts across viewports...`);
          const respOut = await runResponsiveChecks(page, currentPage.url, config.viewports, msg => emit('LOG', 'RESPONSIVE', msg));
          allResults.push(...respOut.results);
          allFindings.push(...respOut.findings);
        }

        // D. Technical SEO checks
        if (config.categories.includes('seo')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Verifying technical SEO markup and heading hierarchy...`);
          const seoOut = await runSeoChecks(page, currentPage.url, msg => emit('LOG', 'SEO', msg));
          allResults.push(...seoOut.results);
          allFindings.push(...seoOut.findings);
        }

        // E. Real Performance & Web Vitals Audit
        if (config.categories.includes('performance')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Measuring actual page load timings and Core Web Vitals...`);
          const perfOut = await runPerformanceChecks(page, currentPage.url, msg => emit('LOG', 'PERFORMANCE', msg));
          allResults.push(...perfOut.results);
          allFindings.push(...perfOut.findings);
          latestPerfData = perfOut.performanceData;
        }

        // F. Safe Non-Destructive Security Audit
        if (config.categories.includes('security')) {
          emit('STEP_START', 'RUNNING', `[${currentPage.url}] Auditing security headers, transport, and DOM security...`);
          const secOut = await runSecurityChecks(page, currentPage.url, msg => emit('LOG', 'SECURITY', msg));
          allResults.push(...secOut.results);
          allFindings.push(...secOut.findings);
          latestSecData = secOut.securityData;
        }

        // Capture page screenshot artifact
        const screenshotFileName = `page-${pIdx + 1}-screenshot.png`;
        const screenshotFilePath = path.join(artifactsDir, screenshotFileName);
        try {
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.screenshot({ path: screenshotFilePath });
          artifactsList.push({
            type: 'screenshot',
            name: `Page Screenshot: ${currentPage.title || currentPage.url}`,
            path: screenshotFilePath
          });
          emit('SCREENSHOT', 'RUNNING', `Captured screenshot for ${currentPage.url}`, {
            path: screenshotFilePath,
            fileName: screenshotFileName
          });
        } catch {
          // Ignore screenshot error
        }

        // G. Visual Regression (on start URL)
        if (config.categories.includes('visual') && pIdx === 0) {
          emit('STEP_START', 'RUNNING', `Executing visual regression comparison on ${currentPage.url}...`);
          const visOut = await runVisualCheck(
            page,
            currentPage.url,
            config.runId,
            artifactsDir,
            config.baselineScreenshotDir ? path.join(config.baselineScreenshotDir, 'baseline.png') : undefined,
            msg => emit('LOG', 'VISUAL', msg)
          );
          allResults.push(...visOut.results);
          allFindings.push(...visOut.findings);

          if (visOut.screenshotPath) {
            artifactsList.push({
              type: 'screenshot',
              name: 'Current Visual Capture',
              path: visOut.screenshotPath
            });
          }
          if (visOut.diffPath) {
            artifactsList.push({
              type: 'diff',
              name: 'Visual Difference Map (Red Highlights)',
              path: visOut.diffPath
            });
          }
        }
      }

      // 6. Analyzing Phase
      emit('STATE_CHANGE', 'ANALYZING', 'Analyzing defect telemetry and computing quality scores...');
      const metrics = this.computeMetrics(allResults, allFindings, latestPerfData, latestSecData);

      const status: WorkerRunReport['status'] = this.activeRuns.get(config.runId)?.isCancelled
        ? 'CANCELLED'
        : 'COMPLETED';


      const report: WorkerRunReport = {
        runId: config.runId,
        targetUrl: config.targetUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status,
        pagesDiscovered: pages,
        results: allResults,
        findings: allFindings,
        metrics,
        artifacts: artifactsList
      };

      emit('STATE_CHANGE', status, `Test run finished with overall score of ${metrics.overallScore}/100.`);
      emit('COMPLETE', 'FINISHED', `Execution completed in ${(report.durationMs / 1000).toFixed(1)}s`, {
        metrics,
        totalFindings: allFindings.length,
        totalResults: allResults.length
      });

      return report;
    } finally {
      this.activeRuns.delete(config.runId);
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }

  private computeMetrics(
    results: TestResultItem[],
    findings: Finding[],
    perfData?: any,
    secData?: any
  ): QualityMetrics {
    const totalTests = results.length;
    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const blockedCount = results.filter(r => r.status === 'blocked').length;

    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;
    const mediumFindings = findings.filter(f => f.severity === 'medium').length;
    const lowFindings = findings.filter(f => f.severity === 'low' || f.severity === 'info').length;

    const getCategoryScore = (category: string) => {
      const catResults = results.filter(r => r.category === category);
      if (catResults.length === 0) return 100; // Not tested or empty
      const catPassed = catResults.filter(r => r.status === 'passed').length;
      return Math.round((catPassed / catResults.length) * 100);
    };

    const functionalScore = getCategoryScore('functional');
    const responsiveScore = getCategoryScore('responsive');
    const accessibilityScore = getCategoryScore('accessibility');
    const seoScore = getCategoryScore('seo');
    const visualScore = getCategoryScore('visual');
    const performanceScore = getCategoryScore('performance');
    const securityScore = getCategoryScore('security');

    // Transparent weighted formula
    // Severe penalty for critical defects (-15 each) and high defects (-8 each)
    let penalty = criticalFindings * 15 + highFindings * 8 + mediumFindings * 3 + lowFindings * 1;
    let baseScore = totalTests > 0 ? (passedCount / totalTests) * 100 : 100;
    let overallScore = Math.max(0, Math.min(100, Math.round(baseScore - penalty * 0.5)));

    return {
      overallScore,
      functionalScore,
      responsiveScore,
      accessibilityScore,
      seoScore,
      visualScore,
      performanceScore,
      securityScore,
      totalTests,
      passedCount,
      failedCount,
      skippedCount,
      blockedCount,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      performanceData: perfData,
      securityData: secData
    };
  }
}

import { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { Finding, TestResultItem } from '../types.js';

export interface VisualCheckResult {
  results: TestResultItem[];
  findings: Finding[];
  screenshotPath?: string;
  diffPath?: string;
  diffPercentage?: number;
}

export async function runVisualCheck(
  page: Page,
  url: string,
  runId: string,
  artifactsDir: string,
  baselinePath?: string,
  onLog?: (msg: string) => void
): Promise<VisualCheckResult> {
  const results: TestResultItem[] = [];
  const findings: Finding[] = [];
  const startTime = Date.now();

  try {
    fs.mkdirSync(artifactsDir, { recursive: true });
    const currentScreenshotPath = path.join(artifactsDir, `run-${runId}-visual-current.png`);
    const diffImagePath = path.join(artifactsDir, `run-${runId}-visual-diff.png`);

    onLog?.(`Capturing full-page screenshot for visual comparison: ${url}...`);
    await page.screenshot({ path: currentScreenshotPath, fullPage: false });

    // If no baseline was provided or exists, save this as the baseline
    if (!baselinePath || !fs.existsSync(baselinePath)) {
      const newBaseline = path.join(artifactsDir, `baseline-${runId}.png`);
      fs.copyFileSync(currentScreenshotPath, newBaseline);

      results.push({
        id: `visual-baseline-${Date.now()}`,
        name: 'Visual Regression: Initial Baseline Creation',
        category: 'visual',
        url,
        status: 'passed',
        durationMs: Date.now() - startTime,
        expectedOutcome: 'Baseline screenshot registered',
        actualOutcome: 'No prior baseline found; established current capture as master baseline',
        screenshotPath: currentScreenshotPath
      });

      return {
        results,
        findings,
        screenshotPath: currentScreenshotPath
      };
    }

    onLog?.(`Comparing against baseline screenshot: ${baselinePath}...`);
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(currentScreenshotPath));

    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);

    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const diffPercentage = (numDiffPixels / totalPixels) * 100;

    fs.writeFileSync(diffImagePath, PNG.sync.write(diff));

    onLog?.(`Visual difference calculation: ${diffPercentage.toFixed(2)}% pixel delta (${numDiffPixels} pixels).`);

    // Tolerance threshold: 0.25%
    if (diffPercentage > 0.25) {
      results.push({
        id: `visual-diff-${Date.now()}`,
        name: 'Visual Regression Comparison',
        category: 'visual',
        url,
        status: 'failed',
        durationMs: Date.now() - startTime,
        expectedOutcome: 'Visual divergence < 0.25%',
        actualOutcome: `Visual difference: ${diffPercentage.toFixed(2)}% (${numDiffPixels} mismatched pixels)`,
        errorSummary: `Visual regression detected (${diffPercentage.toFixed(2)}% difference)`,
        screenshotPath: currentScreenshotPath
      });

      findings.push({
        id: `finding-visual-${Date.now()}`,
        title: `Visual Regression Detected (${diffPercentage.toFixed(2)}% Drift)`,
        category: 'visual',
        severity: diffPercentage > 5.0 ? 'high' : 'medium',
        affectedUrl: url,
        description: `Visual comparison against the approved baseline identified ${numDiffPixels} altered pixels (${diffPercentage.toFixed(2)}% of the surface area).`,
        reproductionSteps: [
          `Load current version of ${url}`,
          `Compare against baseline screenshot`,
          `Inspect highlighted red difference overlay`
        ],
        expectedResult: 'Layout matches approved baseline within 0.25% pixel tolerance.',
        actualResult: `${diffPercentage.toFixed(2)}% visual variance detected.`,
        suggestedFix: 'Review visual diff overlay to verify if changes were intentional. If intentional, approve current capture as the new baseline.',
        confidence: 0.99,
        verificationStatus: 'verified',
        evidence: {
          screenshot: currentScreenshotPath,
          logs: [`Pixel delta: ${numDiffPixels}`, `Diff percentage: ${diffPercentage.toFixed(2)}%`]
        }
      });
    } else {
      results.push({
        id: `visual-diff-${Date.now()}`,
        name: 'Visual Regression Comparison',
        category: 'visual',
        url,
        status: 'passed',
        durationMs: Date.now() - startTime,
        expectedOutcome: 'Visual divergence < 0.25%',
        actualOutcome: `Pixel difference is ${diffPercentage.toFixed(2)}% (within acceptable tolerance)`,
        screenshotPath: currentScreenshotPath
      });
    }

    return {
      results,
      findings,
      screenshotPath: currentScreenshotPath,
      diffPath: diffImagePath,
      diffPercentage
    };
  } catch (err: any) {
    results.push({
      id: `visual-err-${Date.now()}`,
      name: 'Visual Regression Check',
      category: 'visual',
      url,
      status: 'blocked',
      durationMs: Date.now() - startTime,
      expectedOutcome: 'Visual comparison succeeds',
      actualOutcome: `Error: ${err.message}`,
      errorSummary: err.message
    });

    return { results, findings };
  }
}

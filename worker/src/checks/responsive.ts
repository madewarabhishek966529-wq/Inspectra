import { Page } from 'playwright';
import { Finding, TestResultItem, ViewportPreset } from '../types.js';

export interface ResponsiveCheckResult {
  results: TestResultItem[];
  findings: Finding[];
}

export const DEFAULT_VIEWPORTS: ViewportPreset[] = [
  { name: 'Desktop (1440x900)', width: 1440, height: 900 },
  { name: 'Laptop (1366x768)', width: 1366, height: 768 },
  { name: 'Tablet (768x1024)', width: 768, height: 1024 },
  { name: 'Mobile (390x844)', width: 390, height: 844 }
];

export async function runResponsiveChecks(
  page: Page,
  url: string,
  viewports: ViewportPreset[] = DEFAULT_VIEWPORTS,
  onLog?: (msg: string) => void
): Promise<ResponsiveCheckResult> {
  const results: TestResultItem[] = [];
  const findings: Finding[] = [];

  for (const vp of viewports) {
    const startTime = Date.now();
    try {
      onLog?.(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      // Evaluate horizontal scroll and overflowing elements
      const overflowReport = await page.evaluate((vpWidth) => {
        const scrollWidth = document.documentElement.scrollWidth;
        const hasHorizontalOverflow = scrollWidth > vpWidth + 4; // small margin for borders

        let offendingElement: { selector: string; width: number; right: number } | null = null;
        if (hasHorizontalOverflow) {
          const all = document.querySelectorAll('*');
          for (let i = 0; i < all.length; i++) {
            const el = all[i];
            const rect = el.getBoundingClientRect();
            if (rect.right > vpWidth + 5 && rect.width > 20) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls = el.className && typeof el.className === 'string'
                ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
                : '';
              offendingElement = {
                selector: `${tag}${id}${cls}`,
                width: Math.round(rect.width),
                right: Math.round(rect.right)
              };
              break;
            }
          }
        }

        return {
          scrollWidth,
          hasHorizontalOverflow,
          offendingElement
        };
      }, vp.width);

      if (overflowReport.hasHorizontalOverflow) {
        results.push({
          id: `resp-${vp.width}-${Date.now()}`,
          name: `Responsive Overflow Check: ${vp.name}`,
          category: 'responsive',
          url,
          status: 'failed',
          durationMs: Date.now() - startTime,
          expectedOutcome: `No horizontal scroll (scrollWidth <= ${vp.width}px)`,
          actualOutcome: `Document scrollWidth is ${overflowReport.scrollWidth}px (exceeds viewport by ${overflowReport.scrollWidth - vp.width}px)`,
          errorSummary: `Horizontal page overflow on ${vp.name}`
        });

        findings.push({
          id: `finding-resp-${vp.width}-${Date.now()}`,
          title: `Horizontal Overflow on ${vp.name}`,
          category: 'responsive',
          severity: vp.width <= 768 ? 'high' : 'medium',
          affectedUrl: url,
          description: `Page body overflows the viewport width on ${vp.name}. Document scroll width is ${overflowReport.scrollWidth}px for a ${vp.width}px screen.`,
          reproductionSteps: [
            `Resize viewport to ${vp.width}x${vp.height} (${vp.name})`,
            `Observe appearance of horizontal scrollbar`,
            overflowReport.offendingElement
              ? `Inspect overflowing element: "${overflowReport.offendingElement.selector}"`
              : 'Inspect elements exceeding viewport width'
          ],
          expectedResult: `Content fits within ${vp.width}px without horizontal scrolling.`,
          actualResult: `Horizontal scrollbar rendered (scrollWidth: ${overflowReport.scrollWidth}px)`,
          suggestedFix: `Add max-width: 100% and overflow-x: hidden or responsive media queries on container elements.`,
          confidence: 0.95,
          verificationStatus: 'verified',
          evidence: {
            selector: overflowReport.offendingElement?.selector
          }
        });
      } else {
        results.push({
          id: `resp-${vp.width}-${Date.now()}`,
          name: `Responsive Layout: ${vp.name}`,
          category: 'responsive',
          url,
          status: 'passed',
          durationMs: Date.now() - startTime,
          expectedOutcome: `No horizontal scroll (scrollWidth <= ${vp.width}px)`,
          actualOutcome: `Content fits viewport (${overflowReport.scrollWidth}px)`
        });
      }
    } catch (err: any) {
      results.push({
        id: `resp-err-${vp.width}-${Date.now()}`,
        name: `Responsive Check: ${vp.name}`,
        category: 'responsive',
        url,
        status: 'blocked',
        durationMs: Date.now() - startTime,
        expectedOutcome: 'Check viewport reflow',
        actualOutcome: `Error: ${err.message}`,
        errorSummary: err.message
      });
    }
  }

  return { results, findings };
}

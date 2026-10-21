import { Page } from 'playwright';
import axeCore from 'axe-core';
import { Finding, FindingSeverity, TestResultItem } from '../types.js';

export interface A11yCheckResult {
  results: TestResultItem[];
  findings: Finding[];
}

export async function runAccessibilityChecks(
  page: Page,
  url: string,
  onLog?: (msg: string) => void
): Promise<A11yCheckResult> {
  const results: TestResultItem[] = [];
  const findings: Finding[] = [];
  const startTime = Date.now();

  try {
    onLog?.(`Injecting axe-core automated WCAG 2.1 accessibility engine into ${url}...`);

    // Inject axe-core source into page
    await page.evaluate(axeCore.source);

    // Run axe against the DOM
    const axeResults: any = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
        }
      });
    });

    const violations = axeResults.violations || [];
    const passes = axeResults.passes || [];

    onLog?.(`Accessibility scan complete: ${violations.length} violations, ${passes.length} rules passed.`);

    // Summary test result
    results.push({
      id: `a11y-summary-${Date.now()}`,
      name: 'WCAG 2.1 Accessibility Compliance Scan',
      category: 'accessibility',
      url,
      status: violations.length === 0 ? 'passed' : 'failed',
      durationMs: Date.now() - startTime,
      expectedOutcome: '0 WCAG 2.1 AA accessibility violations',
      actualOutcome: `${violations.length} violations detected, ${passes.length} rules passed`,
      errorSummary: violations.length > 0 ? `${violations.length} accessibility violations need remediation` : undefined
    });

    // Map each violation to structured findings
    for (const v of violations) {
      const severity = mapAxeImpact(v.impact);
      const firstNode = v.nodes?.[0];
      const selector = firstNode?.target?.join(' > ') || '';
      const htmlSnippet = firstNode?.html || '';
      const failureSummary = firstNode?.failureSummary || v.help;

      findings.push({
        id: `finding-a11y-${v.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: `Accessibility: ${v.help} (${v.id})`,
        category: 'accessibility',
        severity,
        affectedUrl: url,
        description: `${v.description}. Affected elements: ${v.nodes?.length || 1}.`,
        reproductionSteps: [
          `Navigate to ${url}`,
          `Inspect element at selector: "${selector}"`,
          `Notice violation: ${v.help}`
        ],
        expectedResult: 'Element complies with WCAG accessibility guidelines.',
        actualResult: failureSummary,
        suggestedFix: `See remediation guide: ${v.helpUrl || 'https://dequeuniversity.com/rules/axe/'}`,
        confidence: 0.98,
        verificationStatus: 'verified',
        evidence: {
          selector,
          ruleId: v.id,
          logs: [htmlSnippet, failureSummary].filter(Boolean)
        }
      });
    }

  } catch (err: any) {
    results.push({
      id: `a11y-error-${Date.now()}`,
      name: 'Accessibility Scan Execution',
      category: 'accessibility',
      url,
      status: 'blocked',
      durationMs: Date.now() - startTime,
      expectedOutcome: 'Axe-core scan completes',
      actualOutcome: `Scan failed: ${err.message}`,
      errorSummary: err.message
    });
  }

  return { results, findings };
}

function mapAxeImpact(impact?: string): FindingSeverity {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'high';
    case 'moderate':
      return 'medium';
    case 'minor':
    default:
      return 'low';
  }
}

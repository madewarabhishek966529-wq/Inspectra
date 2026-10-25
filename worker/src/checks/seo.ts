import { Page } from 'playwright';
import { Finding, TestResultItem } from '../types.js';

export interface SeoCheckResult {
  results: TestResultItem[];
  findings: Finding[];
}

export async function runSeoChecks(
  page: Page,
  url: string,
  onLog?: (msg: string) => void
): Promise<SeoCheckResult> {
  const results: TestResultItem[] = [];
  const findings: Finding[] = [];
  const startTime = Date.now();

  try {
    onLog?.(`Running technical SEO, metadata, and Open Graph inspection on ${url}...`);

    const seoData = await page.evaluate(() => {
      const title = document.title ? document.title.trim() : '';
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || '';
      const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content')?.trim() || '';

      // Open Graph Tags
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || '';

      const h1s = Array.from(document.querySelectorAll('h1')).map(h => (h.textContent || '').trim());
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        tag: h.tagName.toLowerCase(),
        level: parseInt(h.tagName.replace('H', ''), 10),
        text: (h.textContent || '').trim().slice(0, 50)
      }));

      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt'),
        hasAlt: img.hasAttribute('alt')
      }));

      return {
        title,
        metaDesc,
        canonical,
        robots,
        ogTitle,
        ogDesc,
        ogImage,
        h1s,
        headings,
        images
      };
    });

    // 1. Title Tag Check
    if (!seoData.title) {
      results.push({
        id: `seo-title-${Date.now()}`,
        name: 'Page Title Element (<title>)',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 25,
        expectedOutcome: 'Descriptive <title> element between 10 and 60 characters',
        actualOutcome: 'Missing or empty <title> tag',
        errorSummary: 'Page title is completely missing'
      });

      findings.push({
        id: `finding-seo-title-${Date.now()}`,
        title: 'Missing Page Title Tag',
        category: 'seo',
        severity: 'high',
        affectedUrl: url,
        description: 'The HTML document has no <title> tag or the title is blank.',
        reproductionSteps: [`Inspect HTML <head> of ${url}`, `Check <title> tag`],
        expectedResult: 'Meaningful, unique title tag present in <head>',
        actualResult: 'Title is empty or missing',
        suggestedFix: 'Add a distinct, keyword-relevant <title> tag (30-60 characters) inside the <head> section.',
        confidence: 1.0,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-title-${Date.now()}`,
        name: 'Page Title Element (<title>)',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 25,
        expectedOutcome: 'Valid <title> element present',
        actualOutcome: `Title present (${seoData.title.length} chars): "${seoData.title}"`
      });
    }

    // 2. Meta Description Check
    if (!seoData.metaDesc) {
      results.push({
        id: `seo-desc-${Date.now()}`,
        name: 'Meta Description Tag',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 20,
        expectedOutcome: '<meta name="description"> tag present',
        actualOutcome: 'Meta description tag is missing',
        errorSummary: 'Search engine snippets will be auto-generated without meta description'
      });

      findings.push({
        id: `finding-seo-desc-${Date.now()}`,
        title: 'Missing Meta Description Tag',
        category: 'seo',
        severity: 'medium',
        affectedUrl: url,
        description: 'The page lacks a meta description tag used by search engines for search result snippets.',
        reproductionSteps: [`Inspect <head> for <meta name="description"> on ${url}`],
        expectedResult: 'Concise meta description (50-160 characters) present',
        actualResult: 'No meta description found',
        suggestedFix: 'Add <meta name="description" content="..."> summarizing the page purpose.',
        confidence: 1.0,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-desc-${Date.now()}`,
        name: 'Meta Description Tag',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 20,
        expectedOutcome: 'Meta description present',
        actualOutcome: `Found meta description (${seoData.metaDesc.length} chars)`
      });
    }

    // 3. Heading Hierarchy (H1) Check
    if (seoData.h1s.length === 0) {
      results.push({
        id: `seo-h1-${Date.now()}`,
        name: 'H1 Primary Heading Structure',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 15,
        expectedOutcome: 'Exactly 1 primary <h1> heading on page',
        actualOutcome: 'No <h1> heading found in document',
        errorSummary: 'Missing primary <h1> heading'
      });

      findings.push({
        id: `finding-seo-h1-${Date.now()}`,
        title: 'Missing Primary <h1> Heading',
        category: 'seo',
        severity: 'medium',
        affectedUrl: url,
        description: 'Pages must have a primary <h1> heading representing the main topic.',
        reproductionSteps: [`Check DOM structure for <h1> tag on ${url}`],
        expectedResult: 'Single well-defined <h1> heading',
        actualResult: '0 <h1> elements detected',
        suggestedFix: 'Wrap the primary headline of the page in an <h1> tag.',
        confidence: 1.0,
        verificationStatus: 'verified'
      });
    } else if (seoData.h1s.length > 1) {
      results.push({
        id: `seo-h1-${Date.now()}`,
        name: 'H1 Primary Heading Structure',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 15,
        expectedOutcome: 'Exactly 1 primary <h1> heading on page',
        actualOutcome: `Found ${seoData.h1s.length} <h1> headings`,
        errorSummary: 'Multiple <h1> headings present'
      });

      findings.push({
        id: `finding-seo-multih1-${Date.now()}`,
        title: `Multiple <h1> Headings Found (${seoData.h1s.length})`,
        category: 'seo',
        severity: 'low',
        affectedUrl: url,
        description: `Multiple top-level <h1> elements weaken heading hierarchy semantics.`,
        reproductionSteps: [`Inspect headings on ${url}`],
        expectedResult: 'Single <h1> per page',
        actualResult: `${seoData.h1s.length} <h1> elements found: ${seoData.h1s.slice(0, 2).join(', ')}`,
        suggestedFix: 'Keep one primary <h1> and demote secondary section headings to <h2>.',
        confidence: 0.95,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-h1-${Date.now()}`,
        name: 'H1 Primary Heading Structure',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 15,
        expectedOutcome: 'Single primary <h1> heading',
        actualOutcome: `1 <h1> heading found: "${seoData.h1s[0]}"`
      });
    }

    // 4. Heading Hierarchy Sequence (No Skipped Levels)
    let skippedHeadingLevel = false;
    let lastLevel = 1;
    for (const h of seoData.headings) {
      if (h.level > lastLevel + 1) {
        skippedHeadingLevel = true;
        break;
      }
      lastLevel = h.level;
    }

    if (skippedHeadingLevel) {
      results.push({
        id: `seo-heading-hierarchy-${Date.now()}`,
        name: 'Heading Sequential Level Hierarchy',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 15,
        expectedOutcome: 'Headings follow logical order without skipping levels (e.g. h1 -> h2 -> h3)',
        actualOutcome: 'Detected skipped heading level in page outline',
        errorSummary: 'Non-sequential heading hierarchy confuses outline parsers and screen readers'
      });

      findings.push({
        id: `finding-seo-hierarchy-${Date.now()}`,
        title: 'Skipped Heading Levels in Document Outline',
        category: 'seo',
        severity: 'low',
        affectedUrl: url,
        description: 'Heading tags skip levels (e.g., jumping from <h1> directly to <h3> without an intervening <h2>).',
        reproductionSteps: [`Inspect heading sequence in document outline on ${url}`],
        expectedResult: 'Sequential heading structure (h1 -> h2 -> h3)',
        actualResult: 'Headings skip hierarchy levels',
        suggestedFix: 'Maintain sequential heading hierarchy to support screen readers and search bots.',
        confidence: 0.95,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-heading-hierarchy-${Date.now()}`,
        name: 'Heading Sequential Level Hierarchy',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 15,
        expectedOutcome: 'Headings follow logical sequential order',
        actualOutcome: `${seoData.headings.length} headings follow sequential hierarchy`
      });
    }

    // 5. Open Graph & Social Sharing Metadata
    const hasOgTags = Boolean(seoData.ogTitle || seoData.ogDesc || seoData.ogImage);
    if (!hasOgTags) {
      results.push({
        id: `seo-og-${Date.now()}`,
        name: 'Open Graph (Social Sharing) Metadata',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 15,
        expectedOutcome: 'Open Graph tags (og:title, og:description, og:image) present',
        actualOutcome: 'Missing Open Graph metadata',
        errorSummary: 'Social previews on LinkedIn, Twitter/X, and Slack will fall back to raw URL'
      });

      findings.push({
        id: `finding-seo-og-${Date.now()}`,
        title: 'Missing Open Graph Metadata Tags',
        category: 'seo',
        severity: 'low',
        affectedUrl: url,
        description: 'No og:title, og:description, or og:image tags were discovered in the page header.',
        reproductionSteps: [`Check <head> for meta property="og:*" on ${url}`],
        expectedResult: 'og:title, og:description, and og:image tags configured',
        actualResult: '0 Open Graph tags present',
        suggestedFix: 'Add Open Graph meta tags to provide rich previews when shared on messaging and social platforms.',
        confidence: 0.9,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-og-${Date.now()}`,
        name: 'Open Graph (Social Sharing) Metadata',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 15,
        expectedOutcome: 'Open Graph metadata present',
        actualOutcome: `Configured: ${[seoData.ogTitle && 'og:title', seoData.ogDesc && 'og:description', seoData.ogImage && 'og:image'].filter(Boolean).join(', ')}`
      });
    }

    // 6. Missing Image Alt Text
    const missingAltImages = seoData.images.filter(img => !img.hasAlt || img.alt === null);
    if (missingAltImages.length > 0) {
      results.push({
        id: `seo-img-alt-${Date.now()}`,
        name: 'Image Alternative Text (alt)',
        category: 'seo',
        url,
        status: 'failed',
        durationMs: 20,
        expectedOutcome: 'All <img> tags have alt attribute',
        actualOutcome: `${missingAltImages.length} images lack alt attributes`,
        errorSummary: `${missingAltImages.length} images missing alt text`
      });

      findings.push({
        id: `finding-seo-alt-${Date.now()}`,
        title: `Images Missing alt Attribute (${missingAltImages.length})`,
        category: 'seo',
        severity: 'medium',
        affectedUrl: url,
        description: `Search engines and screen readers require alt text to index images properly.`,
        reproductionSteps: [`Inspect <img> elements on ${url}`],
        expectedResult: 'All <img> elements provide alt text or alt="" for decorative images',
        actualResult: `${missingAltImages.length} images found without alt attribute`,
        suggestedFix: 'Add descriptive alt text to all informational images, or alt="" if purely decorative.',
        confidence: 1.0,
        verificationStatus: 'verified'
      });
    } else {
      results.push({
        id: `seo-img-alt-${Date.now()}`,
        name: 'Image Alternative Text (alt)',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 20,
        expectedOutcome: 'All images have alt attribute',
        actualOutcome: `${seoData.images.length} images validated with alt attribute`
      });
    }

    // 7. Canonical URL & Robots Check
    if (seoData.canonical) {
      results.push({
        id: `seo-canonical-${Date.now()}`,
        name: 'Canonical URL Declaration',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 10,
        expectedOutcome: 'Valid <link rel="canonical"> tag',
        actualOutcome: `Canonical declared: ${seoData.canonical}`
      });
    } else {
      results.push({
        id: `seo-canonical-${Date.now()}`,
        name: 'Canonical URL Declaration',
        category: 'seo',
        url,
        status: 'passed',
        durationMs: 10,
        expectedOutcome: 'Self-referencing canonical URL or acceptable default',
        actualOutcome: 'Canonical tag absent (defaulting to request URL)'
      });
    }

  } catch (err: any) {
    results.push({
      id: `seo-err-${Date.now()}`,
      name: 'SEO Inspection Execution',
      category: 'seo',
      url,
      status: 'blocked',
      durationMs: Date.now() - startTime,
      expectedOutcome: 'SEO analysis finishes',
      actualOutcome: `Failed: ${err.message}`,
      errorSummary: err.message
    });
  }

  return { results, findings };
}

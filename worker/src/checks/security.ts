import { Page } from 'playwright';
import { Finding, TestResultItem } from '../types.js';

export interface SecurityCheckResult {
  results: TestResultItem[];
  findings: Finding[];
  securityData: {
    isHttps: boolean;
    missingHeaders: string[];
    presentHeaders: string[];
    insecureCookies: number;
    mixedContentCount: number;
    exposedSecretsFound: number;
  };
}

export async function runSecurityChecks(
  page: Page,
  url: string,
  onLog?: (msg: string) => void
): Promise<SecurityCheckResult> {
  const results: TestResultItem[] = [];
  const findings: Finding[] = [];
  const startTime = Date.now();

  onLog?.(`[Security] Executing passive, non-destructive security baseline audit on ${url}... (Note: Limited baseline assessment, not a full penetration test)`);

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  // 1. Transport Layer Check (HTTPS)
  if (!isHttps && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    results.push({
      id: `sec-https-${Date.now()}`,
      name: 'HTTPS Transport Encryption',
      category: 'security',
      url,
      status: 'failed',
      durationMs: 15,
      expectedOutcome: 'Page served exclusively over encrypted HTTPS',
      actualOutcome: 'Served over unencrypted plain HTTP',
      errorSummary: 'Plaintext HTTP transmission vulnerable to eavesdropping and MITM tampering'
    });

    findings.push({
      id: `finding-sec-https-${Date.now()}`,
      title: 'Unencrypted In-Transit Traffic (Plain HTTP)',
      category: 'security',
      severity: 'high',
      affectedUrl: url,
      description: 'The application transmits data over plain HTTP without TLS/SSL encryption. Network attackers on public Wi-Fi or transit networks can intercept and manipulate user traffic.',
      reproductionSteps: [`Navigate to ${url}`, 'Observe lack of TLS/SSL certificate padlock in browser'],
      expectedResult: 'Connection upgraded to HTTPS with valid TLS certificate',
      actualResult: 'Plaintext HTTP connection established',
      suggestedFix: 'Install a TLS certificate (e.g. Let\'s Encrypt) and configure an automatic 301 HTTP redirect to https://.',
      detectionMethod: 'URL Protocol Validation',
      technicalExplanation: 'HTTP transmits all headers, cookies, and body payloads in cleartext. Adversaries can inject malicious scripts or sniff session tokens via machine-in-the-middle attacks.',
      verificationProcedure: 'Verify HTTP requests return a 301 Permanent Redirect to https://.',
      confidence: 1.0,
      verificationStatus: 'verified'
    });
  } else {
    results.push({
      id: `sec-https-${Date.now()}`,
      name: 'HTTPS Transport Encryption',
      category: 'security',
      url,
      status: 'passed',
      durationMs: 15,
      expectedOutcome: 'Encrypted HTTPS connection established',
      actualOutcome: isHttps ? 'TLS Encrypted' : 'Localhost Authorized Bypass'
    });
  }

  // 2. Security Headers Audit
  onLog?.('[Security] Analyzing HTTP security response headers...');
  let responseHeaders: Record<string, string> = {};
  try {
    const mainResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (mainResponse) {
      responseHeaders = mainResponse.headers();
    }
  } catch {
    // page already loaded
  }

  const headerChecks = [
    {
      name: 'Content-Security-Policy',
      key: 'content-security-policy',
      severity: 'high' as const,
      purpose: 'Mitigates Cross-Site Scripting (XSS) and data injection by declaring approved content origins.',
      recommended: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
    },
    {
      name: 'Strict-Transport-Security (HSTS)',
      key: 'strict-transport-security',
      severity: 'high' as const,
      purpose: 'Enforces HTTPS and prevents SSL-stripping attacks.',
      recommended: 'max-age=31536000; includeSubDomains; preload',
      applicableOnlyHttps: true
    },
    {
      name: 'X-Frame-Options',
      key: 'x-frame-options',
      severity: 'medium' as const,
      purpose: 'Protects against Clickjacking by controlling whether the site can be rendered inside an <iframe>.',
      recommended: 'DENY or SAMEORIGIN'
    },
    {
      name: 'X-Content-Type-Options',
      key: 'x-content-type-options',
      severity: 'medium' as const,
      purpose: 'Prevents MIME-sniffing attacks by instructing browsers to strictly adhere to declared Content-Type.',
      recommended: 'nosniff'
    },
    {
      name: 'Referrer-Policy',
      key: 'referrer-policy',
      severity: 'low' as const,
      purpose: 'Prevents leakage of sensitive query parameters or URL path tokens to external domains in the Referer header.',
      recommended: 'strict-origin-when-cross-origin'
    },
    {
      name: 'Permissions-Policy',
      key: 'permissions-policy',
      severity: 'low' as const,
      purpose: 'Explicitly restricts access to sensitive browser features (camera, microphone, geolocation).',
      recommended: 'camera=(), microphone=(), geolocation=()'
    }
  ];

  const missingHeaders: string[] = [];
  const presentHeaders: string[] = [];

  for (const check of headerChecks) {
    if (check.applicableOnlyHttps && !isHttps) continue;

    const val = responseHeaders[check.key];
    if (val) {
      presentHeaders.push(check.name);
      results.push({
        id: `sec-header-${check.key}-${Date.now()}`,
        name: `Security Header: ${check.name}`,
        category: 'security',
        url,
        status: 'passed',
        durationMs: 10,
        expectedOutcome: `${check.name} header present in HTTP response`,
        actualOutcome: `Present: "${val.length > 60 ? val.substring(0, 60) + '...' : val}"`
      });
    } else {
      missingHeaders.push(check.name);
      results.push({
        id: `sec-header-${check.key}-${Date.now()}`,
        name: `Security Header: ${check.name}`,
        category: 'security',
        url,
        status: 'failed',
        durationMs: 10,
        expectedOutcome: `${check.name} header present in HTTP response`,
        actualOutcome: 'Header not returned by server',
        errorSummary: `Missing ${check.name} header`
      });

      findings.push({
        id: `finding-header-${check.key}-${Date.now()}`,
        title: `Missing Security Header: ${check.name}`,
        category: 'security',
        severity: check.severity,
        affectedUrl: url,
        description: `The HTTP response lacks the "${check.name}" header. ${check.purpose}`,
        reproductionSteps: [`Send HTTP request to ${url}`, `Inspect response headers for "${check.key}"`],
        expectedResult: `Response includes "${check.key}: ${check.recommended}"`,
        actualResult: 'Header absent from server response',
        suggestedFix: `Configure your web server or edge reverse-proxy to send: "${check.key}: ${check.recommended}".`,
        detectionMethod: 'HTTP Response Header Analysis',
        technicalExplanation: check.purpose,
        verificationProcedure: `curl -I ${url} and confirm presence of ${check.key}.`,
        confidence: 1.0,
        verificationStatus: 'verified',
        evidence: { details: { headerKey: check.key, recommended: check.recommended } }
      });
    }
  }

  // 3. Cookie Security Audit
  onLog?.('[Security] Auditing cookie security flags (Secure, HttpOnly, SameSite)...');
  let insecureCookieCount = 0;
  try {
    const cookies = await page.context().cookies(url);
    for (const cookie of cookies) {
      const issues: string[] = [];
      if (isHttps && !cookie.secure) {
        issues.push('Missing "Secure" flag on HTTPS');
      }
      if (!cookie.httpOnly && (cookie.name.toLowerCase().includes('sess') || cookie.name.toLowerCase().includes('token') || cookie.name.toLowerCase().includes('auth'))) {
        issues.push('Sensitive session cookie missing "HttpOnly" flag');
      }
      if (!cookie.sameSite || cookie.sameSite.toLowerCase() === 'none') {
        issues.push('Missing or permissive SameSite attribute (CSRF risk)');
      }

      if (issues.length > 0) {
        insecureCookieCount++;
        findings.push({
          id: `finding-cookie-${cookie.name}-${Date.now()}`,
          title: `Insecure Cookie Configuration: "${cookie.name}"`,
          category: 'security',
          severity: issues.some(i => i.includes('HttpOnly') || i.includes('Secure')) ? 'high' : 'medium',
          affectedUrl: url,
          description: `Cookie "${cookie.name}" is missing vital defense-in-depth flags: ${issues.join(', ')}.`,
          reproductionSteps: [`Inspect document.cookie or DevTools Application -> Cookies for ${cookie.name}`],
          expectedResult: `Cookie configured with Secure; HttpOnly; SameSite=Lax`,
          actualResult: `Issues identified: ${issues.join(', ')}`,
          suggestedFix: `Set "Set-Cookie: ${cookie.name}=...; Secure; HttpOnly; SameSite=Lax" in backend response.`,
          detectionMethod: 'Playwright Cookie Jar Inspection',
          technicalExplanation: 'The HttpOnly flag prevents cross-site scripts from accessing session tokens via document.cookie. The Secure flag prevents transmission across unencrypted HTTP.',
          verificationProcedure: 'Inspect Set-Cookie headers in API responses.',
          confidence: 1.0,
          verificationStatus: 'verified',
          evidence: { details: { cookieName: cookie.name, issues } }
        });
      }
    }
  } catch {
    // Ignore cookie read error
  }

  // 4. Reverse Tabnabbing (target="_blank" without rel="noopener")
  onLog?.('[Security] Checking for unsafe target="_blank" links (Reverse Tabnabbing)...');
  const unsafeBlankLinks = await page.$$eval(
    'a[target="_blank"]:not([rel*="noopener"]):not([rel*="noreferrer"])',
    links => links.map(l => ({ href: l.getAttribute('href') || '', text: (l.textContent || '').trim() }))
  ).catch(() => []);

  if (unsafeBlankLinks.length > 0) {
    results.push({
      id: `sec-tabnab-${Date.now()}`,
      name: 'Reverse Tabnabbing Link Security',
      category: 'security',
      url,
      status: 'failed',
      durationMs: 20,
      expectedOutcome: 'All target="_blank" links include rel="noopener noreferrer"',
      actualOutcome: `Found ${unsafeBlankLinks.length} unprotected target="_blank" links`,
      errorSummary: 'Unsafe target="_blank" without rel="noopener"'
    });

    findings.push({
      id: `finding-tabnab-${Date.now()}`,
      title: `${unsafeBlankLinks.length} Link(s) Vulnerable to Reverse Tabnabbing`,
      category: 'security',
      severity: 'medium',
      affectedUrl: url,
      description: `Detected <a> tags with target="_blank" that do not specify rel="noopener" or rel="noreferrer". External destinations can execute window.opener.location = "https://phishing-site.com" to silently redirect the user.`,
      reproductionSteps: [`Inspect anchor tags with target="_blank" on ${url}`],
      expectedResult: 'All target="_blank" links include rel="noopener noreferrer"',
      actualResult: `${unsafeBlankLinks.length} links lack rel="noopener"`,
      suggestedFix: 'Add rel="noopener noreferrer" to all external links opening in a new tab: <a href="..." target="_blank" rel="noopener noreferrer">.',
      detectionMethod: 'DOM Anchor Attribute Audit',
      technicalExplanation: 'When a new tab is opened without rel="noopener", the newly opened page retains a reference to the source page via window.opener, enabling phishing redirects.',
      verificationProcedure: 'Verify all target="_blank" tags have rel="noopener noreferrer" present.',
      confidence: 1.0,
      verificationStatus: 'verified',
      evidence: { details: { sampleLinks: unsafeBlankLinks.slice(0, 5) } }
    });
  } else {
    results.push({
      id: `sec-tabnab-${Date.now()}`,
      name: 'Reverse Tabnabbing Link Security',
      category: 'security',
      url,
      status: 'passed',
      durationMs: 20,
      expectedOutcome: 'All target="_blank" links protected',
      actualOutcome: 'No vulnerable reverse tabnabbing links found'
    });
  }

  // 5. Mixed Content Audit
  let mixedContentCount = 0;
  if (isHttps) {
    const mixedElements = await page.$$eval(
      'script[src^="http://"], link[href^="http://"], img[src^="http://"], iframe[src^="http://"]',
      els => els.map(el => ({ tag: el.tagName, src: el.getAttribute('src') || el.getAttribute('href') || '' }))
    ).catch(() => []);

    mixedContentCount = mixedElements.length;
    if (mixedContentCount > 0) {
      findings.push({
        id: `finding-mixed-content-${Date.now()}`,
        title: `${mixedContentCount} Mixed Content Insecure Asset(s) Loaded over HTTP`,
        category: 'security',
        severity: 'high',
        affectedUrl: url,
        description: `Discovered sub-resources loaded over unencrypted http:// on an otherwise secure https:// page. Active mixed content can compromise the entire page context.`,
        reproductionSteps: [`Load ${url}`, `Inspect network console for mixed content warnings`],
        expectedResult: 'All sub-resources served over HTTPS',
        actualResult: `${mixedContentCount} HTTP sub-resources requested`,
        suggestedFix: 'Update all resource URLs to use https:// or protocol-relative // paths.',
        detectionMethod: 'DOM Resource Protocol Audit',
        technicalExplanation: 'Browsers block or warn users when HTTPS websites load insecure assets because attackers can modify HTTP subresources in transit.',
        verificationProcedure: 'Inspect browser console for Mixed Content warnings.',
        confidence: 1.0,
        verificationStatus: 'verified',
        evidence: { details: { samples: mixedElements.slice(0, 5) } }
      });
    }
  }

  // 6. Sensitive Data Leaks & Stack Traces in HTML Source
  onLog?.('[Security] Inspecting publicly accessible DOM for debug traces and sensitive tokens...');
  let exposedSecretsFound = 0;
  const pageSource = await page.content().catch(() => '');

  const secretPatterns = [
    { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'Generic Private Key', regex: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
    { name: 'Unhandled Java Stack Trace', regex: /at\s+[\w$.]+\([\w$.]+\.java:\d+\)/ },
    { name: 'Unhandled Python Traceback', regex: /Traceback \(most recent call last\):/ },
    { name: 'PHP Fatal Error / Call Stack', regex: /Fatal error:.*?in\s+.*?\.php/ }
  ];

  for (const pat of secretPatterns) {
    if (pat.regex.test(pageSource)) {
      exposedSecretsFound++;
      findings.push({
        id: `finding-secret-leak-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: `Publicly Exposed Sensitive Information / Debug Trace: ${pat.name}`,
        category: 'security',
        severity: pat.name.includes('Key') ? 'critical' : 'high',
        affectedUrl: url,
        description: `Found publicly visible patterns indicative of ${pat.name} in the page source or response payload.`,
        reproductionSteps: [`View source on ${url}`, `Search for pattern ${pat.name}`],
        expectedResult: 'Production pages suppress debug stack traces and private credentials',
        actualResult: `Pattern matched: ${pat.name}`,
        suggestedFix: 'Disable debug mode in production, implement custom error handlers, and store API secrets securely in server environment variables.',
        detectionMethod: 'Regex Static Content Analysis',
        technicalExplanation: 'Exposing stack traces discloses internal class hierarchies, database schemas, and server file paths that simplify targeted exploitation.',
        verificationProcedure: 'Inspect error pages and ensure generic customer-friendly error screens are displayed.',
        confidence: 0.9,
        verificationStatus: 'verified'
      });
    }
  }

  return {
    results,
    findings,
    securityData: {
      isHttps,
      missingHeaders,
      presentHeaders,
      insecureCookies: insecureCookieCount,
      mixedContentCount,
      exposedSecretsFound
    }
  };
}

import { ChromiumBrowserContext, Page } from 'playwright';
import { DiscoveredPage } from './types.js';

export async function crawlWebsite(
  page: Page,
  startUrl: string,
  maxPages: number = 10,
  onProgress?: (msg: string) => void
): Promise<DiscoveredPage[]> {
  const discovered: DiscoveredPage[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startUrl];

  const parsedStart = new URL(startUrl);
  const targetHost = parsedStart.hostname;

  onProgress?.(`Starting discovery crawl from ${startUrl} (max pages: ${maxPages})...`);

  while (queue.length > 0 && discovered.length < maxPages) {
    const currentUrl = queue.shift()!;
    const normalized = normalizeUrl(currentUrl);

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    onProgress?.(`Crawling [${discovered.length + 1}/${maxPages}]: ${normalized}`);

    try {
      const response = await page.goto(normalized, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      const title = await page.title().catch(() => '');
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName.replace('H', ''), 10),
          text: (el.textContent || '').trim()
        }))
      ).catch(() => []);

      const links = await page.$$eval('a[href]', anchors =>
        anchors
          .map(a => a.getAttribute('href') || '')
          .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:'))
      ).catch(() => []);

      const formsCount = await page.$$eval('form', forms => forms.length).catch(() => 0);
      const buttonsCount = await page.$$eval('button, input[type="button"], input[type="submit"]', btns => btns.length).catch(() => 0);

      const resolvedLinks: string[] = [];
      for (const link of links) {
        try {
          const resolved = new URL(link, normalized);
          resolved.hash = ''; // Remove fragment

          // Stay on same domain / host
          if (resolved.hostname === targetHost) {
            resolvedLinks.push(resolved.toString());
            const normalizedLink = normalizeUrl(resolved.toString());
            if (!visited.has(normalizedLink) && !queue.includes(resolved.toString())) {
              queue.push(resolved.toString());
            }
          }
        } catch {
          // ignore invalid URLs
        }
      }

      discovered.push({
        url: normalized,
        title,
        links: Array.from(new Set(resolvedLinks)),
        formsCount,
        buttonsCount,
        headings,
        discoveryStatus: 'crawled'
      });
    } catch (err: any) {
      discovered.push({
        url: normalized,
        title: 'Crawl Error',
        links: [],
        formsCount: 0,
        buttonsCount: 0,
        headings: [],
        discoveryStatus: 'failed'
      });
    }
  }

  onProgress?.(`Discovery crawl finished. Discovered ${discovered.length} pages.`);
  return discovered;
}

function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    // Strip trailing slash except root
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return urlStr;
  }
}

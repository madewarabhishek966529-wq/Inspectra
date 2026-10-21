import dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

/**
 * Validates a target URL against SSRF attacks and illegal protocols.
 * Blocks cloud metadata (169.254.169.254), private RFC1918 ranges, and loopback
 * unless allowPrivateIps is explicitly enabled (e.g. for local test fixture testing).
 */
export async function validateTargetUrl(
  urlStr: string,
  allowPrivateIps: boolean = false
): Promise<{ safe: boolean; reason?: string; resolvedIp?: string; normalizedUrl?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch (err: any) {
    return { safe: false, reason: `Invalid URL format: ${err.message}` };
  }

  // Only permit HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Forbidden protocol "${parsed.protocol}". Only http: and https: are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit check for cloud metadata IPs
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.includes('metadata')
  ) {
    return { safe: false, reason: 'Access to cloud instance metadata services is strictly blocked.' };
  }

  // Resolve hostname to IP
  try {
    const res = await lookupAsync(hostname);
    const ip = res.address;

    const isLoopback =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost');

    const isPrivate =
      /^10\./.test(ip) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^169\.254\./.test(ip);

    if ((isLoopback || isPrivate) && !allowPrivateIps) {
      return {
        safe: false,
        reason: `Target resolved to restricted private/internal address (${ip}). To test internal fixtures, enable development private network testing in project settings.`,
        resolvedIp: ip
      };
    }

    return {
      safe: true,
      resolvedIp: ip,
      normalizedUrl: parsed.toString()
    };
  } catch (err: any) {
    return { safe: false, reason: `Failed to resolve DNS for hostname "${hostname}": ${err.message}` };
  }
}

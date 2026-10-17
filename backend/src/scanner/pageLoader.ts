import { BrowserManager } from './browserManager.js';
import { validateUrl, type SecurityPolicy, PRODUCTION_SECURITY_POLICY } from '../security/urlValidator.js';
import { validateHostDns } from '../security/dnsValidator.js';
import { AppError } from '../middleware/errorHandler.js';

export interface PageLoaderOptions {
  policy?: SecurityPolicy;
  navigationTimeoutMs?: number;
  totalTimeoutMs?: number;
}

export interface PageMetadata {
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  loadTimeMs: number;
  security: {
    isPublic: boolean;
    protocol: string;
  };
}

export async function loadPageSecurely(
  rawUrl: string,
  options: PageLoaderOptions = {}
): Promise<PageMetadata> {
  const policy = options.policy ?? PRODUCTION_SECURITY_POLICY;
  const navigationTimeoutMs = options.navigationTimeoutMs ?? 15000;
  const totalTimeoutMs = options.totalTimeoutMs ?? 20000;

  // Step 1: Pre-flight URL syntax and structure validation
  const urlResult = validateUrl(rawUrl, policy);
  if (!urlResult.valid || !urlResult.url) {
    throw new AppError(400, urlResult.code || 'INVALID_URL', urlResult.error || 'Invalid URL supplied.');
  }
  const parsedUrl = urlResult.url;

  // Step 2: Pre-flight DNS validation (unless origin is explicitly allowed by test policy)
  const isAllowedOrigin = policy.allowedOrigins?.includes(parsedUrl.origin);
  if (!isAllowedOrigin) {
    const dnsResult = await validateHostDns(parsedUrl.hostname, policy);
    if (!dnsResult.valid) {
      throw new AppError(400, dnsResult.code || 'SECURITY_BLOCK', dnsResult.error || 'DNS check failed.');
    }
  }

  // Step 3: Acquire ephemeral browser context
  const browserManager = BrowserManager.getInstance();
  const lease = await browserManager.acquireContext();

  const securityViolations: string[] = [];
  let rejectSecurityViolation: ((err: AppError) => void) | null = null;
  const securityViolationPromise = new Promise<never>((_, reject) => {
    rejectSecurityViolation = reject;
  });

  const recordViolation = (violationMsg: string) => {
    securityViolations.push(violationMsg);
    if (rejectSecurityViolation) {
      rejectSecurityViolation(
        new AppError(400, 'SECURITY_BLOCK', `Security violation detected: ${violationMsg}`)
      );
    }
  };

  try {
    const context = lease.context;

    // Step 4: Install route interception across all requests (navigation, subresources, redirects)
    await context.route('**/*', async (route) => {
      const request = route.request();
      const reqUrl = request.url();

      try {
        const reqParsed = new URL(reqUrl);

        // Protocol check: strictly http and https
        if (reqParsed.protocol !== 'http:' && reqParsed.protocol !== 'https:') {
          recordViolation(`${reqUrl} (Disallowed protocol: ${reqParsed.protocol})`);
          await route.abort('blockedbyclient');
          return;
        }

        // If explicitly permitted origin by test policy, allow
        if (policy.allowedOrigins && policy.allowedOrigins.includes(reqParsed.origin)) {
          await route.continue();
          return;
        }

        // Validate request URL against security policy
        const reqCheck = validateUrl(reqUrl, policy);
        if (!reqCheck.valid) {
          recordViolation(`${reqUrl} (${reqCheck.error})`);
          await route.abort('blockedbyclient');
          return;
        }

        // Pre-resolve hostname for any outbound subresource/redirect
        const dnsCheck = await validateHostDns(reqParsed.hostname, policy);
        if (!dnsCheck.valid) {
          recordViolation(`${reqUrl} (${dnsCheck.error})`);
          await route.abort('blockedbyclient');
          return;
        }

        await route.continue();
      } catch (err) {
        recordViolation(`${reqUrl} (Inspection error: ${err instanceof Error ? err.message : String(err)})`);
        await route.abort('blockedbyclient');
      }
    });

    // Step 5: Create page and execute navigation with timeouts
    const page = await context.newPage();
    page.on('popup', async (popup) => {
      await popup.close().catch(() => {});
    });

    // Inspect HTTP redirects (301/302/307/308) before Chromium connects to redirect destination
    page.on('response', async (res) => {
      const status = res.status();
      if (status >= 300 && status < 400) {
        const locationHeader = res.headers()['location'];
        if (locationHeader) {
          try {
            const redirectUrl = new URL(locationHeader, res.url()).href;

            // Check if redirect target origin is in allowed test origins
            const redirectParsed = new URL(redirectUrl);
            if (policy.allowedOrigins && policy.allowedOrigins.includes(redirectParsed.origin)) {
              return;
            }

            const redirectCheck = validateUrl(redirectUrl, policy);
            if (!redirectCheck.valid) {
              recordViolation(`Redirect to prohibited URL: ${redirectUrl} (${redirectCheck.error})`);
              await page.close().catch(() => {});
              return;
            }

            const dnsCheck = await validateHostDns(redirectParsed.hostname, policy);
            if (!dnsCheck.valid) {
              recordViolation(`Redirect to prohibited host: ${redirectUrl} (${dnsCheck.error})`);
              await page.close().catch(() => {});
              return;
            }
          } catch {
            recordViolation(`Invalid redirect location header: ${locationHeader}`);
            await page.close().catch(() => {});
          }
        }
      }
    });

    const startTime = Date.now();

    // Enforce total hard timeout cap
    const navigationPromise = (async () => {
      const response = await page.goto(parsedUrl.href, {
        timeout: navigationTimeoutMs,
        waitUntil: 'domcontentloaded',
      });

      // If any request triggered a security abort on the main navigation
      if (securityViolations.length > 0) {
        throw new AppError(
          400,
          'SECURITY_BLOCK',
          `Security violation detected: ${securityViolations[0]}`
        );
      }

      if (!response) {
        throw new AppError(502, 'PAGE_LOAD_FAILED', 'Failed to retrieve response from target webpage.');
      }

      const finalUrl = page.url();
      const pageTitle = (await page.title()) || 'Untitled Page';
      const httpStatus = response.status();
      const loadTimeMs = Date.now() - startTime;

      return {
        url: parsedUrl.href,
        finalUrl,
        pageTitle,
        httpStatus,
        loadTimeMs,
        security: {
          isPublic: !isAllowedOrigin,
          protocol: parsedUrl.protocol,
        },
      };
    })();

    // Total timeout promise
    let timeoutTimer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new AppError(504, 'SCAN_TIMEOUT', `Total page scan exceeded ${totalTimeoutMs / 1000} seconds.`));
      }, totalTimeoutMs);
    });

    try {
      const result = await Promise.race([navigationPromise, timeoutPromise, securityViolationPromise]);
      return result;
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }

    const errStr = String(err);
    if (errStr.includes('Timeout') || errStr.includes('timed out')) {
      throw new AppError(504, 'NAVIGATION_TIMEOUT', `The webpage took longer than ${navigationTimeoutMs / 1000} seconds to load.`);
    }
    if (errStr.includes('net::ERR_BLOCKED_BY_CLIENT')) {
      throw new AppError(
        400,
        'SECURITY_BLOCK',
        securityViolations[0]
          ? `Security violation: ${securityViolations[0]}`
          : 'Access to private, loopback, or cloud metadata addresses is blocked.'
      );
    }
    if (errStr.includes('net::ERR_NAME_NOT_RESOLVED') || errStr.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new AppError(502, 'NETWORK_ERROR', 'Unable to reach the destination webpage. The host may be down or unreachable.');
    }
    if (errStr.includes('net::ERR_CERT_')) {
      throw new AppError(400, 'SSL_ERROR', 'The destination webpage has an invalid or untrusted SSL certificate.');
    }

    throw new AppError(502, 'PAGE_LOAD_FAILED', `Failed to load page: ${err instanceof Error ? err.message : errStr}`);
  } finally {
    // Step 6: Guaranteed context release and cleanup
    await lease.release();
  }
}

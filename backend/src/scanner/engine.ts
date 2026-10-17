import crypto from 'node:crypto';
import { AxeBuilder } from '@axe-core/playwright';
import { BrowserManager } from './browserManager.js';
import { validateUrl, type SecurityPolicy, PRODUCTION_SECURITY_POLICY } from '../security/urlValidator.js';
import { validateHostDns } from '../security/dnsValidator.js';
import { normalizeAxeViolations, calculateAuditSummary } from './normalizer.js';
import { evaluateMobileOverflow } from './mobileOverflow.js';
import { evaluateSeo } from './seoAudit.js';
import { evaluateSecurityHeaders } from './securityDiagnostics.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuditReport, RescanReport, AuditFinding } from '../types.js';

export interface AuditEngineOptions {
  policy?: SecurityPolicy;
  navigationTimeoutMs?: number;
  totalTimeoutMs?: number;
}

/**
 * Executes a full deterministic audit of a single public webpage.
 */
export async function runAudit(
  rawUrl: string,
  options: AuditEngineOptions = {}
): Promise<AuditReport> {
  const policy = options.policy ?? PRODUCTION_SECURITY_POLICY;
  const navigationTimeoutMs = options.navigationTimeoutMs ?? 15000;
  const totalTimeoutMs = options.totalTimeoutMs ?? 25000;

  // Step 1: Pre-flight URL validation
  const urlResult = validateUrl(rawUrl, policy);
  if (!urlResult.valid || !urlResult.url) {
    throw new AppError(400, urlResult.code || 'INVALID_URL', urlResult.error || 'Invalid URL supplied.');
  }
  const parsedUrl = urlResult.url;

  // Step 2: Pre-flight DNS validation
  const isAllowedOrigin = policy.allowedOrigins?.includes(parsedUrl.origin);
  if (!isAllowedOrigin) {
    const dnsResult = await validateHostDns(parsedUrl.hostname, policy);
    if (!dnsResult.valid) {
      throw new AppError(400, dnsResult.code || 'SECURITY_BLOCK', dnsResult.error || 'DNS check failed.');
    }
  }

  // Step 3: Acquire isolated browser context
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

    // Step 4: Network route interception
    await context.route('**/*', async (route) => {
      const request = route.request();
      const reqUrl = request.url();

      try {
        const reqParsed = new URL(reqUrl);

        if (reqParsed.protocol !== 'http:' && reqParsed.protocol !== 'https:') {
          recordViolation(`${reqUrl} (Disallowed protocol: ${reqParsed.protocol})`);
          await route.abort('blockedbyclient');
          return;
        }

        if (policy.allowedOrigins && policy.allowedOrigins.includes(reqParsed.origin)) {
          await route.continue();
          return;
        }

        const reqCheck = validateUrl(reqUrl, policy);
        if (!reqCheck.valid) {
          recordViolation(`${reqUrl} (${reqCheck.error})`);
          await route.abort('blockedbyclient');
          return;
        }

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

    // Step 5: Page setup & redirect monitoring
    const page = await context.newPage();
    page.on('popup', async (popup) => {
      await popup.close().catch(() => {});
    });

    page.on('response', async (res) => {
      const status = res.status();
      if (status >= 300 && status < 400) {
        const locationHeader = res.headers()['location'];
        if (locationHeader) {
          try {
            const redirectUrl = new URL(locationHeader, res.url()).href;
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

    // Step 6: Navigation and inspection runner
    const auditExecutionPromise = (async (): Promise<AuditReport> => {
      const response = await page.goto(parsedUrl.href, {
        timeout: navigationTimeoutMs,
        waitUntil: 'domcontentloaded',
      });

      if (securityViolations.length > 0) {
        throw new AppError(400, 'SECURITY_BLOCK', `Security violation detected: ${securityViolations[0]}`);
      }

      if (!response) {
        throw new AppError(502, 'PAGE_LOAD_FAILED', 'Failed to retrieve response from target webpage.');
      }

      const finalUrl = page.url();
      const pageTitle = (await page.title()) || 'Untitled Page';
      const httpStatus = response.status();
      const loadTimeMs = Date.now() - startTime;

      // Category 1: Deep accessibility checks via axe-core
      const targetRules = [
        'button-name',
        'input-button-name',
        'label',
        'aria-input-field-name',
        'select-name',
        'image-alt',
        'color-contrast',
        'heading-order',
        'page-has-heading-one',
        'link-name',
        'html-has-lang',
        'html-lang-valid',
        'duplicate-id-active',
        'landmark-one-main',
      ];

      const axeBuilder = new AxeBuilder({ page }).withRules(targetRules);
      const axeResults = await axeBuilder.analyze();
      const accessibilityFindings = normalizeAxeViolations(axeResults, finalUrl);

      // Category 2: Responsive layout evaluator at 375px
      const overflowFinding = await evaluateMobileOverflow(page, finalUrl);

      // Category 3: Deterministic SEO and Page Quality checks
      const seoFindings = await evaluateSeo(page, finalUrl);

      // Category 4: Defensive HTTP Response Header Diagnostics
      const securityFindings = evaluateSecurityHeaders(response.headers(), finalUrl);

      // Category 5: Real-user Performance Diagnostics via Navigation Timing API
      const perfMetrics = await page.evaluate(() => {
        try {
          const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navEntries && navEntries.length > 0) {
            const entry = navEntries[0];
            return {
              ttfb: entry.responseStart - entry.requestStart,
              domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
              loadComplete: entry.loadEventEnd - entry.startTime,
            };
          }
        } catch {
          // Fallback if Navigation Timing API unavailable
        }
        return null;
      });

      const performanceFindings: AuditFinding[] = [];
      if (perfMetrics && perfMetrics.ttfb > 1800) {
        performanceFindings.push({
          fingerprint: `perf_ttfb_${Math.round(perfMetrics.ttfb)}`,
          ruleId: 'performance-slow-ttfb',
          category: 'performance',
          severity: 'medium',
          message: `Server Time to First Byte (TTFB) is slow: ${Math.round(perfMetrics.ttfb)}ms.`,
          url: finalUrl,
          element: 'Server Network / Response',
          evidence: `Time to First Byte measured at ${Math.round(perfMetrics.ttfb)}ms (exceeds 1800ms threshold).`,
          suggestedFix: 'Optimize server processing, database queries, and CDN edge caching to reduce Time to First Byte below 800ms.',
          confidence: 'definitive',
          requiresHumanReview: false,
          helpUrl: 'https://web.dev/articles/ttfb',
          whatIsWrong: 'The web server took an excessively long time to respond with the first byte of HTML.',
          whyItMatters: 'Slow TTFB delays all browser rendering and can significantly hurt conversion rates and SEO rankings.',
          stepByStepFix: [
            'Audit backend database queries and external API calls required for initial HTML generation.',
            'Implement an edge CDN (e.g. Cloudflare, AWS CloudFront) to cache HTML responses closer to users.',
            'Enable HTTP/2 or HTTP/3 multiplexing and gzip/brotli payload compression.',
          ],
        });
      }

      const allFindings: AuditFinding[] = [
        ...accessibilityFindings,
        ...(overflowFinding ? [overflowFinding] : []),
        ...seoFindings,
        ...securityFindings,
        ...performanceFindings,
      ];

      const summary = calculateAuditSummary(allFindings);

      return {
        id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        url: parsedUrl.href,
        finalUrl,
        pageTitle,
        httpStatus,
        timestamp: new Date().toISOString(),
        loadTimeMs,
        summary,
        findings: allFindings,
      };
    })();

    let timeoutTimer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new AppError(504, 'SCAN_TIMEOUT', `Total audit scan exceeded ${totalTimeoutMs / 1000} seconds.`));
      }, totalTimeoutMs);
    });

    try {
      const report = await Promise.race([auditExecutionPromise, timeoutPromise, securityViolationPromise]);
      return report;
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
        securityViolations[0] || 'Access to private, loopback, or cloud metadata addresses is blocked.'
      );
    }
    if (errStr.includes('net::ERR_NAME_NOT_RESOLVED') || errStr.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new AppError(502, 'NETWORK_ERROR', 'Unable to reach the destination webpage. Host may be down or unreachable.');
    }
    if (errStr.includes('net::ERR_CERT_')) {
      throw new AppError(400, 'SSL_ERROR', 'The destination webpage has an invalid or untrusted SSL certificate.');
    }

    throw new AppError(502, 'PAGE_LOAD_FAILED', `Failed to audit page: ${err instanceof Error ? err.message : errStr}`);
  } finally {
    // Guaranteed context cleanup
    await lease.release();
  }
}

/**
 * Executes a fresh rescan and verifies which findings were resolved, which persist, and which are new.
 */
export async function runRescan(
  rawUrl: string,
  rawPreviousFingerprints: unknown = [],
  options: AuditEngineOptions = {}
): Promise<RescanReport> {
  // Safely sanitize input fingerprints
  const previousFingerprints: string[] = Array.isArray(rawPreviousFingerprints)
    ? rawPreviousFingerprints.filter((fp): fp is string => typeof fp === 'string' && fp.trim().length > 0)
    : [];

  const report = await runAudit(rawUrl, options);

  const freshFingerprints = new Set(report.findings.map((f) => f.fingerprint));
  const previousSet = new Set(previousFingerprints);

  const persistingFingerprints = previousFingerprints.filter((fp) => freshFingerprints.has(fp));
  const resolvedFingerprints = previousFingerprints.filter((fp) => !freshFingerprints.has(fp));
  const newFingerprints = report.findings
    .filter((f) => !previousSet.has(f.fingerprint))
    .map((f) => f.fingerprint);

  return {
    report,
    verification: {
      previousCount: previousFingerprints.length,
      freshCount: report.findings.length,
      persistingFingerprints,
      resolvedFingerprints,
      newFingerprints,
    },
  };
}

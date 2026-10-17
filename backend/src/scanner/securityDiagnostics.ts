import type { AuditFinding } from '../types.js';
import { generateFingerprint } from './normalizer.js';
import { getFindingGuidance } from './guidance.js';

export interface ResponseHeaderMap {
  [key: string]: string | undefined;
}

/**
 * Non-intrusively evaluates defensive HTTP security headers from the server's initial response.
 * Never executes invasive probes or unauthorized scans.
 */
export function evaluateSecurityHeaders(
  headers: ResponseHeaderMap,
  finalUrl: string
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const normalizedHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      normalizedHeaders[key.toLowerCase()] = value.trim();
    }
  }

  const isHttps = finalUrl.startsWith('https://');

  // 1. X-Content-Type-Options: nosniff
  if (normalizedHeaders['x-content-type-options'] !== 'nosniff') {
    const guidance = getFindingGuidance('security-nosniff');
    findings.push({
      fingerprint: generateFingerprint('security-nosniff', 'response.headers', 'x-content-type-options'),
      ruleId: 'security-nosniff',
      category: 'security',
      severity: 'low',
      message: 'Server response is missing the "X-Content-Type-Options: nosniff" header.',
      url: finalUrl,
      element: 'HTTP Response Headers',
      evidence: normalizedHeaders['x-content-type-options']
        ? `Header value is "${normalizedHeaders['x-content-type-options']}" instead of "nosniff".`
        : 'Header "X-Content-Type-Options" is absent.',
      suggestedFix: 'Configure your web server or edge CDN to send "X-Content-Type-Options: nosniff" with all responses.',
      confidence: 'definitive',
      requiresHumanReview: false,
      helpUrl: guidance.helpUrl,
      whatIsWrong: guidance.whatIsWrong,
      whyItMatters: guidance.whyItMatters,
      stepByStepFix: guidance.stepByStepFix,
      codeExample: guidance.codeExample,
      furtherGuidance: guidance.furtherGuidance,
    });
  }

  // 2. Clickjacking Defense: X-Frame-Options or Content-Security-Policy (frame-ancestors)
  const hasXfo = Boolean(normalizedHeaders['x-frame-options']);
  const csp = normalizedHeaders['content-security-policy'] || '';
  const hasFrameAncestors = csp.includes('frame-ancestors');

  if (!hasXfo && !hasFrameAncestors) {
    const guidance = getFindingGuidance('security-clickjacking');
    findings.push({
      fingerprint: generateFingerprint('security-clickjacking', 'response.headers', 'frame-protection'),
      ruleId: 'security-clickjacking',
      category: 'security',
      severity: 'medium',
      message: 'Webpage lacks clickjacking defense headers (X-Frame-Options or CSP frame-ancestors).',
      url: finalUrl,
      element: 'HTTP Response Headers',
      evidence: 'Neither X-Frame-Options nor Content-Security-Policy with frame-ancestors was detected in response headers.',
      suggestedFix: 'Add "X-Frame-Options: SAMEORIGIN" or "Content-Security-Policy: frame-ancestors \'self\'" to protect against malicious framing.',
      confidence: 'definitive',
      requiresHumanReview: false,
      helpUrl: guidance.helpUrl,
      whatIsWrong: guidance.whatIsWrong,
      whyItMatters: guidance.whyItMatters,
      stepByStepFix: guidance.stepByStepFix,
      codeExample: guidance.codeExample,
      furtherGuidance: guidance.furtherGuidance,
    });
  }

  // 3. Strict-Transport-Security (HSTS) on HTTPS pages
  if (isHttps && !normalizedHeaders['strict-transport-security']) {
    const guidance = getFindingGuidance('security-hsts');
    findings.push({
      fingerprint: generateFingerprint('security-hsts', 'response.headers', 'strict-transport-security'),
      ruleId: 'security-hsts',
      category: 'security',
      severity: 'low',
      message: 'HTTPS webpage is missing the "Strict-Transport-Security" (HSTS) header.',
      url: finalUrl,
      element: 'HTTP Response Headers',
      evidence: 'No "Strict-Transport-Security" header detected in HTTPS response.',
      suggestedFix: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to enforce HTTPS connections.',
      confidence: 'definitive',
      requiresHumanReview: false,
      helpUrl: guidance.helpUrl,
      whatIsWrong: guidance.whatIsWrong,
      whyItMatters: guidance.whyItMatters,
      stepByStepFix: guidance.stepByStepFix,
      codeExample: guidance.codeExample,
      furtherGuidance: guidance.furtherGuidance,
    });
  }

  return findings;
}

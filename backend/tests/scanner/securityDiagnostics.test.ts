import { describe, it, expect } from 'vitest';
import { evaluateSecurityHeaders } from '../../src/scanner/securityDiagnostics.js';
import { getFindingGuidance } from '../../src/scanner/guidance.js';

describe('Security Diagnostics & Header Auditing Unit Tests', () => {
  const dummyHttpsUrl = 'https://example.com/login';
  const dummyHttpUrl = 'http://example.com/blog';

  it('detects missing X-Content-Type-Options, clickjacking defenses, and HSTS on bare HTTPS responses', () => {
    const findings = evaluateSecurityHeaders({}, dummyHttpsUrl);
    expect(findings.length).toBe(3);

    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('security-nosniff');
    expect(ruleIds).toContain('security-clickjacking');
    expect(ruleIds).toContain('security-hsts');

    const nosniffFinding = findings.find((f) => f.ruleId === 'security-nosniff');
    expect(nosniffFinding?.category).toBe('security');
    expect(nosniffFinding?.confidence).toBe('definitive');
    expect(nosniffFinding?.requiresHumanReview).toBe(false);
  });

  it('does not flag HSTS when page is served over plain HTTP', () => {
    const findings = evaluateSecurityHeaders({}, dummyHttpUrl);
    const ruleIds = findings.map((f) => f.ruleId);
    expect(ruleIds).toContain('security-nosniff');
    expect(ruleIds).toContain('security-clickjacking');
    expect(ruleIds).not.toContain('security-hsts');
  });

  it('passes completely when all security headers are configured properly', () => {
    const secureHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
    };

    const findings = evaluateSecurityHeaders(secureHeaders, dummyHttpsUrl);
    expect(findings).toHaveLength(0);
  });

  it('accepts Content-Security-Policy frame-ancestors as valid clickjacking defense', () => {
    const secureHeaders = {
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
    };

    const findings = evaluateSecurityHeaders(secureHeaders, dummyHttpsUrl);
    expect(findings).toHaveLength(0);
  });

  it('provides structured guidance and step-by-step fix for security rules', () => {
    const guidance = getFindingGuidance('security-nosniff');
    expect(guidance.whatIsWrong).toBeDefined();
    expect(guidance.whyItMatters).toBeDefined();
    expect(guidance.stepByStepFix.length).toBeGreaterThan(0);
    expect(guidance.codeExample?.after).toContain('X-Content-Type-Options: nosniff');
  });
});

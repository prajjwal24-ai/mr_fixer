import { describe, it, expect } from 'vitest';
import {
  generateFingerprint,
  mapAxeImpactToSeverity,
  getSuggestedFix,
  calculateAuditSummary,
} from '../../src/scanner/normalizer.js';
import type { AuditFinding } from '../../src/types.js';

describe('Normalizer Unit Tests', () => {
  it('generates deterministic SHA-256 fingerprints', () => {
    const fp1 = generateFingerprint('button-name', 'header > button.menu', '<button class="menu"></button>');
    const fp2 = generateFingerprint('button-name', 'header > button.menu', '<button class="menu"></button>');
    const fpDifferent = generateFingerprint('button-name', 'footer > button.menu', '<button class="menu"></button>');

    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(16);
    expect(fp1).not.toBe(fpDifferent);
  });

  it('correctly maps axe impact to 4-tier severity model', () => {
    expect(mapAxeImpactToSeverity('critical')).toBe('critical');
    expect(mapAxeImpactToSeverity('serious')).toBe('high');
    expect(mapAxeImpactToSeverity('moderate')).toBe('medium');
    expect(mapAxeImpactToSeverity('minor')).toBe('low');
    expect(mapAxeImpactToSeverity(null)).toBe('medium');
    expect(mapAxeImpactToSeverity(undefined)).toBe('medium');
  });

  it('provides tailored suggested fix templates', () => {
    expect(getSuggestedFix('button-name')).toContain('aria-label');
    expect(getSuggestedFix('label')).toContain('<label for="element-id">');
    expect(getSuggestedFix('image-alt')).toContain('alt=""');
    expect(getSuggestedFix('color-contrast')).toContain('4.5:1');
    expect(getSuggestedFix('heading-order')).toContain('increase by only one level');
    expect(getSuggestedFix('mobile-horizontal-overflow')).toContain('horizontal overflow');
  });

  it('calculates audit summary metrics accurately', () => {
    const mockFindings: AuditFinding[] = [
      {
        fingerprint: 'fp1',
        ruleId: 'button-name',
        category: 'accessibility',
        severity: 'critical',
        message: 'Button without name',
        url: 'https://example.com',
        element: 'button',
        evidence: 'Empty',
        suggestedFix: 'Fix',
        confidence: 'definitive',
        requiresHumanReview: false,
      },
      {
        fingerprint: 'fp2',
        ruleId: 'image-alt',
        category: 'accessibility',
        severity: 'high',
        message: 'Image without alt',
        url: 'https://example.com',
        element: 'img',
        evidence: 'No alt',
        suggestedFix: 'Fix',
        confidence: 'needs_review',
        requiresHumanReview: true,
      },
      {
        fingerprint: 'fp3',
        ruleId: 'mobile-horizontal-overflow',
        category: 'layout',
        severity: 'high',
        message: 'Overflow',
        url: 'https://example.com',
        element: 'div',
        evidence: 'Overflow 100px',
        suggestedFix: 'Fix',
        confidence: 'definitive',
        requiresHumanReview: false,
      },
    ];

    const summary = calculateAuditSummary(mockFindings);
    expect(summary.total).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(2);
    expect(summary.medium).toBe(0);
    expect(summary.low).toBe(0);
    expect(summary.requiresHumanReviewCount).toBe(1);
    expect(summary.categories.accessibility).toBe(2);
    expect(summary.categories.layout).toBe(1);
  });
});

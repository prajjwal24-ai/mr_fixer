import { describe, it, expect } from 'vitest';
import { getFindingGuidance } from '../../src/scanner/guidance.js';
import { normalizeAxeViolations, generateFingerprint } from '../../src/scanner/normalizer.js';
import type { AxeResults } from 'axe-core';

describe('Guidance Engine Unit Tests', () => {
  const supportedRules = [
    'button-name',
    'input-button-name',
    'label',
    'aria-input-field-name',
    'select-name',
    'image-alt',
    'color-contrast',
    'heading-order',
    'page-has-heading-one',
    'mobile-horizontal-overflow',
  ];

  it.each(supportedRules)('provides comprehensive guidance for rule "%s"', (ruleId) => {
    const guidance = getFindingGuidance(ruleId, '<test></test>', '#test-selector');

    expect(guidance.whatIsWrong).toBeDefined();
    expect(guidance.whatIsWrong.length).toBeGreaterThan(15);

    expect(guidance.whyItMatters).toBeDefined();
    expect(guidance.whyItMatters.length).toBeGreaterThan(20);

    expect(Array.isArray(guidance.stepByStepFix)).toBe(true);
    expect(guidance.stepByStepFix.length).toBeGreaterThanOrEqual(3);

    expect(guidance.codeExample).toBeDefined();
    expect(guidance.codeExample?.before).toBeDefined();
    expect(guidance.codeExample?.after).toBeDefined();
    expect(guidance.codeExample?.explanation).toBeDefined();

    expect(guidance.furtherGuidance).toBeDefined();
    expect(guidance.furtherGuidance?.simplerExplanation).toBeDefined();
    expect(guidance.furtherGuidance?.simplerExplanation.length).toBeGreaterThan(20);

    expect(guidance.helpUrl).toBeDefined();
    expect(guidance.helpUrl).toMatch(/^https?:\/\//);
  });

  it('preserves axe-core helpUrl when provided', () => {
    const customAxeUrl = 'https://dequeuniversity.com/rules/axe/4.10/button-name?application=axeAPI';
    const guidance = getFindingGuidance('button-name', '<button></button>', 'button', customAxeUrl);
    expect(guidance.helpUrl).toBe(customAxeUrl);
  });

  it('falls back gracefully to standard W3C URLs when axe helpUrl is missing or undefined', () => {
    const guidance = getFindingGuidance('image-alt', '<img>', 'img', undefined);
    expect(guidance.helpUrl).toBe('https://www.w3.org/WAI/tutorials/images/');
  });

  it('handles unknown or unexpected rules with safe fallback guidance', () => {
    const fallbackGuidance = getFindingGuidance('unknown-custom-rule', '<div></div>', 'div');

    expect(fallbackGuidance.whatIsWrong).toContain('unknown-custom-rule');
    expect(fallbackGuidance.whyItMatters).toContain('Accessibility standards');
    expect(fallbackGuidance.stepByStepFix.length).toBeGreaterThan(0);
    expect(fallbackGuidance.helpUrl).toBe('https://www.w3.org/WAI/standards-guidelines/wcag/');
  });

  it('handles missing optional metadata (empty snippet, no selector)', () => {
    const guidance = getFindingGuidance('color-contrast', undefined, undefined, undefined);

    expect(guidance.whatIsWrong).toContain('contrast');
    expect(guidance.codeExample?.before).toContain('color');
    expect(guidance.codeExample?.after).toContain('color');
  });

  it('provides framework-specific code for React, Vue, and Tailwind on key rules', () => {
    const btnGuidance = getFindingGuidance('button-name');
    expect(btnGuidance.furtherGuidance?.frameworkGuidance?.react).toContain('aria-label');
    expect(btnGuidance.furtherGuidance?.frameworkGuidance?.vue).toContain('aria-label');
    expect(btnGuidance.furtherGuidance?.frameworkGuidance?.tailwind).toContain('aria-label');

    const labelGuidance = getFindingGuidance('label');
    expect(labelGuidance.furtherGuidance?.frameworkGuidance?.react).toContain('htmlFor');
    expect(labelGuidance.furtherGuidance?.frameworkGuidance?.vue).toContain('label for');
    expect(labelGuidance.furtherGuidance?.frameworkGuidance?.tailwind).toContain('label');
  });
});

describe('Axe Normalizer with Guidance Integration Tests', () => {
  it('enriches findings with guidance while keeping fingerprints 100% deterministic', () => {
    const mockAxeResults: AxeResults = {
      violations: [
        {
          id: 'button-name',
          impact: 'critical',
          help: 'Buttons must have discernible text',
          description: 'Ensures buttons have discernible text',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/button-name',
          tags: ['wcag2a'],
          nodes: [
            {
              target: ['button.menu-toggle'],
              html: '<button class="menu-toggle"><i class="icon"></i></button>',
              failureSummary: 'Fix any of the following: Element does not have inner text that is visible to screen readers',
              any: [],
              all: [],
              none: [],
            },
          ],
        },
      ],
      passes: [],
      incomplete: [],
      inapplicable: [],
      timestamp: new Date().toISOString(),
      url: 'https://example.com',
    } as unknown as AxeResults;

    const findings = normalizeAxeViolations(mockAxeResults, 'https://example.com');
    expect(findings).toHaveLength(1);

    const f = findings[0];
    const expectedFingerprint = generateFingerprint(
      'button-name',
      'button.menu-toggle',
      '<button class="menu-toggle"><i class="icon"></i></button>'
    );

    // Fingerprint integrity preserved
    expect(f.fingerprint).toBe(expectedFingerprint);
    expect(f.ruleId).toBe('button-name');
    expect(f.severity).toBe('critical');

    // Enhanced guidance fields present
    expect(f.helpUrl).toBe('https://dequeuniversity.com/rules/axe/4.10/button-name');
    expect(f.whatIsWrong).toContain('accessible name');
    expect(f.whyItMatters).toContain('screen reader');
    expect(f.stepByStepFix).toBeInstanceOf(Array);
    expect(f.codeExample?.before).toContain('<button');
    expect(f.codeExample?.after).toContain('aria-label');
    expect(f.furtherGuidance?.simplerExplanation).toBeDefined();
  });

  it('handles axe violations with missing failureSummary gracefully', () => {
    const mockAxeResults: AxeResults = {
      violations: [
        {
          id: 'heading-order',
          impact: 'moderate',
          help: 'Heading levels should only increase by one',
          description: 'Ensures the order of headings is semantically correct',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/heading-order',
          tags: ['wcag2a'],
          nodes: [
            {
              target: ['h3.sub'],
              html: '<h3 class="sub">Header</h3>',
              // failureSummary is undefined
              any: [],
              all: [],
              none: [],
            },
          ],
        },
      ],
      passes: [],
      incomplete: [],
      inapplicable: [],
      timestamp: new Date().toISOString(),
      url: 'https://example.com',
    } as unknown as AxeResults;

    const findings = normalizeAxeViolations(mockAxeResults, 'https://example.com');
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toBe('Heading levels should only increase by one');
    expect(findings[0].whatIsWrong).toBeDefined();
    expect(findings[0].stepByStepFix?.length).toBeGreaterThan(0);
  });
});

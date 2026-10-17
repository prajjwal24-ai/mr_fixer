import crypto from 'node:crypto';
import type { AxeResults, Result as AxeResult, NodeResult } from 'axe-core';
import { getFindingGuidance } from './guidance.js';
import type {
  AuditFinding,
  FindingCategory,
  FindingSeverity,
  FindingConfidence,
  AuditSummary,
} from '../types.js';

/**
 * Maps axe-core impact strings to our four-tier severity model.
 */
export function mapAxeImpactToSeverity(impact?: string | null): FindingSeverity {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'high';
    case 'moderate':
      return 'medium';
    case 'minor':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Generates a stable, reproducible SHA-256 fingerprint for a finding.
 */
export function generateFingerprint(
  ruleId: string,
  selector: string,
  snippet?: string
): string {
  const normalizedRule = ruleId.trim().toLowerCase();
  const normalizedSelector = selector.trim().toLowerCase();
  // Extract tag or key attributes as a stable hint
  const snippetHint = snippet
    ? snippet.replace(/\s+/g, ' ').slice(0, 50).trim().toLowerCase()
    : '';

  const raw = `${normalizedRule}::${normalizedSelector}::${snippetHint}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * Returns tailored, actionable fix templates based on the rule ID and context.
 */
export function getSuggestedFix(ruleId: string, snippet?: string): string {
  switch (ruleId) {
    case 'button-name':
    case 'input-button-name':
      return 'Provide discernible text inside the button (e.g. <button>Submit</button>) or add an aria-label describing its action (e.g. <button aria-label="Close menu">...).';

    case 'label':
    case 'aria-input-field-name':
    case 'select-name':
      return 'Associate a visible <label for="element-id">Text</label> with the form control, or add an aria-label="Descriptive Name" directly to the input element.';

    case 'image-alt':
      return 'Add an informative alt attribute describing the image content (e.g., <img alt="Product preview" ...>). If the image is purely decorative, specify empty alt text: alt="" and role="presentation".';

    case 'color-contrast':
      return 'Increase the contrast ratio between the text foreground and background to at least 4.5:1 for standard body text (or 3:1 for large text >= 18pt or bold >= 14pt). Note: Automated tools cannot reliably determine contrast over complex gradients or images; human review is advised.';

    case 'heading-order':
      return 'Ensure heading levels increase by only one level at a time (e.g., <h1> followed by <h2>, not skipping directly from <h1> to <h3>).';

    case 'page-has-heading-one':
      return 'Include a top-level <h1> heading on the page to communicate the primary title or purpose of the page to screen reader users.';

    case 'link-name':
      return 'Add discernible text or an aria-label attribute to the <a> tag explaining the link destination.';

    case 'html-has-lang':
    case 'html-lang-valid':
      return 'Add a valid BCP 47 language code attribute to the <html> tag (e.g. <html lang="en">).';

    case 'duplicate-id-active':
      return 'Ensure all interactive or focusable elements have globally unique id attribute values.';

    case 'landmark-one-main':
      return 'Wrap the primary document contents in a single semantic <main> landmark element.';

    case 'document-title':
      return 'Add a descriptive, concise <title> inside the <head> element.';

    case 'meta-description':
      return 'Add a <meta name="description" content="..."> element inside the <head> with a summary of the page.';

    case 'meta-viewport-scalable':
      return 'Ensure the <meta name="viewport"> tag does not disable pinch-to-zoom (remove user-scalable=no and maximum-scale=1).';

    case 'security-nosniff':
      return 'Configure server responses to include the "X-Content-Type-Options: nosniff" security header.';

    case 'security-clickjacking':
      return 'Add "X-Frame-Options: SAMEORIGIN" or "Content-Security-Policy: frame-ancestors \'self\'" to protect against clickjacking.';

    case 'security-hsts':
      return 'Send the "Strict-Transport-Security: max-age=31536000; includeSubDomains" header on all HTTPS responses.';

    case 'performance-slow-ttfb':
      return 'Optimize server processing, database queries, and CDN edge caching to reduce Time to First Byte below 800ms.';

    case 'mobile-horizontal-overflow':
      return 'Eliminate horizontal overflow at mobile viewports by replacing fixed pixel widths (e.g., width: 600px) with responsive styles (e.g., max-width: 100%), applying box-sizing: border-box, or ensuring children do not exceed their parent container.';

    default:
      return 'Inspect the offending element and update its HTML or CSS attributes to comply with WCAG 2.1 AA requirements.';
  }
}

/**
 * Converts axe-core violations into normalized AuditFinding objects.
 */
export function normalizeAxeViolations(axeResults: AxeResults, pageUrl: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const seenFingerprints = new Set<string>();

  for (const violation of axeResults.violations) {
    const ruleId = violation.id;
    const category: FindingCategory = 'accessibility';
    const severity = mapAxeImpactToSeverity(violation.impact);

    for (const node of violation.nodes) {
      const selector = Array.isArray(node.target) ? node.target.join(' > ') : String(node.target);
      const snippet = node.html ? node.html.trim().slice(0, 300) : undefined;
      const fingerprint = generateFingerprint(ruleId, selector, snippet);

      // Deterministic deduplication
      if (seenFingerprints.has(fingerprint)) {
        continue;
      }
      seenFingerprints.add(fingerprint);

      // Determine confidence and human review flags
      let confidence: FindingConfidence = 'definitive';
      let requiresHumanReview = false;

      if (ruleId === 'image-alt') {
        // Intent of an image (decorative vs informative) requires human judgment
        requiresHumanReview = true;
        confidence = 'needs_review';
      } else if (ruleId === 'color-contrast') {
        // Contrast on complex CSS or gradients may require human confirmation
        requiresHumanReview = true;
        confidence = 'needs_review';
      }

      const evidence = node.failureSummary
        ? node.failureSummary.replace(/^Fix (all|any) of the following:\s*/i, '').trim()
        : violation.help;

      const guidance = getFindingGuidance(ruleId, snippet, selector, violation.helpUrl);

      findings.push({
        fingerprint,
        ruleId,
        category,
        severity,
        message: violation.help,
        url: pageUrl,
        element: selector,
        snippet,
        evidence,
        suggestedFix: getSuggestedFix(ruleId, snippet),
        confidence,
        requiresHumanReview,
        helpUrl: guidance.helpUrl,
        whatIsWrong: guidance.whatIsWrong,
        whyItMatters: guidance.whyItMatters,
        stepByStepFix: guidance.stepByStepFix,
        codeExample: guidance.codeExample,
        furtherGuidance: guidance.furtherGuidance,
      });
    }
  }

  return findings;
}

export { getFindingGuidance } from './guidance.js';

/**
 * Calculates summary totals and category breakdowns from findings.
 */
export function calculateAuditSummary(findings: AuditFinding[]): AuditSummary {
  const summary: AuditSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: findings.length,
    requiresHumanReviewCount: 0,
    categories: {
      accessibility: 0,
      layout: 0,
      seo: 0,
      security: 0,
      performance: 0,
    },
  };

  for (const finding of findings) {
    if (finding.severity === 'critical') summary.critical++;
    else if (finding.severity === 'high') summary.high++;
    else if (finding.severity === 'medium') summary.medium++;
    else if (finding.severity === 'low') summary.low++;

    if (finding.requiresHumanReview) {
      summary.requiresHumanReviewCount++;
    }

    if (finding.category === 'accessibility') {
      summary.categories.accessibility++;
    } else if (finding.category === 'layout') {
      summary.categories.layout++;
    } else if (finding.category === 'seo') {
      summary.categories.seo = (summary.categories.seo || 0) + 1;
    } else if (finding.category === 'security') {
      summary.categories.security = (summary.categories.security || 0) + 1;
    } else if (finding.category === 'performance') {
      summary.categories.performance = (summary.categories.performance || 0) + 1;
    }
  }

  return summary;
}

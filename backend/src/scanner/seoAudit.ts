import type { Page } from 'playwright';
import type { AuditFinding } from '../types.js';
import { generateFingerprint } from './normalizer.js';
import { getFindingGuidance } from './guidance.js';

export interface SeoAuditData {
  title?: string;
  metaDescription?: string;
  hasMetaDescription: boolean;
  hasViewportMeta: boolean;
  viewportContent?: string;
  canonicalCount: number;
}

/**
 * Deterministically evaluates SEO and page quality indicators in the page DOM context.
 */
export async function evaluateSeo(page: Page, pageUrl: string): Promise<AuditFinding[]> {
  try {
    const data: SeoAuditData = await page.evaluate(() => {
      const title = document.title ? document.title.trim() : '';
      const descEl = document.querySelector('meta[name="description"]');
      const descContent = descEl ? descEl.getAttribute('content')?.trim() : undefined;
      const viewportEl = document.querySelector('meta[name="viewport"]');
      const viewportContent = viewportEl ? viewportEl.getAttribute('content')?.trim() : undefined;
      const canonicals = document.querySelectorAll('link[rel="canonical"]');

      return {
        title,
        metaDescription: descContent,
        hasMetaDescription: descEl !== null,
        hasViewportMeta: viewportEl !== null,
        viewportContent,
        canonicalCount: canonicals.length,
      };
    });

    const findings: AuditFinding[] = [];

    // 1. Document Title Check
    if (!data.title) {
      const guidance = getFindingGuidance('document-title');
      findings.push({
        fingerprint: generateFingerprint('document-title', 'head > title', ''),
        ruleId: 'document-title',
        category: 'seo',
        severity: 'high',
        message: 'Webpage is missing a document <title> tag or the title is empty.',
        url: pageUrl,
        element: 'head > title',
        evidence: 'document.title is empty or not defined.',
        suggestedFix: 'Add a descriptive, concise <title> inside the <head> element (e.g. <title>Page Name - Site Name</title>).',
        confidence: 'definitive',
        requiresHumanReview: false,
        helpUrl: guidance.helpUrl,
        whatIsWrong: guidance.whatIsWrong,
        whyItMatters: guidance.whyItMatters,
        stepByStepFix: guidance.stepByStepFix,
        codeExample: guidance.codeExample,
        furtherGuidance: guidance.furtherGuidance,
      });
    } else if (['untitled', 'document', 'home', 'new page', 'untitled page'].includes(data.title.toLowerCase())) {
      const guidance = getFindingGuidance('document-title');
      findings.push({
        fingerprint: generateFingerprint('document-title', 'head > title', data.title),
        ruleId: 'document-title',
        category: 'seo',
        severity: 'medium',
        message: `Webpage uses a generic placeholder title: "${data.title}".`,
        url: pageUrl,
        element: 'head > title',
        snippet: `<title>${data.title}</title>`,
        evidence: `document.title is "${data.title}", which does not uniquely identify page content.`,
        suggestedFix: 'Replace the generic placeholder title with a descriptive title specific to this page.',
        confidence: 'definitive',
        requiresHumanReview: false,
        helpUrl: guidance.helpUrl,
        whatIsWrong: 'The title tag exists but uses generic text instead of describing page content.',
        whyItMatters: 'Search engines and screen reader users rely on specific titles to identify open browser tabs and search results.',
        stepByStepFix: guidance.stepByStepFix,
        codeExample: guidance.codeExample,
        furtherGuidance: guidance.furtherGuidance,
      });
    }

    // 2. Meta Description Check
    if (!data.hasMetaDescription || !data.metaDescription) {
      const guidance = getFindingGuidance('meta-description');
      findings.push({
        fingerprint: generateFingerprint('meta-description', 'head > meta[name="description"]', ''),
        ruleId: 'meta-description',
        category: 'seo',
        severity: 'medium',
        message: 'Webpage is missing a meta description tag.',
        url: pageUrl,
        element: 'head',
        evidence: 'No <meta name="description" content="..."> element found in document <head>.',
        suggestedFix: 'Add a <meta name="description" content="1-2 sentence summary of this page"> inside the <head>.',
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

    // 3. Meta Viewport & Zoom Scalability Check
    if (!data.hasViewportMeta) {
      const guidance = getFindingGuidance('meta-viewport-scalable');
      findings.push({
        fingerprint: generateFingerprint('meta-viewport-scalable', 'head', 'missing-viewport'),
        ruleId: 'meta-viewport-scalable',
        category: 'seo',
        severity: 'high',
        message: 'Webpage is missing a responsive <meta name="viewport"> tag.',
        url: pageUrl,
        element: 'head',
        evidence: 'No <meta name="viewport"> tag found.',
        suggestedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your document <head>.',
        confidence: 'definitive',
        requiresHumanReview: false,
        helpUrl: guidance.helpUrl,
        whatIsWrong: guidance.whatIsWrong,
        whyItMatters: guidance.whyItMatters,
        stepByStepFix: guidance.stepByStepFix,
        codeExample: guidance.codeExample,
        furtherGuidance: guidance.furtherGuidance,
      });
    } else if (data.viewportContent) {
      const vp = data.viewportContent.toLowerCase();
      const disablesZoom = vp.includes('user-scalable=no') || vp.includes('maximum-scale=1') || vp.includes('user-scalable=0');
      if (disablesZoom) {
        const guidance = getFindingGuidance('meta-viewport-scalable');
        findings.push({
          fingerprint: generateFingerprint('meta-viewport-scalable', 'meta[name="viewport"]', data.viewportContent),
          ruleId: 'meta-viewport-scalable',
          category: 'seo',
          severity: 'high',
          message: 'Viewport meta tag disables or restricts user pinch-to-zoom scaling.',
          url: pageUrl,
          element: 'meta[name="viewport"]',
          snippet: `<meta name="viewport" content="${data.viewportContent}">`,
          evidence: `Viewport contains restrictive zoom directives: "${data.viewportContent}".`,
          suggestedFix: 'Remove "user-scalable=no" and "maximum-scale=1" to allow low-vision users to zoom (WCAG 1.4.4).',
          confidence: 'definitive',
          requiresHumanReview: false,
          helpUrl: guidance.helpUrl,
          whatIsWrong: 'The viewport configuration actively disables user pinch-to-zoom.',
          whyItMatters: 'Users with visual impairments cannot zoom in to read small text when pinch-to-zoom is disabled.',
          stepByStepFix: guidance.stepByStepFix,
          codeExample: guidance.codeExample,
          furtherGuidance: guidance.furtherGuidance,
        });
      }
    }

    return findings;
  } catch {
    // If page evaluation fails (e.g. unrenderable page), return empty findings safely
    return [];
  }
}

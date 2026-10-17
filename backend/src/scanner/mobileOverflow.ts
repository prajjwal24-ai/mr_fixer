import type { Page } from 'playwright';
import type { AuditFinding } from '../types.js';
import { generateFingerprint, getSuggestedFix } from './normalizer.js';

export interface MobileOverflowResult {
  isOverflowing: boolean;
  scrollWidth: number;
  viewportWidth: number;
  culprit?: {
    selector: string;
    snippet: string;
    width: number;
    right: number;
  };
}

/**
 * Evaluates a page at a 375px mobile viewport to detect horizontal overflow.
 * Restores the original viewport state upon completion.
 */
export async function evaluateMobileOverflow(
  page: Page,
  pageUrl: string,
  tolerance = 2
): Promise<AuditFinding | null> {
  const originalViewport = page.viewportSize();

  try {
    // Emulate standard mobile viewport (iPhone SE / standard 375px)
    await page.setViewportSize({ width: 375, height: 667 });
    // Allow CSS media queries and responsive layouts to settle
    await page.waitForTimeout(100);

    const overflowData: MobileOverflowResult = await page.evaluate((tol) => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
      const viewportWidth = window.innerWidth;
      const isOverflowing = scrollWidth > viewportWidth + tol;

      if (!isOverflowing) {
        return { isOverflowing: false, scrollWidth, viewportWidth };
      }

      // Identify the most prominent element causing horizontal overflow
      const candidates: Array<{ selector: string; snippet: string; width: number; right: number }> = [];
      const allElements = document.querySelectorAll('*');

      function buildSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        let path = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
          if (classes.length > 0) {
            path += `.${classes.join('.')}`;
          }
        }
        if (el.parentElement && el.parentElement !== document.body) {
          const parentTag = el.parentElement.tagName.toLowerCase();
          const parentId = el.parentElement.id ? `#${el.parentElement.id}` : '';
          return `${parentTag}${parentId} > ${path}`;
        }
        return path;
      }

      for (const el of allElements) {
        // Skip hidden or zero-size elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          continue;
        }

        const rect = el.getBoundingClientRect();
        if (rect.right > viewportWidth + tol || rect.width > viewportWidth + tol) {
          candidates.push({
            selector: buildSelector(el),
            snippet: el.outerHTML ? el.outerHTML.slice(0, 250) : '',
            width: Math.round(rect.width),
            right: Math.round(rect.right),
          });
          if (candidates.length >= 10) break;
        }
      }

      // Sort by furthest right edge to pick the worst offender
      candidates.sort((a, b) => b.right - a.right);
      const culprit = candidates[0];

      return {
        isOverflowing: true,
        scrollWidth: Math.round(scrollWidth),
        viewportWidth,
        culprit,
      };
    }, tolerance);

    if (!overflowData.isOverflowing) {
      return null;
    }

    const culpritSelector = overflowData.culprit?.selector || 'document';
    const culpritSnippet = overflowData.culprit?.snippet;
    const overflowDiff = overflowData.scrollWidth - overflowData.viewportWidth;
    const culpritDetail = overflowData.culprit
      ? `Offending element: "${culpritSelector}" (width: ${overflowData.culprit.width}px, right edge: ${overflowData.culprit.right}px).`
      : 'Elements extend past the viewport boundary.';

    const evidence = `Document scrollWidth (${overflowData.scrollWidth}px) exceeds mobile viewport (${overflowData.viewportWidth}px) by ${overflowDiff}px. ${culpritDetail}`;
    const fingerprint = generateFingerprint('mobile-horizontal-overflow', culpritSelector, culpritSnippet);

    return {
      fingerprint,
      ruleId: 'mobile-horizontal-overflow',
      category: 'layout',
      severity: 'high',
      message: 'Webpage triggers horizontal scrollbar at a mobile viewport (375px width).',
      url: pageUrl,
      element: culpritSelector,
      snippet: culpritSnippet,
      evidence,
      suggestedFix: getSuggestedFix('mobile-horizontal-overflow'),
      confidence: 'definitive',
      requiresHumanReview: false,
    };
  } catch {
    // If layout measurement fails (e.g. unrenderable page), return null safely
    return null;
  } finally {
    // Guarantee viewport restoration
    if (originalViewport) {
      try {
        await page.setViewportSize(originalViewport);
      } catch {
        // Ignore if page is already closing
      }
    }
  }
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import request from 'supertest';
import { runAudit, runRescan } from '../../src/scanner/engine.js';
import { BrowserManager } from '../../src/scanner/browserManager.js';
import { createApp } from '../../src/app.js';
import type { SecurityPolicy } from '../../src/security/urlValidator.js';

describe('Deterministic Audit Engine Integration Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let serverOrigin: string;
  let testPolicy: SecurityPolicy;
  const app = createApp();

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/clean-page') {
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A clean, fully accessible test page designed to pass all quality audits.">
  <title>Clean Accessible Webpage</title>
  <style>
    body { font-family: sans-serif; color: #111111; background-color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 100%; box-sizing: border-box; }
    button { color: #ffffff; background-color: #0055aa; border: none; padding: 10px 15px; }
  </style>
</head>
<body>
  <main class="container">
    <h1>Clean Page Header</h1>
    <h2>Section One</h2>
    <p>High contrast text on pure white background.</p>
    <button type="button">Accessible Button</button>
    <form>
      <label for="full-name">Full Name</label>
      <input type="text" id="full-name" name="name">
    </form>
    <img src="data:image/svg+xml,<svg></svg>" alt="Informative illustration">
    <img src="data:image/svg+xml,<svg></svg>" alt="" role="presentation">
  </main>
</body>
</html>`);
        return;
      }

      if (url === '/flawed-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flawed Webpage with Known Issues</title>
  <style>
    body { font-family: sans-serif; background-color: #ffffff; margin: 0; padding: 20px; }
    .low-contrast { color: #aaaaaa; background-color: #ffffff; }
    .wide-banner { width: 800px; height: 100px; background-color: #ffeedd; }
  </style>
</head>
<body>
  <!-- Category E: Heading structure issues -->
  <h2>First heading is h2 (missing h1)</h2>
  <h4>Skipped from h2 to h4</h4>

  <!-- Category A: Button without accessible name -->
  <button id="bad-btn" type="button"><i class="icon"></i></button>

  <!-- Category B: Form control without label -->
  <input type="text" id="unlabeled-input">

  <!-- Category C: Image without alt text -->
  <img id="missing-alt-img" src="data:image/svg+xml,<svg></svg>">

  <!-- Category D: Color contrast violation (approx 2.3:1) -->
  <p id="contrast-fail" class="low-contrast">Light gray text on white background.</p>

  <!-- Custom: Mobile horizontal overflow (800px wide box on 375px viewport) -->
  <div id="wide-overflow-box" class="wide-banner">This element is 800px wide.</div>
</body>
</html>`);
        return;
      }

      if (url === '/fixed-page') {
        // Partially fixed: button, input, and overflow fixed; image alt persists; new bad button added
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partially Fixed Webpage</title>
  <style>
    body { font-family: sans-serif; color: #111; background-color: #ffffff; margin: 0; padding: 20px; }
    .responsive-banner { max-width: 100%; height: 100px; background-color: #ffeedd; }
  </style>
</head>
<body>
  <h1>Valid Level 1 Heading</h1>
  <h2>Level 2 Heading</h2>

  <!-- Button A fixed with aria-label -->
  <button id="bad-btn" type="button" aria-label="Fixed Menu Action">Icon</button>

  <!-- Input B fixed with label -->
  <label for="unlabeled-input">Username Label</label>
  <input type="text" id="unlabeled-input">

  <!-- Image C STILL missing alt text (PERSISTING) -->
  <img id="missing-alt-img" src="data:image/svg+xml,<svg></svg>">

  <!-- Overflow fixed with responsive max-width -->
  <div id="wide-overflow-box" class="responsive-banner">Now responsive.</div>

  <!-- Newly introduced defect (NEW) -->
  <button id="new-unlabeled-btn" type="button"></button>
</body>
</html>`);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
          serverOrigin = `http://127.0.0.1:${serverPort}`;
          testPolicy = {
            allowLoopback: false,
            allowPrivateNetworks: false,
            allowedOrigins: [serverOrigin],
          };
          resolve();
        }
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await BrowserManager.resetInstance();
  });

  it('audits a clean page and reports zero accessibility and layout violations', async () => {
    const report = await runAudit(`${serverOrigin}/clean-page`, { policy: testPolicy });

    expect(report.httpStatus).toBe(200);
    expect(report.pageTitle).toBe('Clean Accessible Webpage');
    expect(report.findings).toHaveLength(0);
    expect(report.summary.total).toBe(0);
    expect(report.summary.critical).toBe(0);
    expect(report.summary.high).toBe(0);
  });

  it('detects all 5 planned categories plus mobile horizontal overflow on flawed page', async () => {
    const report = await runAudit(`${serverOrigin}/flawed-page`, { policy: testPolicy });

    expect(report.findings.length).toBeGreaterThanOrEqual(5);

    const ruleIds = report.findings.map((f) => f.ruleId);

    // Category A: Button accessible name
    expect(ruleIds).toContain('button-name');
    const buttonFinding = report.findings.find((f) => f.ruleId === 'button-name');
    expect(buttonFinding?.severity).toBe('critical');
    expect(buttonFinding?.suggestedFix).toContain('aria-label');
    expect(buttonFinding?.requiresHumanReview).toBe(false);

    // Category B: Form label
    expect(ruleIds).toContain('label');
    const labelFinding = report.findings.find((f) => f.ruleId === 'label');
    expect(labelFinding?.severity).toBe('critical');

    // Category C: Image alt text
    expect(ruleIds).toContain('image-alt');
    const imgFinding = report.findings.find((f) => f.ruleId === 'image-alt');
    expect(imgFinding?.requiresHumanReview).toBe(true);
    expect(imgFinding?.confidence).toBe('needs_review');

    // Category D: Color contrast
    expect(ruleIds).toContain('color-contrast');
    const contrastFinding = report.findings.find((f) => f.ruleId === 'color-contrast');
    expect(contrastFinding?.requiresHumanReview).toBe(true);

    // Category E: Heading structure (heading-order or page-has-heading-one)
    const hasHeadingIssue = ruleIds.includes('heading-order') || ruleIds.includes('page-has-heading-one');
    expect(hasHeadingIssue).toBe(true);

    // Category Custom: Mobile horizontal overflow
    expect(ruleIds).toContain('mobile-horizontal-overflow');
    const overflowFinding = report.findings.find((f) => f.ruleId === 'mobile-horizontal-overflow');
    expect(overflowFinding?.category).toBe('layout');
    expect(overflowFinding?.severity).toBe('high');
    expect(overflowFinding?.evidence).toContain('exceeds mobile viewport');

    // Verify rich repair guidance fields on findings
    expect(buttonFinding?.whatIsWrong).toBeDefined();
    expect(buttonFinding?.whyItMatters).toBeDefined();
    expect(buttonFinding?.stepByStepFix?.length).toBeGreaterThan(0);
    expect(buttonFinding?.codeExample?.before).toBeDefined();
    expect(buttonFinding?.codeExample?.after).toBeDefined();

    expect(overflowFinding?.whatIsWrong).toBeDefined();
    expect(overflowFinding?.stepByStepFix?.length).toBeGreaterThan(0);
  });

  it('produces 100% stable deterministic fingerprints across repeated scans', async () => {
    const report1 = await runAudit(`${serverOrigin}/flawed-page`, { policy: testPolicy });
    const report2 = await runAudit(`${serverOrigin}/flawed-page`, { policy: testPolicy });

    const fps1 = report1.findings.map((f) => f.fingerprint).sort();
    const fps2 = report2.findings.map((f) => f.fingerprint).sort();

    expect(fps1).toEqual(fps2);
  });

  it('verifies resolved, persisting, and new findings via runRescan', async () => {
    // Initial scan of flawed page
    const initialReport = await runAudit(`${serverOrigin}/flawed-page`, { policy: testPolicy });
    const initialFingerprints = initialReport.findings.map((f) => f.fingerprint);

    // Rescan of fixed page
    const rescanResult = await runRescan(`${serverOrigin}/fixed-page`, initialFingerprints, {
      policy: testPolicy,
    });

    const { verification, report } = rescanResult;

    // The fixed items (button, input, overflow) must be marked resolved
    expect(verification.resolvedFingerprints.length).toBeGreaterThanOrEqual(2);

    // The image alt defect (kept on fixed-page) must be marked persisting
    const imgAltFp = initialReport.findings.find((f) => f.ruleId === 'image-alt')?.fingerprint;
    expect(verification.persistingFingerprints).toContain(imgAltFp);

    // The newly introduced button on fixed-page must be marked new
    expect(verification.newFingerprints.length).toBeGreaterThan(0);
    expect(report.findings.length).toBe(verification.freshCount);
  });

  it('handles malformed or empty previousFingerprints gracefully in runRescan', async () => {
    const rescanResult = await runRescan(
      `${serverOrigin}/clean-page`,
      ['not-a-real-fingerprint', null, 12345, '   '],
      { policy: testPolicy }
    );

    expect(rescanResult.verification.previousCount).toBe(1); // Only the valid string is counted
    expect(rescanResult.verification.resolvedFingerprints).toEqual(['not-a-real-fingerprint']);
    expect(rescanResult.verification.persistingFingerprints).toHaveLength(0);
  });

  it('proves decorative images with alt="" produce zero image-alt violations', async () => {
    const report = await runAudit(`${serverOrigin}/clean-page`, { policy: testPolicy });
    const imgAltFindings = report.findings.filter((f) => f.ruleId === 'image-alt');
    expect(imgAltFindings).toHaveLength(0);
  });

  it('marks all previous issues as resolved when rescan audits clean page', async () => {
    const fakePreviousFps = ['fp_btn_123', 'fp_img_456', 'fp_overflow_789'];
    const rescan = await runRescan(`${serverOrigin}/clean-page`, fakePreviousFps, {
      policy: testPolicy,
    });

    expect(rescan.verification.resolvedFingerprints).toEqual(fakePreviousFps);
    expect(rescan.verification.persistingFingerprints).toHaveLength(0);
    expect(rescan.verification.newFingerprints).toHaveLength(0);
  });
});

describe('Audit API Endpoints (/api/audit and /api/rescan)', () => {
  const app = createApp();

  it('POST /api/audit returns 400 when URL is missing', async () => {
    const res = await request(app).post('/api/audit').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('POST /api/audit blocks internal localhost in production', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'http://127.0.0.1:3001' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('POST /api/rescan returns 400 when URL is missing', async () => {
    const res = await request(app).post('/api/rescan').send({ previousFingerprints: ['abc'] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('POST /api/rescan blocks internal metadata URL in production', async () => {
    const res = await request(app)
      .post('/api/rescan')
      .send({ url: 'http://169.254.169.254/latest/meta-data/', previousFingerprints: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });
});

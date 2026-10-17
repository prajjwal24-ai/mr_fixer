import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { loadPageSecurely } from '../../src/scanner/pageLoader.js';
import { BrowserManager } from '../../src/scanner/browserManager.js';
import type { SecurityPolicy } from '../../src/security/urlValidator.js';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('PageLoader & BrowserManager Integration Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let serverOrigin: string;
  let testPolicy: SecurityPolicy;

  beforeAll(async () => {
    // Spin up an isolated mock HTTP server on an ephemeral port
    server = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/safe-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><head><title>Safe Fixture Page</title></head><body><h1>Audited Content</h1></body></html>');
        return;
      }

      if (url === '/redirect-to-metadata') {
        // Simulates an SSRF redirect to AWS/GCP cloud metadata
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
        res.end();
        return;
      }

      if (url === '/redirect-to-localhost') {
        // Simulates an SSRF redirect to internal localhost service
        res.writeHead(302, { Location: 'http://127.0.0.1:3001/internal' });
        res.end();
        return;
      }

      if (url === '/hang-forever') {
        // Never ends to test navigation timeout
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

  it('successfully loads a safe page and extracts metadata with context cleanup', async () => {
    const bm = BrowserManager.getInstance();
    expect(bm.getActiveContextCount()).toBe(0);

    const metadata = await loadPageSecurely(`${serverOrigin}/safe-page`, {
      policy: testPolicy,
      navigationTimeoutMs: 10000,
    });

    expect(metadata.httpStatus).toBe(200);
    expect(metadata.pageTitle).toBe('Safe Fixture Page');
    expect(metadata.loadTimeMs).toBeGreaterThan(0);
    expect(metadata.finalUrl).toBe(`${serverOrigin}/safe-page`);

    // Verify guaranteed context cleanup
    expect(bm.getActiveContextCount()).toBe(0);
  });

  it('aborts HTTP 302 redirects targeting cloud metadata (169.254.169.254)', async () => {
    const bm = BrowserManager.getInstance();

    await expect(
      loadPageSecurely(`${serverOrigin}/redirect-to-metadata`, {
        policy: testPolicy,
        navigationTimeoutMs: 5000,
      })
    ).rejects.toThrow();

    // Verify context was released even on security abort
    expect(bm.getActiveContextCount()).toBe(0);
  });

  it('aborts HTTP 302 redirects targeting internal localhost services', async () => {
    const bm = BrowserManager.getInstance();

    await expect(
      loadPageSecurely(`${serverOrigin}/redirect-to-localhost`, {
        policy: testPolicy,
        navigationTimeoutMs: 5000,
      })
    ).rejects.toThrow();

    expect(bm.getActiveContextCount()).toBe(0);
  });

  it('enforces navigation timeout and releases context', async () => {
    const bm = BrowserManager.getInstance();

    await expect(
      loadPageSecurely(`${serverOrigin}/hang-forever`, {
        policy: testPolicy,
        navigationTimeoutMs: 1000, // 1 second timeout
      })
    ).rejects.toThrow(/longer than 1 seconds|timed out/i);

    expect(bm.getActiveContextCount()).toBe(0);
  });

  it('enforces concurrency limit and returns 429 when max active scans exceeded', async () => {
    await BrowserManager.resetInstance();
    const bm = BrowserManager.getInstance(2); // Set max concurrency to 2 for test

    const lease1 = await bm.acquireContext();
    const lease2 = await bm.acquireContext();
    expect(bm.getActiveContextCount()).toBe(2);

    // 3rd attempt must throw 429
    await expect(bm.acquireContext()).rejects.toThrow(/Scanner busy/);

    // Clean up
    await lease1.release();
    await lease2.release();
    expect(bm.getActiveContextCount()).toBe(0);
  });

  it('successfully audits a public live website (https://example.com) with production policy', async () => {
    const metadata = await loadPageSecurely('https://example.com', {
      navigationTimeoutMs: 15000,
    });

    expect(metadata.httpStatus).toBe(200);
    expect(metadata.pageTitle).toMatch(/example domain/i);
    expect(metadata.security.isPublic).toBe(true);
    expect(metadata.security.protocol).toBe('https:');
    expect(metadata.loadTimeMs).toBeGreaterThan(0);
  }, 20000);
});

describe('POST /api/audit/validate (API Endpoint Tests)', () => {
  const app = createApp();

  it('rejects missing or empty URL with 400 INVALID_REQUEST', async () => {
    const res = await request(app).post('/api/audit/validate').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('rejects loopback address in production with 400 SECURITY_BLOCK', async () => {
    const res = await request(app)
      .post('/api/audit/validate')
      .send({ url: 'http://127.0.0.1:3001' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('rejects cloud metadata endpoint with 400 SECURITY_BLOCK', async () => {
    const res = await request(app)
      .post('/api/audit/validate')
      .send({ url: 'http://169.254.169.254/latest/meta-data/' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('rejects unsupported protocol with 400 UNSUPPORTED_PROTOCOL', async () => {
    const res = await request(app)
      .post('/api/audit/validate')
      .send({ url: 'file:///etc/passwd' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNSUPPORTED_PROTOCOL');
  });
});

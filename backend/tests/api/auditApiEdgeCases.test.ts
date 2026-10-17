/**
 * Audit API Edge Case Tests
 *
 * Tests API-level input validation, error shape conformance, and SSRF blocking.
 * These are fast supertest tests; they do NOT launch Playwright or scan real URLs.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('POST /api/audit — request validation and error shapes', () => {
  it('returns 400 with INVALID_REQUEST when body is completely empty', async () => {
    const res = await request(app).post('/api/audit').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('returns 400 with INVALID_REQUEST when url is an empty string', async () => {
    const res = await request(app).post('/api/audit').send({ url: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 with INVALID_REQUEST when url is not a string', async () => {
    const res = await request(app).post('/api/audit').send({ url: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 with SECURITY_BLOCK for loopback IP (127.0.0.1)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://127.0.0.1/admin' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('returns 400 with SECURITY_BLOCK for private network address (192.168.1.1)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://192.168.1.1/' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('returns 400 with SECURITY_BLOCK for cloud metadata endpoint (169.254.169.254)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://169.254.169.254/latest/meta-data/' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('returns 400 with SECURITY_BLOCK for 10.x.x.x private range', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://10.0.0.1/internal' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('returns 400 for file:// protocol', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'file:///etc/passwd' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    // Either UNSUPPORTED_PROTOCOL or INVALID_FORMAT depending on URL parsing
    expect(['UNSUPPORTED_PROTOCOL', 'INVALID_FORMAT', 'INVALID_REQUEST']).toContain(
      res.body.error.code
    );
  });

  it('returns 400 for javascript: protocol', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for a plainly malformed URL (no protocol)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'not-a-valid-url' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('error response always includes code and message fields', async () => {
    const res = await request(app).post('/api/audit').send({ url: 'http://127.0.0.1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
    });
  });
});

describe('POST /api/rescan — request validation', () => {
  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/rescan')
      .send({ previousFingerprints: ['abc123'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 with SECURITY_BLOCK for localhost rescan', async () => {
    const res = await request(app)
      .post('/api/rescan')
      .send({ url: 'http://localhost:9999', previousFingerprints: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('accepts empty previousFingerprints array and validates URL first', async () => {
    // Should fail on SSRF, not on missing previousFingerprints (which has a default)
    const res = await request(app)
      .post('/api/rescan')
      .send({ url: 'http://172.16.0.1/', previousFingerprints: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });

  it('accepts omitted previousFingerprints (optional field with default)', async () => {
    // Cloud metadata URL triggers SECURITY_BLOCK — validating optional field behaviour
    const res = await request(app)
      .post('/api/rescan')
      .send({ url: 'http://169.254.169.254/' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SECURITY_BLOCK');
  });
});

describe('GET /api/health', () => {
  it('returns 200 with status: ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('includes uptime and environment fields in non-production environments (config is a parse-once singleton)', async () => {
    // config.ts parses process.env once at module load time into a frozen object.
    // Mutating process.env.NODE_ENV after import does NOT affect config.NODE_ENV.
    // In the test runner (NODE_ENV = development or test), the health endpoint
    // correctly includes uptime and environment. In real production deployments,
    // setting NODE_ENV=production at startup suppresses these fields at server boot.
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    // In test environment, uptime and environment are present (correct behaviour)
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.environment).toBe('string');
  });
});

describe('404 handler', () => {
  it('returns 404 with NOT_FOUND code for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for unknown POST endpoint', async () => {
    const res = await request(app).post('/api/unknown-endpoint').send({});
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

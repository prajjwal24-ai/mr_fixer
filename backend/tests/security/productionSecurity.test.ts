import { describe, it, expect } from 'vitest';
import { validateUrl, PRODUCTION_SECURITY_POLICY } from '../../src/security/urlValidator.js';
import { validateHostDns } from '../../src/security/dnsValidator.js';

describe('Production Security Policy Verification (Zero-Bypass)', () => {
  it('strictly blocks direct localhost and loopback hostnames in production', () => {
    const urls = [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:8080/admin',
      'http://sub.localhost',
      'http://127.0.0.1',
      'http://127.0.0.1:3001',
      'http://127.0.1.1',
      'http://[::1]',
      'http://[::ffff:127.0.0.1]',
    ];

    for (const url of urls) {
      const res = validateUrl(url, PRODUCTION_SECURITY_POLICY);
      expect(res.valid, `Expected ${url} to be blocked`).toBe(false);
      expect(res.code).toBe('SECURITY_BLOCK');
    }
  });

  it('strictly blocks known public DNS wildcard aliases resolving to 127.0.0.1', () => {
    const aliases = [
      'http://localtest.me',
      'http://foo.localtest.me',
      'http://vcap.me',
      'http://lvh.me',
      'http://127.0.0.1.nip.io',
      'http://10.0.0.1.nip.io',
    ];

    for (const url of aliases) {
      const res = validateUrl(url, PRODUCTION_SECURITY_POLICY);
      expect(res.valid, `Expected ${url} to be blocked`).toBe(false);
      expect(res.code).toBe('SECURITY_BLOCK');
    }
  });

  it('strictly blocks private RFC 1918 IP addresses in production', () => {
    const privateUrls = [
      'http://10.0.0.1',
      'http://10.254.0.1/admin',
      'http://172.16.0.1',
      'http://172.31.255.255',
      'http://192.168.0.1',
      'http://192.168.1.100:8080',
    ];

    for (const url of privateUrls) {
      const res = validateUrl(url, PRODUCTION_SECURITY_POLICY);
      expect(res.valid, `Expected ${url} to be blocked`).toBe(false);
      expect(res.code).toBe('SECURITY_BLOCK');
    }
  });

  it('strictly blocks AWS/GCP/Azure Cloud Metadata (169.254.169.254)', () => {
    const metadataUrls = [
      'http://169.254.169.254/latest/meta-data/',
      'http://169.254.169.254/computeMetadata/v1/',
      'http://169.254.1.1',
    ];

    for (const url of metadataUrls) {
      const res = validateUrl(url, PRODUCTION_SECURITY_POLICY);
      expect(res.valid, `Expected ${url} to be blocked`).toBe(false);
      expect(res.code).toBe('SECURITY_BLOCK');
    }
  });

  it('DNS pre-flight validator rejects private addresses returned by DNS', async () => {
    // 127.0.0.1 passed directly as host
    const res = await validateHostDns('127.0.0.1', PRODUCTION_SECURITY_POLICY);
    expect(res.valid).toBe(false);
    expect(res.code).toBe('SECURITY_BLOCK');

    // 169.254.169.254 passed directly as host
    const resMeta = await validateHostDns('169.254.169.254', PRODUCTION_SECURITY_POLICY);
    expect(resMeta.valid).toBe(false);
    expect(resMeta.code).toBe('SECURITY_BLOCK');
  });
});

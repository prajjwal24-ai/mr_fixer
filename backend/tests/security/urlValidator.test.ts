import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIpv4, isPrivateOrReservedIpv6, isIpAddressBlocked } from '../../src/security/ipUtils.js';
import { validateUrl, PRODUCTION_SECURITY_POLICY } from '../../src/security/urlValidator.js';

describe('IP Utilities & CIDR Range Checks', () => {
  it('identifies loopback addresses as blocked', () => {
    expect(isPrivateOrReservedIpv4('127.0.0.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('127.0.0.2').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('127.255.255.255').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('::1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('0:0:0:0:0:0:0:1').blocked).toBe(true);
  });

  it('identifies RFC 1918 private subnets as blocked', () => {
    // 10.0.0.0/8
    expect(isPrivateOrReservedIpv4('10.0.0.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('10.254.1.9').blocked).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateOrReservedIpv4('172.16.0.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('172.31.255.254').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('172.32.0.1').blocked).toBe(false); // Outside 172.16.0.0/12

    // 192.168.0.0/16
    expect(isPrivateOrReservedIpv4('192.168.1.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('192.168.254.254').blocked).toBe(true);
  });

  it('identifies Cloud Metadata and Link-Local (169.254.0.0/16) as blocked', () => {
    expect(isPrivateOrReservedIpv4('169.254.169.254').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('169.254.1.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('fe80::1').blocked).toBe(true);
  });

  it('identifies Carrier-Grade NAT (100.64.0.0/10) as blocked', () => {
    expect(isPrivateOrReservedIpv4('100.64.0.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('100.127.255.255').blocked).toBe(true);
    expect(isPrivateOrReservedIpv4('100.128.0.1').blocked).toBe(false); // Outside range
  });

  it('identifies IPv4-mapped IPv6 loopback and private addresses as blocked', () => {
    expect(isPrivateOrReservedIpv6('::ffff:127.0.0.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('::ffff:192.168.1.1').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('::ffff:169.254.169.254').blocked).toBe(true);
    expect(isPrivateOrReservedIpv6('::ffff:93.184.216.34').blocked).toBe(false); // Public IPv4 mapped
  });

  it('identifies alternative representations (octal, hex, dword) normalized by WHATWG URL as blocked', () => {
    // In WHATWG URL parsing, these all resolve to 127.0.0.1
    expect(validateUrl('http://2130706433').code).toBe('SECURITY_BLOCK');
    expect(validateUrl('http://0177.0.0.1').code).toBe('SECURITY_BLOCK');
    expect(validateUrl('http://0x7f.0.0.1').code).toBe('SECURITY_BLOCK');
  });

  it('identifies valid public IPs as NOT blocked', () => {
    expect(isIpAddressBlocked('93.184.216.34').blocked).toBe(false); // example.com
    expect(isIpAddressBlocked('8.8.8.8').blocked).toBe(false); // Google DNS
    expect(isIpAddressBlocked('1.1.1.1').blocked).toBe(false); // Cloudflare
    expect(isIpAddressBlocked('2606:4700:4700::1111').blocked).toBe(false); // Cloudflare IPv6
  });
});

describe('URL Validator', () => {
  it('accepts valid HTTP and HTTPS public URLs', () => {
    const resHttps = validateUrl('https://example.com/test?query=1');
    expect(resHttps.valid).toBe(true);
    expect(resHttps.url?.protocol).toBe('https:');

    const resHttp = validateUrl('http://public-test-site.org/page');
    expect(resHttp.valid).toBe(true);
    expect(resHttp.url?.protocol).toBe('http:');
  });

  it('rejects malformed or empty URLs', () => {
    expect(validateUrl('').valid).toBe(false);
    expect(validateUrl('   ').valid).toBe(false);
    expect(validateUrl('not-a-url').valid).toBe(false);
    expect(validateUrl('http://').valid).toBe(false);
    expect(validateUrl('://missing-scheme').valid).toBe(false);
  });

  it('rejects unsupported protocols (file, ftp, javascript, data, etc.)', () => {
    expect(validateUrl('file:///etc/passwd').code).toBe('UNSUPPORTED_PROTOCOL');
    expect(validateUrl('ftp://files.example.com').code).toBe('UNSUPPORTED_PROTOCOL');
    expect(validateUrl('javascript:alert(1)').code).toBe('UNSUPPORTED_PROTOCOL');
    expect(validateUrl('data:text/html,<h1>test</h1>').code).toBe('UNSUPPORTED_PROTOCOL');
    expect(validateUrl('gopher://gopher.floodgap.com').code).toBe('UNSUPPORTED_PROTOCOL');
    expect(validateUrl('ws://example.com/socket').code).toBe('UNSUPPORTED_PROTOCOL');
  });

  it('rejects embedded credentials in URL', () => {
    const res = validateUrl('https://admin:secret123@example.com/admin');
    expect(res.valid).toBe(false);
    expect(res.code).toBe('EMBEDDED_CREDENTIALS');
  });

  it('supports explicit test-only allowedOrigins without weakening general policy', () => {
    const testOrigin = 'http://127.0.0.1:49999';
    const testPolicy = {
      allowLoopback: false,
      allowPrivateNetworks: false,
      allowedOrigins: [testOrigin],
    };

    // Allowed specific test origin passes
    const allowed = validateUrl('http://127.0.0.1:49999/fixture.html', testPolicy);
    expect(allowed.valid).toBe(true);

    // Other loopback origin remains strictly blocked
    const otherLoopback = validateUrl('http://127.0.0.1:3001/api/health', testPolicy);
    expect(otherLoopback.valid).toBe(false);
    expect(otherLoopback.code).toBe('SECURITY_BLOCK');
  });
});

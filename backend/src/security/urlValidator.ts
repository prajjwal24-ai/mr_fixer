import net from 'node:net';
import { isIpAddressBlocked } from './ipUtils.js';

export interface SecurityPolicy {
  allowLoopback: boolean;
  allowPrivateNetworks: boolean;
  allowedOrigins?: string[];
}

export const PRODUCTION_SECURITY_POLICY: SecurityPolicy = Object.freeze({
  allowLoopback: false,
  allowPrivateNetworks: false,
});

export interface UrlValidationResult {
  valid: boolean;
  url?: URL;
  normalizedUrl?: string;
  error?: string;
  code?: 'INVALID_FORMAT' | 'UNSUPPORTED_PROTOCOL' | 'EMBEDDED_CREDENTIALS' | 'SECURITY_BLOCK';
}

const LOCALHOST_DOMAIN_REGEX = /^(.*\.)?localhost$/i;
const LOCALHOST_ALIASES = [
  'localtest.me',
  'vcap.me',
  'lvh.me',
];

/**
 * Validates a URL string against security constraints and an injectable SecurityPolicy.
 */
export function validateUrl(
  rawUrl: string,
  policy: SecurityPolicy = PRODUCTION_SECURITY_POLICY
): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'URL must not be empty.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'Invalid URL format. Please provide a valid absolute URL (e.g., https://example.com).',
    };
  }

  // Check protocol: strictly http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      code: 'UNSUPPORTED_PROTOCOL',
      error: `Protocol "${parsed.protocol}" is not supported. Only "http:" and "https:" URLs are permitted.`,
    };
  }

  // Check for embedded credentials (user:password@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      code: 'EMBEDDED_CREDENTIALS',
      error: 'URLs containing embedded credentials (username/password) are not permitted.',
    };
  }

  // Check if this origin is explicitly whitelisted for controlled test fixtures
  if (policy.allowedOrigins && policy.allowedOrigins.includes(parsed.origin)) {
    return {
      valid: true,
      url: parsed,
      normalizedUrl: parsed.href,
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Check for localhost domains
  if (LOCALHOST_DOMAIN_REGEX.test(hostname)) {
    if (!policy.allowLoopback) {
      return {
        valid: false,
        code: 'SECURITY_BLOCK',
        error: 'Access to localhost and loopback domains is blocked for security.',
      };
    }
  }

  // Check for known public DNS wildcard aliases resolving to 127.0.0.1
  for (const alias of LOCALHOST_ALIASES) {
    if (hostname === alias || hostname.endsWith(`.${alias}`)) {
      if (!policy.allowLoopback) {
        return {
          valid: false,
          code: 'SECURITY_BLOCK',
          error: `Access to loopback alias "${hostname}" is blocked for security.`,
        };
      }
    }
  }

  // Check for nip.io pointing to private/loopback
  if (hostname.endsWith('.nip.io') || hostname.endsWith('.sslip.io')) {
    const ipPart = hostname.split('.').slice(0, 4).join('.');
    if (net.isIP(ipPart) && isIpAddressBlocked(ipPart).blocked && !policy.allowPrivateNetworks) {
      return {
        valid: false,
        code: 'SECURITY_BLOCK',
        error: `Access to DNS alias resolving to private address "${ipPart}" is blocked for security.`,
      };
    }
  }

  // If hostname is a direct IP address, validate it immediately
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    const ipCheck = isIpAddressBlocked(hostname);
    if (ipCheck.blocked) {
      if (!policy.allowPrivateNetworks && !policy.allowLoopback) {
        return {
          valid: false,
          code: 'SECURITY_BLOCK',
          error: `Access to ${ipCheck.reason} is blocked for security.`,
        };
      }
    }
  }

  return {
    valid: true,
    url: parsed,
    normalizedUrl: parsed.href,
  };
}

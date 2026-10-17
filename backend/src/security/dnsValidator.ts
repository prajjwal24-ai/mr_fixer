import dns from 'node:dns/promises';
import net from 'node:net';
import { isIpAddressBlocked } from './ipUtils.js';
import { type SecurityPolicy, PRODUCTION_SECURITY_POLICY } from './urlValidator.js';

export interface DnsValidationResult {
  valid: boolean;
  resolvedIps?: string[];
  error?: string;
  code?: 'SECURITY_BLOCK' | 'DNS_LOOKUP_FAILED';
}

/**
 * Resolves all IPv4 and IPv6 addresses for a hostname and validates them against the SecurityPolicy.
 */
export async function validateHostDns(
  hostname: string,
  policy: SecurityPolicy = PRODUCTION_SECURITY_POLICY
): Promise<DnsValidationResult> {
  const cleanHost = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // If already an IP address, we don't need DNS lookup
  if (net.isIP(cleanHost)) {
    const ipCheck = isIpAddressBlocked(cleanHost);
    if (ipCheck.blocked && !policy.allowLoopback && !policy.allowPrivateNetworks) {
      return {
        valid: false,
        code: 'SECURITY_BLOCK',
        error: `IP address "${cleanHost}" is blocked for security: ${ipCheck.reason}`,
      };
    }
    return {
      valid: true,
      resolvedIps: [cleanHost],
    };
  }

  try {
    // Lookup all addresses (both IPv4 and IPv6)
    const records = await dns.lookup(cleanHost, { all: true });

    if (!records || records.length === 0) {
      return {
        valid: false,
        code: 'DNS_LOOKUP_FAILED',
        error: `Could not resolve hostname "${cleanHost}". No DNS records found.`,
      };
    }

    const resolvedIps = records.map((r) => r.address);

    for (const record of records) {
      const ipCheck = isIpAddressBlocked(record.address);
      if (ipCheck.blocked) {
        if (!policy.allowLoopback && !policy.allowPrivateNetworks) {
          return {
            valid: false,
            code: 'SECURITY_BLOCK',
            error: `Hostname "${cleanHost}" resolves to a protected address (${record.address} - ${ipCheck.reason}).`,
          };
        }
      }
    }

    return {
      valid: true,
      resolvedIps,
    };
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOTFOUND' || nodeErr.code === 'EAI_AGAIN') {
      return {
        valid: false,
        code: 'DNS_LOOKUP_FAILED',
        error: `Unable to resolve host "${cleanHost}": Server name not found or unreachable.`,
      };
    }
    return {
      valid: false,
      code: 'DNS_LOOKUP_FAILED',
      error: `DNS resolution error for "${cleanHost}": ${nodeErr.message || String(err)}`,
    };
  }
}

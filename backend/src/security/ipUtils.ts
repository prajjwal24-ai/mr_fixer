import net from 'node:net';

export interface IpRange {
  name: string;
  cidr: string;
  matches: (ip: string) => boolean;
}

/**
 * Converts a dotted-decimal IPv4 string to an unsigned 32-bit integer.
 */
export function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if a given 32-bit unsigned integer falls inside an IPv4 subnet.
 */
export function isIpv4InCidr(ipNum: number, subnet: string, maskBits: number): boolean {
  const subnetNum = ipv4ToNumber(subnet);
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipNum & mask) === (subnetNum & mask);
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIpv4(ip: string): { blocked: boolean; reason?: string } {
  try {
    const ipNum = ipv4ToNumber(ip);

    // 0.0.0.0/8 - Current network ("this" host)
    if (isIpv4InCidr(ipNum, '0.0.0.0', 8)) {
      return { blocked: true, reason: 'Unspecified network (0.0.0.0/8)' };
    }

    // 127.0.0.0/8 - Loopback
    if (isIpv4InCidr(ipNum, '127.0.0.0', 8)) {
      return { blocked: true, reason: 'Loopback address (127.0.0.0/8)' };
    }

    // 10.0.0.0/8 - Private network (RFC 1918)
    if (isIpv4InCidr(ipNum, '10.0.0.0', 8)) {
      return { blocked: true, reason: 'Private network (10.0.0.0/8)' };
    }

    // 100.64.0.0/10 - Carrier-Grade NAT (RFC 6598)
    if (isIpv4InCidr(ipNum, '100.64.0.0', 10)) {
      return { blocked: true, reason: 'Carrier-grade NAT (100.64.0.0/10)' };
    }

    // 169.254.0.0/16 - Link-local / Cloud Metadata (RFC 3927)
    if (isIpv4InCidr(ipNum, '169.254.0.0', 16)) {
      return { blocked: true, reason: 'Link-local / Cloud Metadata (169.254.0.0/16)' };
    }

    // 172.16.0.0/12 - Private network (RFC 1918)
    if (isIpv4InCidr(ipNum, '172.16.0.0', 12)) {
      return { blocked: true, reason: 'Private network (172.16.0.0/12)' };
    }

    // 192.0.0.0/24, 192.0.2.0/24 - IETF Protocol / Documentation (RFC 5737)
    if (isIpv4InCidr(ipNum, '192.0.0.0', 24) || isIpv4InCidr(ipNum, '192.0.2.0', 24)) {
      return { blocked: true, reason: 'Documentation / Protocol network (192.0.0.0/24)' };
    }

    // 192.168.0.0/16 - Private network (RFC 1918)
    if (isIpv4InCidr(ipNum, '192.168.0.0', 16)) {
      return { blocked: true, reason: 'Private network (192.168.0.0/16)' };
    }

    // 198.18.0.0/15 - Benchmarking
    if (isIpv4InCidr(ipNum, '198.18.0.0', 15)) {
      return { blocked: true, reason: 'Benchmarking network (198.18.0.0/15)' };
    }

    // 198.51.100.0/24, 203.0.113.0/24 - Documentation (RFC 5737)
    if (isIpv4InCidr(ipNum, '198.51.100.0', 24) || isIpv4InCidr(ipNum, '203.0.113.0', 24)) {
      return { blocked: true, reason: 'Documentation network (RFC 5737)' };
    }

    // 224.0.0.0/4 - Multicast (RFC 5771)
    if (isIpv4InCidr(ipNum, '224.0.0.0', 4)) {
      return { blocked: true, reason: 'Multicast address (224.0.0.0/4)' };
    }

    // 240.0.0.0/4 - Reserved (RFC 1112)
    if (isIpv4InCidr(ipNum, '240.0.0.0', 4)) {
      return { blocked: true, reason: 'Reserved address (240.0.0.0/4)' };
    }

    return { blocked: false };
  } catch (err: unknown) {
    return { blocked: true, reason: `Malformed IPv4 address: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Checks if an IPv6 address is private, loopback, link-local, or an IPv4-mapped private address.
 */
export function isPrivateOrReservedIpv6(ip: string): { blocked: boolean; reason?: string } {
  const cleanIp = ip.toLowerCase().replace(/^\[|\]$/g, '');

  // ::1 / Loopback
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') {
    return { blocked: true, reason: 'IPv6 Loopback (::1)' };
  }

  // :: / Unspecified
  if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') {
    return { blocked: true, reason: 'IPv6 Unspecified (::)' };
  }

  // Check IPv4-mapped IPv6: e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1 (hex normalized by WHATWG URL)
  let embeddedIpv4: string | null = null;
  const dottedMatch = cleanIp.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dottedMatch) {
    embeddedIpv4 = dottedMatch[1];
  } else {
    const hexMatch = cleanIp.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (hexMatch) {
      const high = parseInt(hexMatch[1], 16);
      const low = parseInt(hexMatch[2], 16);
      embeddedIpv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    }
  }

  if (embeddedIpv4) {
    const check = isPrivateOrReservedIpv4(embeddedIpv4);
    if (check.blocked) {
      return { blocked: true, reason: `IPv4-mapped private address (${cleanIp} -> ${embeddedIpv4} - ${check.reason})` };
    }
  }

  // fe80::/10 - Link-local IPv6
  if (/^fe[89ab][0-9a-f]:/i.test(cleanIp) || cleanIp.startsWith('fe80:')) {
    return { blocked: true, reason: 'IPv6 Link-Local (fe80::/10)' };
  }

  // fc00::/7 - Unique Local Address (RFC 4193, private IPv6)
  if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) {
    return { blocked: true, reason: 'IPv6 Unique Local Address (fc00::/7)' };
  }

  // ff00::/8 - Multicast
  if (/^ff[0-9a-f]{2}:/i.test(cleanIp)) {
    return { blocked: true, reason: 'IPv6 Multicast (ff00::/8)' };
  }

  return { blocked: false };
}

/**
 * Validates any IP address (IPv4 or IPv6) against private, loopback, link-local, and reserved ranges.
 */
export function isIpAddressBlocked(ip: string): { blocked: boolean; reason?: string } {
  const version = net.isIP(ip.replace(/^\[|\]$/g, ''));
  if (version === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (version === 6) {
    return isPrivateOrReservedIpv6(ip);
  }
  return { blocked: false };
}

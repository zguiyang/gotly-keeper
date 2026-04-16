import 'server-only'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

type UrlSafetyCheckResult =
  | { safe: true }
  | { safe: false; reason: 'invalid_url' | 'unsupported_protocol' | 'private_network' }

function isPrivateIpv4Address(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false
  }

  if (parts[0] === 127 || parts[0] === 10) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

  return false
}

function isPrivateIpv6Address(ip: string): boolean {
  const lowered = ip.toLowerCase()

  if (lowered === '::1') return true
  if (lowered.startsWith('fc') || lowered.startsWith('fd')) return true
  if (lowered.startsWith('fe8') || lowered.startsWith('fe9') || lowered.startsWith('fea') || lowered.startsWith('feb')) {
    return true
  }

  return false
}

function isPrivateIpAddress(ip: string): boolean {
  const version = isIP(ip)

  if (version === 4) {
    return isPrivateIpv4Address(ip)
  }

  if (version === 6) {
    return isPrivateIpv6Address(ip)
  }

  return false
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
  if (isIP(hostname)) {
    return [hostname]
  }

  const records = await lookup(hostname, { all: true, verbatim: true })
  return records.map((record) => record.address)
}

export async function checkUrlSafety(urlText: string): Promise<UrlSafetyCheckResult> {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(urlText)
  } catch {
    return { safe: false, reason: 'invalid_url' }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { safe: false, reason: 'unsupported_protocol' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()
  if (hostname === 'localhost') {
    return { safe: false, reason: 'private_network' }
  }

  try {
    const addresses = await resolveHostAddresses(hostname)
    const hasPrivateAddress = addresses.some((address) => isPrivateIpAddress(address))
    if (hasPrivateAddress) {
      return { safe: false, reason: 'private_network' }
    }
  } catch {
    return { safe: false, reason: 'invalid_url' }
  }

  return { safe: true }
}


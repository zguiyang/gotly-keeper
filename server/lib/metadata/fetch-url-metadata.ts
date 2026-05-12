import 'server-only'

import { checkUrlSafety } from '@/server/lib/network/url-safety'

const FETCH_TIMEOUT_MS = 8_000
const MAX_HTML_BYTES = 256 * 1024
const MAX_REDIRECTS = 3

export type UrlMetadata = {
  finalUrl: string
  title: string | null
  description: string | null
  icon: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function matchFirstGroup(pattern: RegExp, text: string): string | null {
  const matched = pattern.exec(text)
  if (!matched || !matched[1]) {
    return null
  }

  return decodeHtmlEntities(matched[1].trim()) || null
}

function resolveUrl(baseUrl: string, maybeRelativeUrl: string | null): string | null {
  if (!maybeRelativeUrl) {
    return null
  }

  try {
    return new URL(maybeRelativeUrl, baseUrl).toString()
  } catch {
    return null
  }
}

function extractMetadata(url: string, html: string): Omit<UrlMetadata, 'finalUrl'> {
  const title =
    matchFirstGroup(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ??
    matchFirstGroup(/<title[^>]*>([\s\S]*?)<\/title>/i, html)
  const description =
    matchFirstGroup(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ??
    matchFirstGroup(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html)
  const iconHref = matchFirstGroup(
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    html
  )

  return {
    title,
    description,
    icon: resolveUrl(url, iconHref),
  }
}

async function readHtmlResponse(response: Response): Promise<string | null> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    return null
  }

  const contentLengthHeader = response.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    throw new Error('FETCH_TOO_LARGE')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > MAX_HTML_BYTES) {
      throw new Error('FETCH_TOO_LARGE')
    }
    return text
  }

  const decoder = new TextDecoder()
  let totalBytes = 0
  let html = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    totalBytes += value.byteLength
    if (totalBytes > MAX_HTML_BYTES) {
      await reader.cancel('FETCH_TOO_LARGE')
      throw new Error('FETCH_TOO_LARGE')
    }

    html += decoder.decode(value, { stream: true })
  }

  html += decoder.decode()
  return html
}

async function fetchMetadataResponse(url: string): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = url

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const safety = await checkUrlSafety(currentUrl)
    if (!safety.safe) {
      throw new Error(safety.reason === 'private_network' ? 'PRIVATE_URL_BLOCKED' : 'INVALID_URL')
    }

    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'gotly-keeper-bookmark-bot/1.0',
      },
    })

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl }
    }

    const location = response.headers.get('location')
    if (!location) {
      throw new Error('REDIRECT_LOCATION_MISSING')
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error('TOO_MANY_REDIRECTS')
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const { response, finalUrl } = await fetchMetadataResponse(url)

  if (!response.ok) {
    throw new Error(`FETCH_HTTP_${response.status}`)
  }

  const html = await readHtmlResponse(response)
  if (!html) {
    throw new Error('UNSUPPORTED_CONTENT_TYPE')
  }

  return {
    finalUrl,
    ...extractMetadata(finalUrl, html),
  }
}

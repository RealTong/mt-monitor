import type { TrafficTotals } from './types'

export const DEFAULT_MTEAM_API_BASE_URL = 'https://api.m-team.cc'
export const DEFAULT_MTEAM_API_BASE_URLS = [
  DEFAULT_MTEAM_API_BASE_URL,
  'https://api.m-team.io',
  'https://test2.m-team.cc',
]

interface MTeamConfig {
  apiBaseUrl?: string
  apiKey: string
  uid: string
}

function buildProfileUrl(apiBaseUrl: string, uid: string): URL {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '')
  const apiBase = normalizedBaseUrl.endsWith('/api')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`
  const url = new URL(`${apiBase}/member/profile`)

  url.searchParams.set('uid', uid)

  return url
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function readPath(source: unknown, path: string): number | null {
  let current = source

  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return readNumber(current)
}

export function extractTrafficTotals(payload: unknown): TrafficTotals {
  const uploadedPaths = [
    'data.memberCount.uploaded',
    'data.memberCount.upload',
    'data.uploaded',
    'data.upload',
  ]
  const downloadedPaths = [
    'data.memberCount.downloaded',
    'data.memberCount.download',
    'data.downloaded',
    'data.download',
  ]

  const uploaded = uploadedPaths
    .map((path) => readPath(payload, path))
    .find((value) => value !== null)
  const downloaded = downloadedPaths
    .map((path) => readPath(payload, path))
    .find((value) => value !== null)

  if (uploaded === undefined || downloaded === undefined) {
    throw new Error('Unable to locate uploaded/downloaded totals in M-Team response')
  }

  return {
    uploaded,
    downloaded,
  }
}

async function fetchMTeamTrafficFromUrl(
  url: URL,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<TrafficTotals> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    redirect: 'manual',
  })

  if (!response.ok) {
    const redirectLocation = response.headers.get('location')
    const responseText = (await response.text()).trim()
    const details = [redirectLocation ? `location=${redirectLocation}` : '', responseText.slice(0, 200)]
      .filter(Boolean)
      .join(' | ')

    throw new Error(
      `M-Team request failed with HTTP ${response.status}${details ? `: ${details}` : ''}`
    )
  }

  const payload = await response.json()
  const code = typeof payload?.code === 'string' ? Number(payload.code) : payload?.code
  const message = typeof payload?.message === 'string' ? payload.message : 'Unknown error'

  if (!(code === 0 || message.toUpperCase() === 'SUCCESS')) {
    throw new Error(`M-Team API error: ${message}`)
  }

  return extractTrafficTotals(payload)
}

export async function fetchMTeamTraffic(
  { apiBaseUrl, apiKey, uid }: MTeamConfig,
  fetchImpl: typeof fetch = fetch
): Promise<TrafficTotals> {
  const candidates = apiBaseUrl
    ? [apiBaseUrl, ...DEFAULT_MTEAM_API_BASE_URLS.filter((candidate) => candidate !== apiBaseUrl)]
    : DEFAULT_MTEAM_API_BASE_URLS
  const errors: string[] = []

  for (const candidate of candidates) {
    const url = buildProfileUrl(candidate, uid)

    try {
      return await fetchMTeamTrafficFromUrl(url, apiKey, fetchImpl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`${url.toString()} -> ${message}`)
    }
  }

  throw new Error(
    errors.length === 1
      ? errors[0]
      : `M-Team request failed across all endpoints: ${errors.join(' ; ')}`
  )
}

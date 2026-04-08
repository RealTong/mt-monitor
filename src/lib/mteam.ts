import type { TrafficTotals } from './types'

export const DEFAULT_MTEAM_API_BASE_URL = 'https://api.m-team.cc'

interface MTeamConfig {
  apiBaseUrl?: string
  apiKey: string
  authorization: string
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

export async function fetchMTeamTraffic(
  { apiBaseUrl = DEFAULT_MTEAM_API_BASE_URL, apiKey, authorization }: MTeamConfig,
  fetchImpl: typeof fetch = fetch
): Promise<TrafficTotals> {
  const url = new URL('/api/member/profile', apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`)

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`M-Team request failed with HTTP ${response.status}`)
  }

  const payload = await response.json()
  const code = typeof payload?.code === 'string' ? Number(payload.code) : payload?.code
  const message = typeof payload?.message === 'string' ? payload.message : 'Unknown error'

  if (!(code === 0 || message.toUpperCase() === 'SUCCESS')) {
    throw new Error(`M-Team API error: ${message}`)
  }

  return extractTrafficTotals(payload)
}

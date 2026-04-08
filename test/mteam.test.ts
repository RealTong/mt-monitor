import assert from 'node:assert/strict'
import test from 'node:test'

import { extractTrafficTotals, fetchMTeamTraffic } from '../src/lib/mteam'

test('extractTrafficTotals reads memberCount totals', () => {
  assert.deepEqual(
    extractTrafficTotals({
      code: 0,
      message: 'SUCCESS',
      data: {
        memberCount: {
          uploaded: '1099511627776',
          downloaded: 549755813888,
        },
      },
    }),
    {
      uploaded: 1099511627776,
      downloaded: 549755813888,
    }
  )
})

test('extractTrafficTotals falls back to direct totals', () => {
  assert.deepEqual(
    extractTrafficTotals({
      code: 0,
      message: 'SUCCESS',
      data: {
        uploaded: 123,
        downloaded: '456',
      },
    }),
    {
      uploaded: 123,
      downloaded: 456,
    }
  )
})

test('fetchMTeamTraffic requests the official profile endpoint', async () => {
  let requestedUrl = ''
  let requestHeaders: Headers | undefined

  const fetchImpl: typeof fetch = async (input, init) => {
    requestedUrl = String(input)
    requestHeaders = new Headers(init?.headers)

    return Response.json({
      code: 0,
      message: 'SUCCESS',
      data: {
        memberCount: {
          uploaded: 1,
          downloaded: 2,
        },
      },
    })
  }

  await fetchMTeamTraffic(
    {
      apiBaseUrl: 'https://api.m-team.cc',
      apiKey: 'test-api-key',
      uid: '384024',
    },
    fetchImpl
  )

  assert.equal(requestedUrl, 'https://api.m-team.cc/api/member/profile?uid=384024')
  assert.equal(requestHeaders?.get('x-api-key'), 'test-api-key')
})

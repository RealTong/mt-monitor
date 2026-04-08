import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractTrafficTotals,
  extractUidFromAuthorization,
  fetchMTeamTraffic,
} from '../src/lib/mteam'

const AUTH_TOKEN = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ uid: 384024, sub: 'example-user' })).toString('base64url'),
  'signature',
].join('.')

test('extractUidFromAuthorization decodes a raw jwt token', () => {
  assert.equal(extractUidFromAuthorization(AUTH_TOKEN), 384024)
})

test('extractUidFromAuthorization accepts a Bearer token', () => {
  assert.equal(extractUidFromAuthorization(`Bearer ${AUTH_TOKEN}`), 384024)
})

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

test('fetchMTeamTraffic preserves the /api path prefix', async () => {
  let requestedUrl = ''

  const fetchImpl: typeof fetch = async (input) => {
    requestedUrl = String(input)

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
      apiBaseUrl: 'https://test2.m-team.cc/api',
      apiKey: 'test-api-key',
      authorization: AUTH_TOKEN,
    },
    fetchImpl
  )

  assert.equal(requestedUrl, 'https://test2.m-team.cc/api/member/profile?uid=384024')
})

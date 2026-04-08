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
  let requestRedirect: RequestRedirect | undefined

  const fetchImpl: typeof fetch = async (input, init) => {
    requestedUrl = String(input)
    requestHeaders = new Headers(init?.headers)
    requestRedirect = init?.redirect

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
  assert.equal(requestRedirect, 'manual')
})

test('fetchMTeamTraffic falls back to alternate endpoints when the first host redirects away', async () => {
  const requestedUrls: string[] = []

  const totals = await fetchMTeamTraffic(
    {
      apiKey: 'test-api-key',
      uid: '384024',
    },
    async (input) => {
      const url = String(input)
      requestedUrls.push(url)

      if (url.startsWith('https://api.m-team.cc/')) {
        return new Response(null, {
          headers: {
            location: 'https://www.google.com/api/member/profile?uid=384024',
          },
          status: 302,
        })
      }

      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 3,
            downloaded: 4,
          },
        },
      })
    }
  )

  assert.deepEqual(totals, {
    uploaded: 3,
    downloaded: 4,
  })
  assert.deepEqual(requestedUrls, [
    'https://api.m-team.cc/api/member/profile?uid=384024',
    'https://api.m-team.io/api/member/profile?uid=384024',
  ])
})

test('fetchMTeamTraffic still falls back when a preferred base URL is provided', async () => {
  const requestedUrls: string[] = []

  const totals = await fetchMTeamTraffic(
    {
      apiBaseUrl: 'https://api.m-team.cc',
      apiKey: 'test-api-key',
      uid: '384024',
    },
    async (input) => {
      const url = String(input)
      requestedUrls.push(url)

      if (url.startsWith('https://api.m-team.cc/')) {
        return new Response(null, {
          headers: {
            location: 'https://www.google.com/api/member/profile?uid=384024',
          },
          status: 302,
        })
      }

      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 6,
            downloaded: 7,
          },
        },
      })
    }
  )

  assert.deepEqual(totals, {
    uploaded: 6,
    downloaded: 7,
  })
  assert.deepEqual(requestedUrls, [
    'https://api.m-team.cc/api/member/profile?uid=384024',
    'https://api.m-team.io/api/member/profile?uid=384024',
  ])
})

test('fetchMTeamTraffic includes the response body when M-Team returns an error', async () => {
  await assert.rejects(
    fetchMTeamTraffic(
      {
        apiBaseUrl: 'https://api.m-team.cc',
        apiKey: 'test-api-key',
        uid: '384024',
      },
      async () =>
        new Response('route not found', {
          status: 404,
        })
    ),
    /route not found/
  )
})

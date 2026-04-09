import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../src/index'
import { SNAPSHOT_KEY } from '../src/lib/report'
import type { Bindings, KVNamespaceLike } from '../src/lib/types'

class FakeKV implements KVNamespaceLike {
  private readonly store = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }
}

function createEnv(kv: FakeKV): Bindings {
  return {
    MT_MONITOR_KV: kv,
    MTEAM_API_KEY: 'test-api-key',
    MTEAM_UID: '384024',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
  }
}

function createExecutionContext() {
  return {
    passThroughOnException() {},
    props: {},
    waitUntil(_promise: Promise<unknown>) {},
  }
}

test('GET /run triggers a report when no manual token is configured', async () => {
  const kv = new FakeKV()
  const env = createEnv(kv)
  const originalFetch = globalThis.fetch
  const requests: Array<{ url: string; init?: RequestInit }> = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    requests.push({ url, init })

    if (url.includes('/member/profile')) {
      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 10 * 1024 ** 4,
            downloaded: 4 * 1024 ** 4,
            shareRate: '40.500',
          },
        },
      })
    }

    if (url.includes('/sendMessage')) {
      return Response.json({ ok: true, result: { message_id: 10 } })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }) as typeof fetch

  try {
    const response = await worker.fetch(
      new Request('https://mt-monitor.example/run'),
      env,
      createExecutionContext()
    )

    assert.equal(response.status, 200)
    assert.equal(requests.length, 2)

    const payload = (await response.json()) as { ok: boolean; mode: string }
    assert.equal(payload.ok, true)
    assert.equal(payload.mode, 'manual')

    const snapshot = JSON.parse((await kv.get(SNAPSHOT_KEY)) as string)
    assert.equal(snapshot.uploaded, 10 * 1024 ** 4)
    assert.equal(snapshot.downloaded, 4 * 1024 ** 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GET /run rejects requests with the wrong manual token', async () => {
  const kv = new FakeKV()
  const env = {
    ...createEnv(kv),
    MANUAL_RUN_TOKEN: 'expected-token',
  }
  const originalFetch = globalThis.fetch
  let called = false

  globalThis.fetch = (async () => {
    called = true
    return Response.json({})
  }) as typeof fetch

  try {
    const response = await worker.fetch(
      new Request('https://mt-monitor.example/run'),
      env,
      createExecutionContext()
    )

    assert.equal(response.status, 401)
    assert.equal(await response.text(), 'Unauthorized')
    assert.equal(called, false)
    assert.equal(await kv.get(SNAPSHOT_KEY), null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GET /run accepts the manual token in the query string', async () => {
  const kv = new FakeKV()
  const env = {
    ...createEnv(kv),
    MANUAL_RUN_TOKEN: 'expected-token',
  }
  const originalFetch = globalThis.fetch
  let telegramCalls = 0

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url.includes('/member/profile')) {
      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 11 * 1024 ** 4,
            downloaded: 5 * 1024 ** 4,
            shareRate: '41.250',
          },
        },
      })
    }

    if (url.includes('/sendMessage')) {
      telegramCalls += 1
      return Response.json({ ok: true, result: { message_id: 11 } })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }) as typeof fetch

  try {
    const response = await worker.fetch(
      new Request('https://mt-monitor.example/run?token=expected-token'),
      env,
      createExecutionContext()
    )

    assert.equal(response.status, 200)
    assert.equal(telegramCalls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

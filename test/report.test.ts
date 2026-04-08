import assert from 'node:assert/strict'
import test from 'node:test'

import { SNAPSHOT_KEY, runDailyReport } from '../src/lib/report'
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
    MTEAM_AUTHORIZATION: 'test-authorization',
    MTEAM_API_KEY: 'test-api-key',
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'test-chat-id',
  }
}

test('runDailyReport sends a baseline report on first run', async () => {
  const kv = new FakeKV()
  const env = createEnv(kv)
  const requests: Array<{ url: string; init?: RequestInit }> = []

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })

    if (url.includes('/member/profile')) {
      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 5 * 1024 ** 4,
            downloaded: 2 * 1024 ** 4,
          },
        },
      })
    }

    if (url.includes('/sendMessage')) {
      return Response.json({ ok: true, result: { message_id: 1 } })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  await runDailyReport(env, {
    fetchImpl,
    now: new Date('2026-04-08T01:05:00.000Z'),
  })

  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://api.m-team.cc/api/member/profile')
  assert.match(requests[1].url, /api\.telegram\.org/)

  const telegramBody = JSON.parse(String(requests[1].init?.body))
  assert.equal(telegramBody.chat_id, 'test-chat-id')
  assert.match(telegramBody.text, /Baseline saved/)

  const snapshot = JSON.parse((await kv.get(SNAPSHOT_KEY)) as string)
  assert.equal(snapshot.uploaded, 5 * 1024 ** 4)
  assert.equal(snapshot.downloaded, 2 * 1024 ** 4)
})

test('runDailyReport sends deltas when a previous snapshot exists', async () => {
  const kv = new FakeKV()
  const env = createEnv(kv)

  await kv.put(
    SNAPSHOT_KEY,
    JSON.stringify({
      recordedAt: '2026-04-07T01:05:00.000Z',
      uploaded: 5 * 1024 ** 4,
      downloaded: 2 * 1024 ** 4,
    })
  )

  const requests: Array<{ url: string; init?: RequestInit }> = []

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, init })

    if (url.includes('/member/profile')) {
      return Response.json({
        code: 0,
        message: 'SUCCESS',
        data: {
          memberCount: {
            uploaded: 5 * 1024 ** 4 + 20 * 1024 ** 3,
            downloaded: 2 * 1024 ** 4 + 3 * 1024 ** 3,
          },
        },
      })
    }

    if (url.includes('/sendMessage')) {
      return Response.json({ ok: true, result: { message_id: 2 } })
    }

    throw new Error(`Unexpected URL: ${url}`)
  }

  await runDailyReport(env, {
    fetchImpl,
    now: new Date('2026-04-08T01:05:00.000Z'),
  })

  const telegramBody = JSON.parse(String(requests[1].init?.body))
  assert.match(telegramBody.text, /\+20\.00 GiB/)
  assert.match(telegramBody.text, /\+3\.00 GiB/)

  const snapshot = JSON.parse((await kv.get(SNAPSHOT_KEY)) as string)
  assert.equal(snapshot.uploaded, 5 * 1024 ** 4 + 20 * 1024 ** 3)
  assert.equal(snapshot.downloaded, 2 * 1024 ** 4 + 3 * 1024 ** 3)
})

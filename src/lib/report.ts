import { buildTelegramMessage } from './format'
import { readMonitorConfig } from './env'
import { fetchMTeamTraffic } from './mteam'
import type { Bindings, TrafficSnapshot } from './types'

export const SNAPSHOT_KEY = 'mtm:snapshot'

interface RunDailyReportOptions {
  fetchImpl?: typeof fetch
  now?: Date
}

async function loadSnapshot(env: Bindings): Promise<TrafficSnapshot | null> {
  const raw = await env.MT_MONITOR_KV.get(SNAPSHOT_KEY)

  if (!raw) {
    return null
  }

  return JSON.parse(raw) as TrafficSnapshot
}

async function saveSnapshot(env: Bindings, snapshot: TrafficSnapshot): Promise<void> {
  await env.MT_MONITOR_KV.put(SNAPSHOT_KEY, JSON.stringify(snapshot))
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram request failed with HTTP ${response.status}`)
  }

  const payload = await response.json()

  if (!payload?.ok) {
    throw new Error(`Telegram API error: ${payload?.description ?? 'Unknown error'}`)
  }
}

export async function runDailyReport(
  env: Bindings,
  { fetchImpl = fetch, now = new Date() }: RunDailyReportOptions = {}
): Promise<void> {
  const config = readMonitorConfig(env)
  const previousSnapshot = await loadSnapshot(env)
  const totals = await fetchMTeamTraffic(
    {
      apiBaseUrl: config.mteamApiBaseUrl,
      apiKey: config.mteamApiKey,
      uid: config.mteamUid,
    },
    fetchImpl
  )

  const snapshot: TrafficSnapshot = {
    recordedAt: now.toISOString(),
    uploaded: totals.uploaded,
    downloaded: totals.downloaded,
    shareRate: totals.shareRate,
  }

  const message = buildTelegramMessage({
    snapshot,
    previousSnapshot,
  })

  await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, message, fetchImpl)
  await saveSnapshot(env, snapshot)
}

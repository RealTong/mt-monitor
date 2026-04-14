import { buildIntervalDeltaSeries, buildQuickChartUrl } from './chart'
import { buildTelegramMessage } from './format'
import { readMonitorConfig } from './env'
import { fetchMTeamTraffic } from './mteam'
import type { Bindings, TrafficSnapshot } from './types'

export const SNAPSHOT_KEY = 'mtm:snapshot'
export const HISTORY_KEY = 'mtm:history:v1'

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

async function loadHistory(env: Bindings): Promise<TrafficSnapshot[]> {
  const raw = await env.MT_MONITOR_KV.get(HISTORY_KEY)

  if (!raw) {
    return []
  }

  return JSON.parse(raw) as TrafficSnapshot[]
}

async function saveSnapshot(env: Bindings, snapshot: TrafficSnapshot): Promise<void> {
  await env.MT_MONITOR_KV.put(SNAPSHOT_KEY, JSON.stringify(snapshot))
}

async function saveHistory(env: Bindings, history: TrafficSnapshot[]): Promise<void> {
  await env.MT_MONITOR_KV.put(HISTORY_KEY, JSON.stringify(history))
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

async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoUrl: string,
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caption: '<b>7-Day 4-Hour Delta Chart</b>\n<code>Upload / Download in GiB</code>',
      chat_id: chatId,
      parse_mode: 'HTML',
      photo: photoUrl,
      show_caption_above_media: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram photo request failed with HTTP ${response.status}`)
  }

  const payload = await response.json()

  if (!payload?.ok) {
    throw new Error(`Telegram photo API error: ${payload?.description ?? 'Unknown error'}`)
  }
}

export async function runDailyReport(
  env: Bindings,
  { fetchImpl = fetch, now = new Date() }: RunDailyReportOptions = {}
): Promise<void> {
  const config = readMonitorConfig(env)
  const previousSnapshot = await loadSnapshot(env)
  const history = await loadHistory(env)
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
  const nextHistory = [...history, snapshot]
  const intervalDeltaSeries = buildIntervalDeltaSeries(nextHistory)

  if (intervalDeltaSeries.length > 0) {
    await sendTelegramPhoto(
      config.telegramBotToken,
      config.telegramChatId,
      buildQuickChartUrl(intervalDeltaSeries).toString(),
      fetchImpl
    )
  }

  await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, message, fetchImpl)
  await saveSnapshot(env, snapshot)
  await saveHistory(env, nextHistory)
}

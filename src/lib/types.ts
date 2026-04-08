export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export interface Bindings {
  MT_MONITOR_KV: KVNamespaceLike
  MTEAM_API_KEY: string
  MTEAM_UID: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
  MANUAL_RUN_TOKEN?: string
  MTEAM_API_BASE_URL?: string
}

export interface TrafficTotals {
  uploaded: number
  downloaded: number
}

export interface TrafficSnapshot extends TrafficTotals {
  recordedAt: string
}

export interface TelegramMessageInput {
  snapshot: TrafficSnapshot
  previousSnapshot: TrafficSnapshot | null
}

import type { Bindings } from './types'

export interface MonitorConfig {
  mteamApiKey: string
  mteamUid: string
  telegramBotToken: string
  telegramChatId: string
  mteamApiBaseUrl?: string
}

function getRequiredString(env: Bindings, key: keyof Bindings): string {
  const value = env[key]

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required binding: ${String(key)}`)
  }

  return value.trim()
}

export function readMonitorConfig(env: Bindings): MonitorConfig {
  return {
    mteamApiKey: getRequiredString(env, 'MTEAM_API_KEY'),
    mteamUid: getRequiredString(env, 'MTEAM_UID'),
    telegramBotToken: getRequiredString(env, 'TELEGRAM_BOT_TOKEN'),
    telegramChatId: getRequiredString(env, 'TELEGRAM_CHAT_ID'),
    mteamApiBaseUrl: env.MTEAM_API_BASE_URL?.trim() || undefined,
  }
}

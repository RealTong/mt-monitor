import type { Bindings } from './types'

export interface MonitorConfig {
  mteamAuthorization: string
  mteamApiKey: string
  telegramBotToken: string
  telegramChatId: string
  mteamApiBaseUrl?: string
  mteamUid?: number
}

function getRequiredString(env: Bindings, key: keyof Bindings): string {
  const value = env[key]

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required binding: ${String(key)}`)
  }

  return value.trim()
}

export function readMonitorConfig(env: Bindings): MonitorConfig {
  const uid = env.MTEAM_UID?.trim()

  return {
    mteamAuthorization: getRequiredString(env, 'MTEAM_AUTHORIZATION'),
    mteamApiKey: getRequiredString(env, 'MTEAM_API_KEY'),
    telegramBotToken: getRequiredString(env, 'TELEGRAM_BOT_TOKEN'),
    telegramChatId: getRequiredString(env, 'TELEGRAM_CHAT_ID'),
    mteamApiBaseUrl: env.MTEAM_API_BASE_URL?.trim() || undefined,
    mteamUid: uid ? Number(uid) : undefined,
  }
}

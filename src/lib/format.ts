import type { TelegramMessageInput } from './types'

const BYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const

export function formatBytes(bytes: number): string {
  const absolute = Math.abs(bytes)

  if (absolute < 1024) {
    return `${bytes} B`
  }

  let unitIndex = 0
  let value = absolute

  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(2)} ${BYTE_UNITS[unitIndex]}`
}

export function formatDelta(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  const sign = bytes > 0 ? '+' : '-'
  return `${sign}${formatBytes(Math.abs(bytes))}`
}

function formatRecordedAt(recordedAt: string): string {
  const date = new Date(recordedAt)
  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

export function buildTelegramMessage({
  snapshot,
  previousSnapshot,
}: TelegramMessageInput): string {
  const lines = [
    '<b>M-Team Daily Report</b>',
    `<pre>${formatRecordedAt(snapshot.recordedAt)}</pre>`,
    '',
    '<b>Totals</b>',
    `Upload    <code>${formatBytes(snapshot.uploaded)}</code>`,
    `Download  <code>${formatBytes(snapshot.downloaded)}</code>`,
    '',
    '<b>Today vs Yesterday</b>',
  ]

  if (!previousSnapshot) {
    lines.push('Baseline saved. Tomorrow the report will include deltas.')
    return lines.join('\n')
  }

  lines.push(
    `Upload    <code>${formatDelta(snapshot.uploaded - previousSnapshot.uploaded)}</code>`
  )
  lines.push(
    `Download  <code>${formatDelta(snapshot.downloaded - previousSnapshot.downloaded)}</code>`
  )

  return lines.join('\n')
}

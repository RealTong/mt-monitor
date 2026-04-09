import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTelegramMessage, formatBytes, formatDelta } from '../src/lib/format'

test('formatBytes renders binary units', () => {
  assert.equal(formatBytes(1536), '1.50 KiB')
  assert.equal(formatBytes(3 * 1024 ** 3), '3.00 GiB')
})

test('formatDelta preserves the sign and formatting', () => {
  assert.equal(formatDelta(2 * 1024 ** 3), '+2.00 GiB')
  assert.equal(formatDelta(-(512 * 1024 ** 2)), '-512.00 MiB')
  assert.equal(formatDelta(0), '0 B')
})

test('buildTelegramMessage renders a first-run baseline message', () => {
  const message = buildTelegramMessage({
    snapshot: {
      recordedAt: '2026-04-08T01:05:00.000Z',
      uploaded: 5 * 1024 ** 4,
      downloaded: 2 * 1024 ** 4,
      shareRate: 41.926,
    },
    previousSnapshot: null,
  })

  assert.match(message, /M-Team Traffic Report/)
  assert.match(message, /Baseline saved/)
  assert.match(message, /41\.926x/)
  assert.match(message, /5\.00 TiB/)
  assert.match(message, /2\.00 TiB/)
})

test('buildTelegramMessage renders deltas since the previous report', () => {
  const message = buildTelegramMessage({
    snapshot: {
      recordedAt: '2026-04-08T01:05:00.000Z',
      uploaded: 5 * 1024 ** 4 + 20 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 3 * 1024 ** 3,
      shareRate: 42.137,
    },
    previousSnapshot: {
      recordedAt: '2026-04-07T01:05:00.000Z',
      uploaded: 5 * 1024 ** 4,
      downloaded: 2 * 1024 ** 4,
      shareRate: 40.5,
    },
  })

  assert.match(message, /Share Rate/)
  assert.match(message, /42\.137x/)
  assert.match(message, /Since Last Report/)
  assert.match(message, /\+20\.00 GiB/)
  assert.match(message, /\+3\.00 GiB/)
})

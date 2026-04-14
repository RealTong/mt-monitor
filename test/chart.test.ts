import assert from 'node:assert/strict'
import test from 'node:test'

import { buildIntervalDeltaSeries, buildQuickChartUrl } from '../src/lib/chart'
import type { TrafficSnapshot } from '../src/lib/types'

test('buildIntervalDeltaSeries uses the latest snapshot from each 4-hour bucket', () => {
  const history: TrafficSnapshot[] = [
    {
      recordedAt: '2026-04-12T08:05:00.000Z',
      uploaded: 10 * 1024 ** 4,
      downloaded: 2 * 1024 ** 4,
      shareRate: 10,
    },
    {
      recordedAt: '2026-04-12T08:30:00.000Z',
      uploaded: 10 * 1024 ** 4 + 12 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 1 * 1024 ** 3,
      shareRate: 10.05,
    },
    {
      recordedAt: '2026-04-12T12:05:00.000Z',
      uploaded: 10 * 1024 ** 4 + 50 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 5 * 1024 ** 3,
      shareRate: 10.1,
    },
    {
      recordedAt: '2026-04-12T16:05:00.000Z',
      uploaded: 10 * 1024 ** 4 + 90 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 9 * 1024 ** 3,
      shareRate: 10.2,
    },
    {
      recordedAt: '2026-04-12T20:05:00.000Z',
      uploaded: 10 * 1024 ** 4 + 130 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 12 * 1024 ** 3,
      shareRate: 10.3,
    },
  ]

  assert.deepEqual(buildIntervalDeltaSeries(history), [
    {
      date: '04-12 12',
      downloadDeltaGiB: 4,
      uploadDeltaGiB: 38,
    },
    {
      date: '04-12 16',
      downloadDeltaGiB: 4,
      uploadDeltaGiB: 40,
    },
    {
      date: '04-12 20',
      downloadDeltaGiB: 3,
      uploadDeltaGiB: 40,
    },
  ])
})

test('buildQuickChartUrl creates a QuickChart 4-hour line chart URL for upload and download deltas', () => {
  const url = buildQuickChartUrl([
    {
      date: '04-12 12',
      uploadDeltaGiB: 32,
      downloadDeltaGiB: 4,
    },
    {
      date: '04-12 16',
      uploadDeltaGiB: 18,
      downloadDeltaGiB: 2,
    },
  ])

  assert.equal(url.origin, 'https://quickchart.io')
  assert.equal(url.pathname, '/chart')
  assert.equal(url.searchParams.get('version'), '4')
  assert.equal(url.searchParams.get('format'), 'png')

  const chartConfig = JSON.parse(url.searchParams.get('chart') ?? '{}') as {
    data: {
      datasets: Array<{ data: number[]; label: string }>
      labels: string[]
    }
  }

  assert.deepEqual(chartConfig.data.labels, ['04-12 12', '04-12 16'])
  assert.equal(chartConfig.data.datasets[0].label, 'Upload')
  assert.deepEqual(chartConfig.data.datasets[0].data, [32, 18])
  assert.equal(chartConfig.data.datasets[1].label, 'Download')
  assert.deepEqual(chartConfig.data.datasets[1].data, [4, 2])
})

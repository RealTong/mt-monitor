import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDailyDeltaSeries, buildQuickChartUrl } from '../src/lib/chart'
import type { TrafficSnapshot } from '../src/lib/types'

test('buildDailyDeltaSeries uses the latest snapshot from each day and returns the last 7 daily deltas', () => {
  const history: TrafficSnapshot[] = [
    {
      recordedAt: '2026-04-01T00:00:00.000Z',
      uploaded: 10 * 1024 ** 4,
      downloaded: 2 * 1024 ** 4,
      shareRate: 10,
    },
    {
      recordedAt: '2026-04-01T20:00:00.000Z',
      uploaded: 10 * 1024 ** 4 + 50 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 5 * 1024 ** 3,
      shareRate: 10.1,
    },
    {
      recordedAt: '2026-04-02T20:00:00.000Z',
      uploaded: 10 * 1024 ** 4 + 90 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 9 * 1024 ** 3,
      shareRate: 10.2,
    },
    {
      recordedAt: '2026-04-03T20:00:00.000Z',
      uploaded: 10 * 1024 ** 4 + 130 * 1024 ** 3,
      downloaded: 2 * 1024 ** 4 + 12 * 1024 ** 3,
      shareRate: 10.3,
    },
  ]

  assert.deepEqual(buildDailyDeltaSeries(history), [
    {
      date: '04-02',
      downloadDeltaGiB: 4,
      uploadDeltaGiB: 40,
    },
    {
      date: '04-03',
      downloadDeltaGiB: 3,
      uploadDeltaGiB: 40,
    },
  ])
})

test('buildQuickChartUrl creates a QuickChart line chart URL for upload and download deltas', () => {
  const url = buildQuickChartUrl([
    {
      date: '04-06',
      uploadDeltaGiB: 32,
      downloadDeltaGiB: 4,
    },
    {
      date: '04-07',
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

  assert.deepEqual(chartConfig.data.labels, ['04-06', '04-07'])
  assert.equal(chartConfig.data.datasets[0].label, 'Upload')
  assert.deepEqual(chartConfig.data.datasets[0].data, [32, 18])
  assert.equal(chartConfig.data.datasets[1].label, 'Download')
  assert.deepEqual(chartConfig.data.datasets[1].data, [4, 2])
})

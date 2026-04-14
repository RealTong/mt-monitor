import type { TrafficSnapshot } from './types'

const GIB = 1024 ** 3

export interface IntervalDeltaPoint {
  date: string
  uploadDeltaGiB: number
  downloadDeltaGiB: number
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function getBucketStart(recordedAt: string): number {
  const date = new Date(recordedAt)
  const bucketHour = date.getUTCHours() - (date.getUTCHours() % 4)

  date.setUTCMinutes(0, 0, 0)
  date.setUTCHours(bucketHour)

  return date.getTime()
}

function formatBucketLabel(bucketStart: number): string {
  return new Date(bucketStart).toISOString().slice(5, 13).replace('T', ' ')
}

export function buildIntervalDeltaSeries(history: TrafficSnapshot[]): IntervalDeltaPoint[] {
  const sorted = [...history].sort(
    (left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime()
  )
  const latestByBucket = new Map<number, TrafficSnapshot>()

  for (const snapshot of sorted) {
    latestByBucket.set(getBucketStart(snapshot.recordedAt), snapshot)
  }

  const bucketSnapshots = [...latestByBucket.entries()].sort(([left], [right]) => left - right)

  const deltas: IntervalDeltaPoint[] = []

  for (let index = 1; index < bucketSnapshots.length; index += 1) {
    const [, previous] = bucketSnapshots[index - 1]
    const [currentBucketStart, current] = bucketSnapshots[index]

    deltas.push({
      date: formatBucketLabel(currentBucketStart),
      uploadDeltaGiB: roundToTwo((current.uploaded - previous.uploaded) / GIB),
      downloadDeltaGiB: roundToTwo((current.downloaded - previous.downloaded) / GIB),
    })
  }

  return deltas.slice(-42)
}

export function buildQuickChartUrl(points: IntervalDeltaPoint[]): URL {
  const chart = {
    data: {
      datasets: [
        {
          backgroundColor: 'rgba(15, 118, 110, 0.14)',
          borderColor: '#0f766e',
          borderWidth: 3,
          data: points.map((point) => point.uploadDeltaGiB),
          fill: true,
          label: 'Upload',
          pointBackgroundColor: '#0f766e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointRadius: 2,
          tension: 0.35,
        },
        {
          backgroundColor: 'rgba(234, 88, 12, 0.12)',
          borderColor: '#ea580c',
          borderWidth: 3,
          data: points.map((point) => point.downloadDeltaGiB),
          fill: true,
          label: 'Download',
          pointBackgroundColor: '#ea580c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointRadius: 2,
          tension: 0.35,
        },
      ],
      labels: points.map((point) => point.date),
    },
    options: {
      layout: {
        padding: {
          bottom: 18,
          left: 20,
          right: 28,
          top: 24,
        },
      },
      plugins: {
        legend: {
          align: 'start',
          labels: {
            boxHeight: 8,
            boxWidth: 8,
            color: '#1f2937',
            usePointStyle: true,
          },
          position: 'top',
        },
        subtitle: {
          color: '#6b7280',
          display: true,
          padding: {
            bottom: 18,
          },
          text: '4-hour upload and download changes in GiB',
        },
        title: {
          color: '#111827',
          display: true,
          text: 'M-Team 7-Day 4-Hour Delta Trend',
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#6b7280',
            maxRotation: 0,
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
          },
          ticks: {
            color: '#6b7280',
          },
          title: {
            color: '#6b7280',
            display: true,
            text: 'GiB',
          },
        },
      },
    },
    type: 'line',
  }

  const url = new URL('https://quickchart.io/chart')
  url.searchParams.set('backgroundColor', '#f7f4ed')
  url.searchParams.set('devicePixelRatio', '2')
  url.searchParams.set('format', 'png')
  url.searchParams.set('height', '720')
  url.searchParams.set('version', '4')
  url.searchParams.set('width', '1280')
  url.searchParams.set('chart', JSON.stringify(chart))

  return url
}

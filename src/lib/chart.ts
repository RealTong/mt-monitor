import type { TrafficSnapshot } from './types'

const GIB = 1024 ** 3

export interface DailyDeltaPoint {
  date: string
  uploadDeltaGiB: number
  downloadDeltaGiB: number
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

function formatDayLabel(recordedAt: string): string {
  return new Date(recordedAt).toISOString().slice(5, 10)
}

export function buildDailyDeltaSeries(history: TrafficSnapshot[]): DailyDeltaPoint[] {
  const sorted = [...history].sort(
    (left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime()
  )
  const latestByDay = new Map<string, TrafficSnapshot>()

  for (const snapshot of sorted) {
    latestByDay.set(formatDayLabel(snapshot.recordedAt), snapshot)
  }

  const dailySnapshots = [...latestByDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, snapshot]) => snapshot)

  const deltas: DailyDeltaPoint[] = []

  for (let index = 1; index < dailySnapshots.length; index += 1) {
    const previous = dailySnapshots[index - 1]
    const current = dailySnapshots[index]

    deltas.push({
      date: formatDayLabel(current.recordedAt),
      uploadDeltaGiB: roundToTwo((current.uploaded - previous.uploaded) / GIB),
      downloadDeltaGiB: roundToTwo((current.downloaded - previous.downloaded) / GIB),
    })
  }

  return deltas.slice(-7)
}

export function buildQuickChartUrl(points: DailyDeltaPoint[]): URL {
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
          pointRadius: 4,
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
          pointRadius: 4,
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
          text: 'Daily upload and download changes in GiB',
        },
        title: {
          color: '#111827',
          display: true,
          text: 'M-Team 7-Day Delta Trend',
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#6b7280',
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

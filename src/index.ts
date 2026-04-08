import { Hono } from 'hono'

import { runDailyReport } from './lib/report'
import type { Bindings } from './lib/types'

interface ExecutionContextLike {
  passThroughOnException(): void
  props: unknown
  waitUntil(promise: Promise<unknown>): void
}

interface ScheduledControllerLike {
  scheduledTime?: number
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({
    name: 'mt-monitor',
    status: 'ok',
  })
})

app.get('/healthz', (c) => {
  return c.text('ok')
})

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContextLike) {
    return app.fetch(request, env, ctx)
  },
  scheduled(controller: ScheduledControllerLike, env: Bindings, ctx: ExecutionContextLike) {
    const now =
      typeof controller.scheduledTime === 'number'
        ? new Date(controller.scheduledTime)
        : new Date()

    ctx.waitUntil(runDailyReport(env, { now }))
  },
}

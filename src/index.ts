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

function getManualRunToken(env: Bindings): string | undefined {
  const token = env.MANUAL_RUN_TOKEN?.trim()

  return token ? token : undefined
}

app.get('/', (c) => {
  return c.json({
    name: 'mt-monitor',
    status: 'ok',
  })
})

app.get('/healthz', (c) => {
  return c.text('ok')
})

app.get('/run', async (c) => {
  const expectedToken = getManualRunToken(c.env)
  const providedToken = c.req.header('x-run-token') ?? c.req.query('token') ?? undefined

  if (expectedToken && providedToken !== expectedToken) {
    return c.text('Unauthorized', 401)
  }

  try {
    await runDailyReport(c.env)

    return c.json({
      mode: 'manual',
      ok: true,
      protected: Boolean(expectedToken),
      triggeredAt: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: 'manual',
        ok: false,
      },
      500
    )
  }
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

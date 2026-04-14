# mt-monitor

A lightweight Cloudflare Worker that checks your M-Team traffic every 4 hours, stores every snapshot in Cloudflare KV, and sends a formatted Telegram report plus a 7-day 4-hour delta chart to Telegram.

## What the report includes

- current uploaded total
- current downloaded total
- current share rate
- upload delta vs. previous report
- download delta vs. previous report
- a 7-day chart of 4-hour upload/download deltas

## Example report

```html
<b>M-Team Traffic Report</b>
<pre>2026-04-08 01:05:00 UTC</pre>

<b>Totals</b>
Upload    <code>5.02 TiB</code>
Download  <code>2.00 TiB</code>
Share Rate  <code>41.926x</code>

<b>Since Last Report</b>
Upload    <code>+20.00 GiB</code>
Download  <code>+3.00 GiB</code>
```

## How it works

1. A Cloudflare Cron Trigger runs the Worker every 4 hours.
2. The Worker calls the M-Team profile API.
3. The latest uploaded/downloaded totals are compared with the previous KV snapshot.
4. The current share rate is included in the Telegram message.
5. Every snapshot is appended to KV history.
6. A QuickChart image is generated for the latest 7 days of 4-hour deltas and sent to Telegram as a photo.

This keeps the Worker lightweight because the chart is rendered by QuickChart, not inside the Worker runtime.

## Project structure

- [src/index.ts](/Users/realtong/Developer/mt-monitor/src/index.ts): Worker entrypoint, HTTP health endpoints, scheduled handler
- [src/lib/chart.ts](/Users/realtong/Developer/mt-monitor/src/lib/chart.ts): 7-day 4-hour delta aggregation and QuickChart URL builder
- [src/lib/mteam.ts](/Users/realtong/Developer/mt-monitor/src/lib/mteam.ts): M-Team request and response parsing
- [src/lib/report.ts](/Users/realtong/Developer/mt-monitor/src/lib/report.ts): report workflow, KV history handling, Telegram send
- [src/lib/format.ts](/Users/realtong/Developer/mt-monitor/src/lib/format.ts): byte and message formatting

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the KV namespace

```bash
npx wrangler kv namespace create MT_MONITOR_KV
```

Copy the returned namespace ID into [wrangler.jsonc](/Users/realtong/Developer/mt-monitor/wrangler.jsonc) and replace the placeholder value.

### 3. Configure secrets

Use Wrangler secrets for all sensitive values:

```bash
npx wrangler secret put MTEAM_API_KEY
npx wrangler secret put MTEAM_UID
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Optional values:

- `MTEAM_API_BASE_URL`: preferred API host to try first
- `MANUAL_RUN_TOKEN`: shared secret for `GET /run`

For local development, copy [.dev.vars.example](/Users/realtong/Developer/mt-monitor/.dev.vars.example) to `.dev.vars` and fill in your own values. `.dev.vars` is ignored by git.

### 4. Run locally

```bash
npm run dev
```

Health checks:

- `GET /`
- `GET /healthz`
- `GET /run`

`GET /run` triggers the same workflow as the scheduled cron job.

Recommended protection:

```bash
npx wrangler secret put MANUAL_RUN_TOKEN
```

Then trigger it with either:

```bash
curl "https://<your-worker-domain>/run?token=<your-token>"
```

or:

```bash
curl -H "x-run-token: <your-token>" "https://<your-worker-domain>/run"
```

If `MANUAL_RUN_TOKEN` is not configured, `GET /run` is publicly accessible.

### 5. Deploy

```bash
npm run deploy
```

## Default schedule

[wrangler.jsonc](/Users/realtong/Developer/mt-monitor/wrangler.jsonc) ships with:

```txt
5 */4 * * *
```

Cloudflare cron expressions are UTC, so this runs at 00:05, 04:05, 08:05, 12:05, 16:05, and 20:05 in Asia/Shanghai.

## M-Team API base URL

The Worker tries these hosts in order:

- your configured `MTEAM_API_BASE_URL`, if present
- `https://api.m-team.cc`
- `https://api.m-team.io`
- `https://test2.m-team.cc`

The request path is:

- `POST /api/member/profile`

Authentication is sent through:

- `x-api-key: <your api key>`

The request also includes:

- `uid=<your uid>` as a query parameter

The Worker reads `data.memberCount.uploaded`, `data.memberCount.downloaded`, and `data.memberCount.shareRate` from the response.

## Chart rendering

The chart image is rendered by [QuickChart](https://quickchart.io/documentation/), then sent with Telegram `sendPhoto`.

The Worker does not generate PNG files locally, which keeps bundle size and runtime overhead low for Cloudflare Workers.

## Verification

```bash
npm test
npm run typecheck
```

## Security

- never commit `.dev.vars`
- never commit real tokens to `wrangler.jsonc`
- keep all M-Team and Telegram credentials in Wrangler secrets only

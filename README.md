# mt-monitor

A lightweight Cloudflare Worker that checks your M-Team traffic once per day, stores the latest snapshot in Cloudflare KV, and sends a formatted Telegram report with the daily upload/download deltas.

## What the report includes

- current uploaded total
- current downloaded total
- upload delta vs. yesterday
- download delta vs. yesterday

## Example report

```html
<b>M-Team Daily Report</b>
<pre>2026-04-08 01:05:00 UTC</pre>

<b>Totals</b>
Upload    <code>5.02 TiB</code>
Download  <code>2.00 TiB</code>

<b>Today vs Yesterday</b>
Upload    <code>+20.00 GiB</code>
Download  <code>+3.00 GiB</code>
```

## How it works

1. A Cloudflare Cron Trigger runs the Worker once per day.
2. The Worker calls the M-Team profile API.
3. The latest uploaded/downloaded totals are compared with the previous KV snapshot.
4. A Telegram message is sent.
5. The new snapshot replaces the old one in KV.

Only the latest snapshot is stored, so the project stays simple and cheap.

## Project structure

- [src/index.ts](/Users/realtong/Developer/mt-monitor/src/index.ts): Worker entrypoint, HTTP health endpoints, scheduled handler
- [src/lib/mteam.ts](/Users/realtong/Developer/mt-monitor/src/lib/mteam.ts): M-Team request and response parsing
- [src/lib/report.ts](/Users/realtong/Developer/mt-monitor/src/lib/report.ts): daily workflow, KV snapshot handling, Telegram send
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

`GET /run` triggers the same workflow as the daily cron job.

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
5 1 * * *
```

Cloudflare cron expressions are UTC, so this runs at 09:05 in Asia/Shanghai every day.

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

The Worker reads `data.memberCount.uploaded` and `data.memberCount.downloaded` from the response.

## Verification

```bash
npm test
npm run typecheck
```

## Security

- never commit `.dev.vars`
- never commit real tokens to `wrangler.jsonc`
- keep all M-Team and Telegram credentials in Wrangler secrets only

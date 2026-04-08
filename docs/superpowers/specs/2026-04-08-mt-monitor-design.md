# M-Team Daily Monitor Design

## Goal

Build a lightweight Cloudflare Worker that runs once per day, fetches the current M-Team uploaded/downloaded totals, compares them with the previous snapshot stored in Cloudflare KV, and sends a formatted Telegram report.

## Scope

- Use Cloudflare Cron Triggers for daily execution.
- Use Cloudflare KV for storing only the latest snapshot and latest report metadata.
- Send Telegram notifications with readable formatting and daily deltas.
- Keep all credentials out of source control and document secure setup.

## Architecture

- `scheduled()` triggers the daily workflow.
- `fetchMTeamProfile()` calls the M-Team API and extracts upload/download totals.
- `runDailyReport()` loads the previous snapshot from KV, computes deltas, formats a Telegram message, sends it, and persists the new snapshot.
- `fetch()` exposes a minimal health endpoint only.

## Data Model

KV key: `mtm:snapshot`

Stored value:

```json
{
  "recordedAt": "2026-04-08T05:30:00.000Z",
  "uploaded": 1234567890,
  "downloaded": 987654321
}
```

## Error Handling

- Reject missing required secrets early with explicit errors.
- Validate the M-Team response before reading stats.
- Only write the new snapshot after Telegram send succeeds.
- Surface first-run behavior clearly in the Telegram message.

## Security

- Secrets must be injected with Wrangler secrets, never committed.
- README must use placeholders only.
- `.dev.vars` stays ignored.

# M-Team Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Cloudflare Worker that stores the last M-Team traffic snapshot in KV and sends a daily Telegram delta report.

**Architecture:** Keep the Worker thin by moving parsing, formatting, and orchestration into small modules. Test pure logic with `node:test` and `tsx`, then verify the Worker compiles with `tsc`.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers, Cloudflare KV, Telegram Bot API, `node:test`, `tsx`

---

### Task 1: Add test tooling and red tests

**Files:**
- Modify: `package.json`
- Create: `src/lib/format.ts`
- Create: `src/lib/mteam.ts`
- Create: `test/format.test.ts`
- Create: `test/mteam.test.ts`

- [ ] Add `tsx` and TypeScript test scripts.
- [ ] Write failing tests for byte formatting, delta formatting, Telegram message layout, JWT uid parsing, and M-Team stat extraction.
- [ ] Run the targeted tests and confirm they fail for missing implementation.

### Task 2: Implement domain helpers

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/mteam.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/types.ts`

- [ ] Implement byte formatting and Telegram message rendering.
- [ ] Implement M-Team request construction, uid extraction, and response parsing.
- [ ] Implement environment validation helpers and shared types.
- [ ] Re-run the targeted tests and confirm they pass.

### Task 3: Implement the Worker workflow

**Files:**
- Create: `src/lib/report.ts`
- Modify: `src/index.ts`
- Create: `test/report.test.ts`

- [ ] Write failing tests for first-run and delta-run orchestration with a fake KV store and mocked fetch.
- [ ] Implement KV read/write, Telegram send, and scheduled workflow.
- [ ] Wire `fetch()` and `scheduled()` into the Worker entrypoint.
- [ ] Re-run tests and confirm the workflow passes.

### Task 4: Harden config and docs

**Files:**
- Modify: `README.md`
- Modify: `wrangler.jsonc`
- Create: `.dev.vars.example`

- [ ] Document KV binding, cron trigger, and Wrangler secrets setup.
- [ ] Keep repository-safe placeholders only.
- [ ] Re-read docs and config for accidental secret leakage.

### Task 5: Verify and publish

**Files:**
- Modify: repository root as needed

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Review `git diff` for secrets and unintended files.
- [ ] Commit the final safe state.
- [ ] Create a public GitHub repository and push with `gh`.

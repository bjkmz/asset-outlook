# Asset Outlook

Short description: local asset tracker with a Vite + React frontend and a Bun + Elysia API. This guide covers local setup only.

## Prerequisites

- Bun (installs dependencies and runs the API)
- Node 20+ (Vite tooling)
- Finnhub account for news (free key at https://finnhub.io)
- Firebase project for cloud sync (optional for local use)

## Installation

```bash
cd asset-
bun install
```

## Running the Project

Start both frontend and API:

```bash
bun run dev:all
```

Open the URL printed by Vite. API runs on `http://localhost:3000`. Vite proxies `/api` to the API during development.

Run parts separately:

```bash
bun run dev     # frontend only
bun run server  # API only
```

## Available Commands

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Frontend only |
| `bun run server` | API only on port 3000 |
| `bun run server:dev` | API with file watch |
| `bun run dev:all` | Frontend + API together |
| `bun run build` | Typecheck + production build |
| `bun run preview` | Preview production build |
| `bun run lint` | Run oxlint |

## Environment Variables

Copy the template and fill in keys:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `FINNHUB_API_KEY` | Yes, for news | Server-only secret for Finnhub news. Missing key returns 401 and news sections show a configure-key notice. Never use a `VITE_` prefix for this key. |
| `VITE_FIREBASE_API_KEY` | Only for cloud sync | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Only for cloud sync | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Only for cloud sync | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Only for cloud sync | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Only for cloud sync | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Only for cloud sync | Firebase app ID |

Without any `VITE_FIREBASE_*` vars, the app runs guest-only with `localStorage`. The account modal shows `Account unavailable` and sign in/up is blocked. Without `FINNHUB_API_KEY`, charts and search still work. Only news is disabled.

## Project Structure

```text
asset-/
  src/            # React frontend (pages, components, hooks, store, lib)
  src/hooks/      # useNews, usePrices, useResolvedAssets (React Query)
  server/         # Bun + Elysia API (index, tv, yahoo, news, db, cache)
  firestore.rules # Watchlist access control (owner-only)
  public/         # static assets
  data/           # local SQLite file, created at runtime, gitignored
```

## Development Notes

- Frontend expects the API at `/api`. Vite proxies `/api` to `http://localhost:3000` during development. Without `bun run server`, charts show a "start the backend" message and search reports unavailable.
- First search or price request triggers TradingView / Yahoo syncs, so it can take a few seconds.
- SQLite file is created at `data/cache.db` on first API run.
- Saved symbols persist in browser `localStorage` under `asset-outlook:interests` for guests. Signed-in users sync `users/{uid}/watchlists/default` in Firestore.
- News is live from Finnhub. Cache TTL is 90 minutes. Articles older than 30 days are filtered out. Each Finnhub call uses 1 initial attempt plus 3 retries with 2s delay. Total failure returns 502, shows an error state, and writes no cache. Client uses `retry:false` with 60-minute `staleTime`.

## Troubleshooting

- **News shows "Configure FINNHUB_API_KEY in .env file"**: key is missing or still a placeholder. Set a valid `FINNHUB_API_KEY` in `.env` and restart `bun run server`.
- **News shows "Unable to load news feed"**: Finnhub 5xx or rate limit persisted through retries. Check the API terminal for `[news:ticker]` or `[news:category]` logs, wait, and retry.
- **Charts show "No price data. Start the backend"**: API is not running. Run `bun run server` or `bun run dev:all`.
- **Search shows "Search is unavailable"**: API is down or a sync failed. Check the API terminal for errors and retry.
- **Port 3000 in use**: stop the other process using port 3000, then restart `bun run server`.
- **`bun install` fails**: confirm Bun is installed and retry. Delete `node_modules` and run `bun install` again if dependencies look stale.
- **Stale asset, price, or news data**: delete `data/cache.db` and restart the API to force a fresh sync.

# Asset Lookout

Short description: local asset tracker with a Vite + React frontend and a Bun + Elysia API. This guide covers local setup only.

## Prerequisites

- Bun (installs dependencies and runs the API)
- Node 20+ (Vite tooling)

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

None required. The current code does not read any environment variables.

## Project Structure

```text
asset-/
  src/        # React frontend (pages, components, hooks, store)
  server/     # Bun + Elysia API (index, tv, yahoo, db, cache)
  public/     # static assets
  data/       # local SQLite file, created at runtime, gitignored
```

## Development Notes

- Frontend expects the API at `/api`. Without `bun run server`, charts show a "start the backend" message and search reports unavailable.
- First search or price request triggers TradingView / Yahoo syncs, so it can take a few seconds.
- SQLite file is created at `data/cache.db` on first API run.
- Saved symbols persist in browser `localStorage` under `asset-lookout:interests`.
- News content is currently local mock data.

## Troubleshooting

- **Charts show "No price data. Start the backend"**: API is not running. Run `bun run server` or `bun run dev:all`.
- **Search shows "Search is unavailable"**: API is down or a sync failed. Check the API terminal for errors and retry.
- **Port 3000 in use**: stop the other process using port 3000, then restart `bun run server`.
- **`bun install` fails**: confirm Bun is installed and retry. Delete `node_modules` and run `bun install` again if dependencies look stale.
- **Stale asset or price data**: delete `data/cache.db` and restart the API to force a fresh sync.

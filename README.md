## Arkiv Infura Demo

Welcome to the Arkiv Infura demo project. This repository bundles a Bun-powered backend runing as a simple script or Hono web app with two frontend dashboards (React and vanilla JavaScript) to explore data collected from the Ethereum blockchain and stored in Arkiv.

The sections below explain how to install dependencies, run each part of the stack, and operate the ingestion utilities.

---

## Prerequisites

- [Bun](https://bun.sh/) v1.1+ (required for the backend, React app, and scripts)
- Optional: any static file server (for the vanilla demo) such as `bunx serve`, `python3 -m http.server`, or `npx serve`

Clone the repository and install dependencies per package as described below.

---

## Backend (`backend/`)

The backend provides a simple script, `feedData.ts`, which supports three main operations:
1. Collect real-time Ethereum block data
2. Backfill historical block data
3. Recompute missing aggregated statistics

Alternatively, the backend can be run as a Hono web application that exposes data collection and aggregation endpoints over HTTP, and also includes a standalone ingestion script.

### Setup

```bash
cd inf-demo/backend
bun install
```


### Running `feedData.ts` directly

You may run the backend's ingestion script, `feedData.ts`, without starting the HTTP server. This can be used to backfill historical block data, poll for fresh blocks in real time, or regenerate aggregate summaries.

From the backend directory:

```bash
# Backfill 1000 oldest blocks (insert into Arkiv)
bun feedData.ts --history 1000

# Poll for new Ethereum blocks every ~12s (run continuously)
bun feedData.ts --realTime

# Generate hourly and daily statistics for past week (default range)
bun feedData.ts --stats
```

You can combine these modes by running them sequentially. For custom aggregation timespans, modify the script, or use the provided options for specific workflows.

Command summary:

- `--history N` &nbsp;: Imports N historical Ethereum blocks before the oldest stored block in Arkiv.
- `--realTime` &nbsp;&nbsp;: Continuously polls for and stores the latest blocks as they appear on-chain.
- `--stats` &nbsp;&nbsp;&nbsp;&nbsp;: Calculates/recalculates hourly and daily aggregation statistics (default: last 7 days).

Logs will show progress and highlight any stored or aggregated data.

_Note: You do **not** need to run the Hono server to use `feedData.ts`. It operates independently and is well-suited for manual or cron-based batch ingestion tasks._




### Run the Hono API server

- Development hot-reload: `bun run dev` (defaults to `http://localhost:3001`)
- Production build: `bun run build` followed by `bun run start`

#### Triggering data tasks via cron or schedulers

Once the server is running, schedule HTTP GET requests to the endpoints:

- `GET /collectData` – pulls the latest Ethereum blocks, stores them in Arkiv, and backfills any gaps.
- `GET /aggregateData` – recalculates last-hour and last-day aggregates.

Example cron entry using `curl` (runs every 5 minutes):

```cron
*/5 * * * * curl -sf https://your-hosted-backend.example.com/collectData
0 * * * * curl -sf https://your-hosted-backend.example.com/aggregateData
```

Adjust the schedule and base URL to match your deployment environment.



## React Dashboard (`frontend/react-example/`)

This Vite-powered dashboard visualizes Arkiv data using React, React Query, Tailwind CSS, and shadcn/ui components.

```bash
cd inf-demo/frontend/react-example
bun install
bun run dev    # starts Vite dev server on http://localhost:5173 (by default)

# Optional commands
bun run build  # production build in dist/
bun run preview
```

The app is preconfigured to use the hosted Arkiv RPC endpoint defined in `src/features/arkiv-client/constants.ts`.

---

## Vanilla JS Dashboard (`frontend/vanilla-js-example/`)

The vanilla example is a static HTML/CSS/JS implementation that reads from the same Arkiv endpoint. Serve the directory with any static file server:

```bash
cd inf-demo/frontend/vanilla-js-example

# Example using Bun's built-in server
bunx serve .

# Or with Python
python3 -m http.server 8080
```

Open the served URL (for example, `http://localhost:8080`) and navigate between the pages in the `pages/` directory.

---

## Next Steps

- Backfill historical data with `bun feedData.ts --history …` before launching the dashboards.
- Schedule regular calls to `collectData` and `aggregateData` to keep Arkiv up to date.
- Deploy the frontend(s) to any static hosting provider once the backend endpoints are reachable.

Happy building!



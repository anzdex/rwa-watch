# RWA Watch — demo script (screen recording, ~90 seconds)

Record with a screen recorder (audio on, no AI-generated video). Keep the
dashboard in frame the whole time; narrate each step in one take if possible.

## Setup before recording

1. `npm install && npm start` — confirm http://localhost:3000 loads.
2. Start in **sample mode** (no key): the badge must read `SAMPLE DATA`.
3. Have a second terminal ready with the key set for the live switch:
   `CMC_API_KEY=<your key> npm start` on a different port, or restart the same
   server with the key in `.env` between takes. Never show the key on screen —
   type it off-camera / paste into `.env` before recording.

## Script (0:00–1:30)

| Time | Show | Say |
|---|---|---|
| 0:00–0:10 | Dashboard, sample badge | "RWA Watch — a dashboard for tokenized real world assets, built on the CoinMarketCap API, Data and Visualisation track." |
| 0:10–0:30 | Summary cards + table, filter by Commodities, search "gold" | "It shows price, 24-hour change, market cap and volume, filterable by asset type. This is sample data, clearly labelled." |
| 0:30–0:50 | Top-5 market-cap chart | "A simple chart of the biggest tokenized assets by market cap." |
| 0:50–1:10 | Reload with the key set; badge switches to LIVE | "With a free Startup-tier API key, the same table switches to live data — no fake prices." |
| 1:10–1:30 | Terminal: `curl /api/health` and `curl /api/rwa?limit=3` | "The server proxies three CMC endpoints — the RWA asset list, RWA quotes, and crypto quotes for the underlying token — and the key never reaches the browser." |

## After recording

- Upload the recording (max length per DoraHacks page; keep it under 3 minutes).
- Post on X with the submission link + video + `#BuildwithCMC`, from @irelandeth3282.
- Submit the build on DoraHacks with: public GitHub repo link, demo/deployed link
  or this recording, and the README's endpoint list.

# RWA Watch

**Track: Data and Visualisation — Build with CMC: API Hackathon (Plushie)**
**DoraHacks registration:** rajonjr / GitHub [@anzdex](https://github.com/anzdex) / X [@irelandeth3282](https://x.com/irelandeth3282)
**Submission deadline:** 10 December 2026, 07:00 WIB

A simple, working web dashboard for **tokenized Real World Assets (RWA)** — tokenized
gold, US Treasuries, equities, ETFs, currencies and real estate — with price, 24h change,
market cap and 24h volume, plus a market-cap bar chart and per-type filtering.

## What it does

- **Summary cards:** assets shown, total market cap, total 24h volume, top 24h gainer.
- **Table:** rank, asset, type, price (USD), 24h %, market cap, 24h volume — filterable
  by asset type and searchable by name/symbol.
- **Chart:** top-5 assets by market cap, drawn on canvas (no external chart library).
- **Honest data labelling:** a badge always says `LIVE — CoinMarketCap API` or
  `SAMPLE DATA`. Sample data is never presented as live prices.

## How to run

```bash
npm install   # zero dependencies — installs nothing, just verifies the manifest
npm start     # serves http://localhost:3000
```

Open http://localhost:3000. Without a key it runs in **sample mode** on the
labelled data in `sample-data/rwa-list-sample.json`.

### Live mode (real CoinMarketCap data)

1. Get a free key at https://coinmarketcap.com/api/ — Build with CMC participants
   are granted the free **Startup tier** after registering on DoraHacks.
2. Copy `.env.example` to `.env` and set `CMC_API_KEY=your_key_here`.
3. Restart with `npm start`. The badge switches to `LIVE`, and `/api/rwa` calls CMC.
4. Verify live mode:
   ```bash
   curl http://localhost:3000/api/health
   # {"ok":true,"mode":"live","hasKey":true,...}
   curl "http://localhost:3000/api/rwa?limit=5"
   # {"source":"live","data":[...real RWA assets...]}
   ```
   The key is only ever read server-side from the environment. It is never sent
   to the browser, never logged, and `.env` is gitignored — see `.env.example`.

## CoinMarketCap endpoints used (explicit)

| Endpoint | Used for |
|---|---|
| `GET /v5/real-world-assets/assets/list` | Main table — paginated RWA assets with tokenized aggregate quotes (`tokenized_market_cap`, `tokenized_volume_24h`, `price`, `percent_change_24h`). Params: `limit`, `sort=rwa_rank`, `asset_type`. |
| `GET /v5/real-world-assets/quotes/latest` | Detail quotes for one RWA asset (`GET /api/rwa/:rwaId/quotes` → `?rwa_id=`). |
| `GET /v1/cryptocurrency/quotes/latest` | Latest quotes for the underlying on-chain token (`GET /api/crypto-quotes?symbol=BTC`). |

A sanitized sample of the response shape is in
`sample-data/api-response-sample.json` (envelope, field names, no key, no account data).
The server also caches live responses for 60 seconds to keep CMC credit use low.

## What the API made possible / where it got in the way

**Made possible:** the new RWA endpoint family (launched July 2026) gives one
programmatic source for tokenized equities, commodities, currencies, government
securities, ETFs and real estate, with a stable `rwa_id` per asset and tokenized
aggregates — without it, this dashboard would need to scrape many issuers and
reconcile symbols by hand. The free Basic/Startup plan covers these core RWA
endpoints, so the project is genuinely usable on the free tier.

**Got in the way:** (1) the RWA endpoints are `v5` while the crypto quotes endpoint
is `v1`, so the two families need separate call shapes and field names
(`tokenized_market_cap` vs `market_cap`); (2) live data needs a key, so the demo
must work without one — hence the labelled sample fallback, which is a deliberate
design choice, not a shortcut; (3) category/quote refresh rates differ (listings
~15s, category stats 5–15 min), so the dashboard caches for 60s rather than
claiming tick-level freshness.

## Demo instructions

See [`DEMO.md`](DEMO.md) for the 90-second screen-recording script. In short:
record the sample-mode dashboard, then (with a key set) reload to show the badge
switching to LIVE and the same table with real data, and narrate the three
endpoints above.

## Project structure

```
server.js                  Node server + CMC proxy (zero deps, no build step)
public/index.html          Dashboard page
public/app.js              Table, filters, summary cards, canvas chart
public/styles.css          Styling
sample-data/rwa-list-sample.json      Labelled sample RWA list
sample-data/api-response-sample.json  Sanitised CMC response shape
test/smoke.test.js         npm test — health + sample-mode RWA endpoints
DEMO.md                    Screen-recording script
.env.example               Placeholder only — never put a real key here
```

## Submission checklist (what is still missing)

- [x] Registered on DoraHacks (Cortensor #5 also registered; this repo is for Build with CMC)
- [x] Public GitHub-ready repo (local only — **not pushed yet**; push to github.com/anzdex when ready)
- [ ] Demo video / screen recording (see `DEMO.md`) or a deployed link
- [ ] X post with the submission link + video + `#BuildwithCMC`
- [ ] Live API key in `.env` for the recorded demo (key stays local, never committed)
- [ ] Submit build on DoraHacks before 10 Dec 2026, 07:00 WIB

RWA Watch is original work for this hackathon. It is not affiliated with CoinMarketCap.

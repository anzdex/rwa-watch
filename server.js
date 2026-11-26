/**
 * RWA Watch — server proxy for the CoinMarketCap API.
 *
 * Track: Data and Visualisation — Build with CMC: API Hackathon (Plushie).
 *
 * Design decisions (for the judges):
 *  - The browser never sees the API key. Only this server calls CMC, using
 *    CMC_API_KEY from the environment. The key is never logged or returned.
 *  - Zero dependencies: plain Node.js (>=18, global fetch + http). No build step.
 *  - No key? The dashboard still runs on clearly-labelled SAMPLE data, so
 *    the demo is reviewable without a key. Live data is never faked.
 *  - A 60-second in-memory cache keeps CMC credit use low (1 call per
 *    refresh instead of 1 per visitor).
 *
 * CMC endpoints used (explicit):
 *  1. GET /v5/real-world-assets/assets/list
 *     Paginated RWA assets with tokenized aggregate quotes — the main table.
 *  2. GET /v5/real-world-assets/quotes/latest
 *     Latest tokenized quotes for one RWA asset (detail view).
 *  3. GET /v1/cryptocurrency/quotes/latest
 *     Latest quotes for the underlying on-chain token (crypto_id) of an RWA.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// ---- tiny .env loader (no dependency; .env is gitignored) -----------------
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);
const CMC_API_KEY = (process.env.CMC_API_KEY || '').trim();
const CMC_BASE = 'https://pro-api.coinmarketcap.com';
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // url -> { at, body }

const SAMPLE_PATH = path.join(__dirname, 'sample-data', 'rwa-list-sample.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function loadSample() {
  return JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));
}

/** Call CMC. Returns parsed JSON, or throws with a short, safe message. */
async function cmc(pathname, params) {
  if (!CMC_API_KEY) throw new Error('no_api_key');
  const url = new URL(CMC_BASE + pathname);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const cached = cache.get(url.toString());
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.body;

  const res = await fetch(url, {
    headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body && body.status && body.status.error_message) || `CMC HTTP ${res.status}`;
    throw new Error(msg);
  }
  cache.set(url.toString(), { at: Date.now(), body });
  return body;
}

/** Normalise one RWA asset (live CMC shape) to the shape the frontend uses. */
function normaliseRwa(a) {
  const q = a.quote && a.quote.USD ? a.quote.USD : {};
  return {
    rwa_id: a.rwa_id ?? a.id ?? null,
    name: a.name ?? 'Unknown asset',
    symbol: a.symbol ?? '',
    asset_type: a.asset_type ?? a.type ?? 'unknown',
    price: q.price ?? null,
    market_cap: q.tokenized_market_cap ?? q.market_cap ?? null,
    volume_24h: q.tokenized_volume_24h ?? q.volume_24h ?? null,
    percent_change_24h: q.percent_change_24h ?? null,
    issuer: a.issuer_name ?? a.issuer ?? null,
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const { pathname } = url;

    if (pathname === '/' || pathname === '/index.html') return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
    if (pathname === '/app.js' || pathname === '/styles.css') {
      return sendFile(res, path.join(PUBLIC_DIR, pathname.slice(1)));
    }

    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        mode: CMC_API_KEY ? 'live' : 'sample',
        hasKey: Boolean(CMC_API_KEY),
        timestamp: new Date().toISOString(),
      });
    }

    // GET /api/rwa?limit=20&asset_type=commodity
    // Primary endpoint: /v5/real-world-assets/assets/list
    if (pathname === '/api/rwa') {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 100);
      const assetType = url.searchParams.get('asset_type') || '';
      if (!CMC_API_KEY) {
        const sample = loadSample();
        let assets = sample.data;
        if (assetType) assets = assets.filter((a) => a.asset_type === assetType);
        return sendJson(res, 200, {
          source: 'sample',
          note: 'SAMPLE DATA — set CMC_API_KEY in .env for live CoinMarketCap data. Values are illustrative, not live prices.',
          data: assets.slice(0, limit),
          total: assets.length,
        });
      }
      try {
        const params = { limit, sort: 'rwa_rank', sort_dir: 'asc' };
        if (assetType) params.asset_type = assetType;
        const live = await cmc('/v5/real-world-assets/assets/list', params);
        const data = Array.isArray(live.data) ? live.data.map(normaliseRwa) : [];
        return sendJson(res, 200, { source: 'live', data, total: data.length });
      } catch (err) {
        // Live call failed (bad key, quota, network): say so, fall back to
        // labelled sample data instead of failing the whole dashboard.
        const sample = loadSample();
        return sendJson(res, 200, {
          source: 'sample',
          note: `Live CMC call failed (${err.message}). Showing SAMPLE DATA instead — check CMC_API_KEY.`,
          data: sample.data.slice(0, limit),
          total: sample.data.length,
        });
      }
    }

    // GET /api/rwa/:rwaId/quotes — /v5/real-world-assets/quotes/latest
    const quoteMatch = pathname.match(/^\/api\/rwa\/([^/]+)\/quotes$/);
    if (quoteMatch) {
      const rwaId = decodeURIComponent(quoteMatch[1]);
      if (!CMC_API_KEY) {
        return sendJson(res, 200, { source: 'sample', rwa_id: rwaId, note: 'Set CMC_API_KEY for live quotes.', data: null });
      }
      try {
        const live = await cmc('/v5/real-world-assets/quotes/latest', { rwa_id: rwaId });
        return sendJson(res, 200, { source: 'live', rwa_id: rwaId, data: live.data || null });
      } catch (err) {
        return sendJson(res, 502, { source: 'live', error: err.message });
      }
    }

    // GET /api/crypto-quotes?symbol=BTC,ETH — /v1/cryptocurrency/quotes/latest
    // Used for the underlying on-chain token behind an RWA asset.
    if (pathname === '/api/crypto-quotes') {
      const symbol = url.searchParams.get('symbol') || '';
      if (!symbol) return sendJson(res, 400, { error: 'symbol query param is required, e.g. ?symbol=BTC' });
      if (!CMC_API_KEY) {
        return sendJson(res, 200, { source: 'sample', symbol, note: 'Set CMC_API_KEY for live quotes.', data: null });
      }
      try {
        const live = await cmc('/v1/cryptocurrency/quotes/latest', { symbol });
        return sendJson(res, 200, { source: 'live', symbol, data: live.data || null });
      } catch (err) {
        return sendJson(res, 502, { source: 'live', error: err.message });
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('Server error:', err.message);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`RWA Watch running at http://localhost:${PORT}`);
  console.log(`Mode: ${CMC_API_KEY ? 'LIVE (CMC API key set)' : 'SAMPLE (no CMC_API_KEY — set it in .env for live data)'}`);
});

module.exports = server;

'use strict';

// RWA Watch frontend. Fetches only from our own server proxy (/api/rwa);
// the CoinMarketCap API key never reaches the browser.
const $ = (id) => document.getElementById(id);
const fmtUsd = (n) => (n === null || n === undefined ? '–' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
const fmtMoney = (n) => (n === null || n === undefined ? '–' : '$' + Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n));

let allAssets = [];

function drawChart(assets) {
  const canvas = $('chart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const top = [...assets].sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)).slice(0, 5);
  if (!top.length) { ctx.fillText('No data to chart.', 16, 30); return; }
  const max = Math.max(...top.map((a) => a.market_cap || 0), 1);
  top.forEach((a, i) => {
    const y = 30 + i * 38;
    const w = ((a.market_cap || 0) / max) * 480;
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(150, y, w, 22);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText(a.name.length > 22 ? a.name.slice(0, 22) + '…' : a.name, 8, y + 16);
    ctx.fillText(fmtMoney(a.market_cap), 160 + w + 8, y + 16);
  });
}

function render() {
  const type = $('type-filter').value;
  const q = $('search').value.trim().toLowerCase();
  const rows = allAssets.filter((a) =>
    (!type || a.asset_type === type) &&
    (!q || a.name.toLowerCase().includes(q) || (a.symbol || '').toLowerCase().includes(q)));
  const tbody = $('tbody');
  tbody.innerHTML = rows.length ? rows.map((a, i) => {
    const pct = a.percent_change_24h;
    const cls = pct === null || pct === undefined ? '' : (pct >= 0 ? 'pos' : 'neg');
    const pctTxt = pct === null || pct === undefined ? '–' : (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    return `<tr><td>${i + 1}</td><td><strong>${a.name}</strong> <span>${a.symbol || ''}</span></td>` +
      `<td>${a.asset_type.replaceAll('_', ' ')}</td><td class="num">${fmtUsd(a.price)}</td>` +
      `<td class="num ${cls}">${pctTxt}</td><td class="num">${fmtMoney(a.market_cap)}</td>` +
      `<td class="num">${fmtMoney(a.volume_24h)}</td></tr>`;
  }).join('') : '<tr><td colspan="7">No assets match this filter.</td></tr>';

  $('count').textContent = rows.length;
  $('total-mcap').textContent = fmtMoney(rows.reduce((s, a) => s + (a.market_cap || 0), 0));
  $('total-vol').textContent = fmtMoney(rows.reduce((s, a) => s + (a.volume_24h || 0), 0));
  const gainer = [...rows].sort((a, b) => (b.percent_change_24h || 0) - (a.percent_change_24h || 0))[0];
  $('top-gainer').textContent = gainer ? `${gainer.name} (${gainer.percent_change_24h >= 0 ? '+' : ''}${(gainer.percent_change_24h || 0).toFixed(2)}%)` : '–';
  drawChart(rows);
}

async function load() {
  const badge = $('source-badge');
  try {
    const res = await fetch('/api/rwa?limit=50');
    const json = await res.json();
    allAssets = json.data || [];
    const live = json.source === 'live';
    badge.textContent = live ? '● LIVE — CoinMarketCap API' : '● SAMPLE DATA — set CMC_API_KEY for live data';
    badge.className = 'badge ' + (live ? 'live' : 'sample');
    const note = $('note');
    if (json.note) { note.textContent = json.note; note.hidden = false; } else { note.hidden = true; }
    $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
    render();
  } catch (err) {
    badge.textContent = 'Could not load data';
    $('tbody').innerHTML = '<tr><td colspan="7">Could not reach the server. Is it running on port 3000?</td></tr>';
  }
}

$('type-filter').addEventListener('change', render);
$('search').addEventListener('input', render);
$('refresh').addEventListener('click', load);
load();

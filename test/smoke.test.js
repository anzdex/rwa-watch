'use strict';
// Smoke test: starts the server on a test port with no API key and checks
// that health + RWA endpoints answer in SAMPLE mode. Run: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('server serves sample RWA data without an API key', async () => {
  // Empty string (not delete): server.js loads .env only for keys absent
  // from process.env, so '' keeps it in sample mode even with a real .env.
  process.env.CMC_API_KEY = '';
  process.env.PORT = '3456';
  const server = require('../server.js');
  // server.js starts listening on require; give it a moment.
  await new Promise((r) => setTimeout(r, 300));
  try {
    const health = await (await fetch('http://localhost:3456/api/health')).json();
    assert.equal(health.mode, 'sample');
    assert.equal(health.hasKey, false);
    const rwa = await (await fetch('http://localhost:3456/api/rwa?limit=5')).json();
    assert.equal(rwa.source, 'sample');
    assert.ok(Array.isArray(rwa.data) && rwa.data.length > 0);
    assert.ok(rwa.data[0].name && rwa.data[0].market_cap !== undefined);
  } finally {
    server.close();
  }
});

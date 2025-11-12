#!/usr/bin/env node
// Simple smoke tests for deployed BOMBA app.
// Usage: node scripts/smoke_tests.js --url=https://your-domain.com

const urlArg = process.argv.find(a => a.startsWith('--url='));
const BASE = urlArg ? urlArg.split('=')[1] : (process.env.BASE_URL || 'http://localhost:3000');

const endpoints = [
  '/api/produits',
  '/api/admin/statistiques',
  '/api/admin/commandes/non-vues/count'
];

async function run() {
  console.log(`Running smoke tests against ${BASE}`);
  let failed = 0;
  for (const ep of endpoints) {
    const url = `${BASE.replace(/\/$/, '')}${ep}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      console.log(`${ep} -> ${res.status}`);
      if (!res.ok && res.status !== 304) {
        console.error(`  ERROR: ${ep} returned status ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`${ep} -> ERROR:`, err.message || err);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`Smoke tests finished: ${failed} failed`);
    process.exit(2);
  }
  console.log('Smoke tests finished: all OK');
}

run();

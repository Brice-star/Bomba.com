#!/usr/bin/env node
// Small standalone health check to run in CI or Railway before promoting deploy
// Use global fetch (Node 18+)

const url = process.env.HEALTH_URL || `http://localhost:${process.env.PORT || 3000}/health`;

(async () => {
  try {
    const res = await fetch(url);
    const txt = await res.text();
    console.log('Health check status:', res.status);
    console.log(txt);
    process.exit(res.ok ? 0 : 1);
  } catch (err) {
    console.error('Health check failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();

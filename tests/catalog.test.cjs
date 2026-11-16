'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'trends.js'), 'utf8'), sandbox);
const catalog = sandbox.window.YEARCORE_TRENDS;
const categories = ['devices','apps','games','sites','cinema','music','tv','politics','events','fashion','memes'];
assert(Array.isArray(catalog), 'catalog must be an array');
assert(catalog.length >= 360, 'catalog must include at least 360 items');
const ids = new Set();
for (const item of catalog) {
  assert(!ids.has(item.id), `duplicate ID: ${item.id}`);
  ids.add(item.id);
  assert(Number.isInteger(item.year) && item.year >= 1990 && item.year <= 2025, item.id);
  assert(categories.includes(item.category), item.id);
  assert(item.title && item.title.trim().length > 1, item.id);
}
for (let year = 1990; year <= 2025; year++) {
  const entries = catalog.filter(item => item.year === year);
  assert(entries.length >= 10, `${year} has fewer than 10 cards`);
  for (const category of ['devices','games','cinema','music','politics','events','fashion']) {
    assert(entries.some(item => item.category === category), `${year} missing ${category}`);
  }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.indexOf('src="trends.js"') < html.indexOf('src="script.js"'), 'catalog must load before app');
assert(!html.includes('id="yearSelect"'), 'Other year field must be absent');
assert(html.includes('id="mobileDock"'), 'mobile navigation should be present');
console.log(`OK: ${catalog.length} curated trends, 36 years, >=10 per year, all key categories.`);

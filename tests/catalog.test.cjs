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

// Historic-era placement and user-requested 2006 replacements.
for (const removed of ['Первый прототип World Wide Web', 'Публичное открытие WWW',
                       'Победа ХАМАС на выборах в Палестине', 'Google Docs (ранняя версия)']) {
  assert(!catalog.some(item => item.title === removed), `Removed entry persists: ${removed}`);
}
for (const [year, title] of [
  [1990, 'BBS и Фидонет — сетевые сообщества'],
  [1991, 'Эпоха Web 1.0'],
  [2004, 'Эпоха Web 2.0'],
  [2006, 'Саммит G8 в Санкт-Петербурге'],
  [2006, 'Opera 9 — браузер с BitTorrent']
]) {
  assert(catalog.some(item => item.year === year && item.title === title), `Missing ${year}: ${title}`);
}

    
// Image-query and catalog regression checks for specific user-reported cards.
for (const [year, title, queryPart] of [
  [1998, 'Запуск Google', 'Google'],
  [1998, '«Суперкрошки»', 'Powerpuff'],
  [1998, 'Sega Dreamcast в Японии', 'Dreamcast'],
  [1998, 'Минимализм конца 90-х', '1990s in fashion'],
  [1997, 'Появление DVD на массовом рынке', 'DVD logo'],
  [1993, 'Первый Intel Pentium', 'Pentium'],
  [2000, 'Macromedia Flash Player и веб-анимации', 'Adobe Flash'],
  [2000, 'Newgrounds и Flash Portal', 'Newgrounds'],
  [2002, 'Расцвет J2ME Java-игр на телефонах', 'Micro Edition'],
  [2004, 'Расцвет браузерных Flash-игр', 'Flash game']
]) {
  const item = catalog.find(entry => entry.year === year && entry.title === title);
  assert(item, `Missing catalog entry: ${year} ${title}`);
  assert(String(item.imageQuery || '').includes(queryPart), `Unexpected imageQuery for ${title}: ${item?.imageQuery}`);
}
assert(!catalog.some(item => item.title === 'Java представлена публике'), 'Old Java entry should be removed');


const powerpuff = catalog.find(item => item.year === 1998 && item.title === '«Суперкрошки»');
assert(powerpuff, '1998 Powerpuff Girls catalog card missing');
assert(powerpuff.src.startsWith('https://upload.wikimedia.org/wikipedia/commons/'),
  'Powerpuff Girls should use an explicit Wikimedia image rather than a search placeholder');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
assert(!script.includes('trend-visual-badge">Фото'), 'Visible ФОТО placeholder must not exist');
assert(!script.includes("paintText(ctx,'PHOTO'"), 'PNG export must not draw PHOTO placeholder');

const youtube2005 = catalog.find(item => item.year === 2005 && item.title === 'Запуск YouTube');
assert(youtube2005, '2005 YouTube launch entry missing');
assert(youtube2005.src === 'assets/2005-youtube-homepage.jpg', 'YouTube 2005 must use the pinned historical screenshot');
console.log(`OK: ${catalog.length} curated trends, 36 years, >=10 per year, all key categories.`);

# Changelog

All notable changes to YEARCORE are documented here.

## [0.2.6] — 2026-11-16

### Historic screenshot correction
- Pinned an actual 2005 YouTube homepage screenshot (red “Tube” logo, old search and tag-cloud layout) for the "Запуск YouTube" card.
- Stored the JPEG in the repo under `assets/2005-youtube-homepage.jpg` to avoid unreliable Wikipedia image search and hotlinking.
- Added an explicit catalog regression check and documented the archival source and asset rights.

## [0.2.5] — 2026-11-16

### Image loading
- Pinned the original 1998 Powerpuff Girls logo from Wikimedia Commons rather than relying on Wikipedia thumbnail search.
- Removed the gray “ФОТО” badge from loading and missing-image placeholders, including exported PNG.
- Kept the placeholder visible until the requested image successfully loads and invalidated broken cached image URLs.

## [0.2.4] — 2026-11-16

### Catalog and image-query fixes
- Corrected image search queries for Google, Dreamcast, The Powerpuff Girls, late-90s minimalism, DVD and Pentium.
- Replaced the 1995 Java entry with JavaScript in Netscape.
- Added early-2000s trends for J2ME mobile games, Flash Player / web animation, Newgrounds and the rise of browser Flash games.
- Preserved existing index-based catalog IDs and previous Web 1.0 / Web 2.0 and 2006 revisions.

## [0.2.3] — 2026-11-16

### Catalog corrections
- Replaced the 2006 Hamas election entry with the G8 summit in St. Petersburg (2006).
- Replaced Google Docs (2006) with Opera 9 (2006).
- Replaced the 1990 WWW prototype entry with BBS/FidoNet.
- Replaced the 1991 WWW opening entry with the Web 1.0 era, and added the Web 2.0 era to 2004.
- Appended the Web 2.0 catalog record to preserve index-based IDs of existing curated cards.

## [0.2.1] — 2026-11-16

### Added
- Russian/Runet-focused selections: VKontakte, 2ch / Двач, QIP, Mail.ru Agent, LiveJournal, Diary.ru and Yandex.
- Additional Samsung and Sony Ericsson device references.
- Wikipedia thumbnail search and browser-side image URL caching for curated cards.

### Improved
- Curated card artwork in poster, tier list, bingo and canvas PNG export.
- Preserved the existing responsive mobile navigation and the fixed 1990–2025 selector.

### Limitations
- External images may be unavailable or imperfectly matched; fallback visuals remain.
- Image attribution and reuse rights are determined by the source image license.

## [0.2.0] — 2026-11-16

### Added
- 397 curated catalog entries covering every year from 1990 to 2025 (11–12 per year), across technology, culture, politics, music, cinema, games, fashion, TV and events.
- Mobile quick navigation: Catalog / Board / Export.
- Decade shortcuts and accessible year selector for the complete range.
- Self-contained visual cards for new trends without loading third-party image assets.

### Changed
- Improved responsive layouts for phones and tablets, including larger tap targets, mobile modal sheet, and readable boards.
- Removed the separate “Other year” control and limited selectable years to 1990–2025.
- New year defaults show four suggested cards instead of preloading every trend.

## [0.1.0] — 2026-11-16

### Added
- Local-first editor for personal yearly internet nostalgia collections.
- Poster, S–D tier list and 3×3 / 4×4 / 5×5 bingo layouts.
- Curated example items for 2007–2016, with support for years 1980–2035.
- Custom items with image uploads or HTTPS image URLs.
- Automatic browser storage and JSON backup/import.
- PNG export and responsive layout.
- GitHub Pages-compatible static site, no build step or server required.

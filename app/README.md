# Kino Doma

Kino Doma is a remote-friendly Samsung Tizen web widget with useful keyless Home suggestions, Russian and English title search, favorites, a manual Watched collection, multiple video providers, and parent-controlled Collaps playback/audio selection. Once installed, it needs no running Mac or preview server. Internet access and external services are still required for online content.

These are the sources of **beta 0.2.7**. This source release fixes remote Search focus after empty/error results and cancels catalog lookups on key replacement/removal, with stale-cache guards. It is browser-verified and has not been installed or tested on a TV. The last native-validated release is 0.2.6, preserved separately in [the native runtime snapshot](../evidence/native-0.2.6/runtime/). Installation and a Samsung Home tile were verified on that one Tizen 9 setup, not every Samsung model. See [installation](../docs/installation.md), [validation](VALIDATION.md), and [native status](NATIVE-STATUS.json).

The complete browser run passed all six suites on source 0.2.7: **63 checks**, using pinned Playwright 1.62.1 and controlled HTTP. [BROWSER-STATUS.json](BROWSER-STATUS.json) records the current aggregate; historical per-suite reports retain their original versions. This does not extend the native validation beyond 0.2.6.

## Language policy

Repository documentation and report explanations are English. The installed app intentionally retains its Russian interface. Cyrillic UI strings, film metadata, keyboard layouts, catalog fixtures, and localized selector/assertion expectations in source and tests are functional localization data, not untranslated documentation. Application/package IDs and storage names also remain unchanged to preserve installed identity and local data. An English UI is not implemented.

## Using the app

- Home offers Search, up to three recent items and three favorites, and existing starter films, deduplicated by identity. These suggestions come from saved activity and a fixed starter set, not a current-release or popularity feed.
- Search accepts a Russian/English title, HTTPS Kinopoisk film/series link, or numeric Kinopoisk ID. Keyless search uses Wikidata. Coverage is incomplete; use a link/ID if a title is missing. An English label is not necessarily the original production-country title.
- Details have independent Favorite and Watched actions. Watched is manual: opening, seeking, ending, and closing playback never set it. Recent means a player/page was opened, not that viewing was completed.
- Choose a provider and launch option. Identical launch URLs are merged instead of presenting different aggregator labels as proven audio choices.
- With Collaps, use the parent app's Play/Pause, minus/plus 10 seconds, and Audio buttons. Audio requests the current player's real list. Back closes that dialog first, then returns from playback to providers. No active-track checkmark is shown because the bridge has no separate selection acknowledgement.
- Other providers remain experimental. Switch provider if one fails. Browser-page fallback through web appcontrol still needs verification on the exact firmware.

Native observations cover actual Collaps video, physical pause/seek/resume, the audio dialog, bilingual search, the app's own RU/ABC keyboard, and Watched persistence after an app restart. They do not establish universal provider/film availability or a working stock Samsung Russian IME. [VALIDATION.md](VALIDATION.md) separates native evidence from fixtures.

## Optional catalog

An API key is **not required** for normal use. Without one, feed/genre controls are hidden and no optional-catalog requests are made. The default keyless workflow requires no catalog setup.

Optional online feeds can be enabled in Settings with a [PoiskKino](https://poiskkino.dev/) API key. Consult the service for current terms/limits. Feed criteria are:

| Feed | Criteria |
|---|---|
| New | Digital premiere during the last year through today |
| Best of new | Same period, Kinopoisk rating at least 7 and at least 1,000 votes |
| Top | Rating at least 7 and at least 10,000 votes, without a date limit |

Date, genre, rating, and vote filters are checked in requests and responses. Missing ratings are not invented. Discovery needs the actual previous cursor, stops at 10 pages, and never crawls preceding pages automatically or invents totals. Catalog metadata does not prove video availability.

The key uses a separate app-local localStorage entry and a password input. It is sent only as an HTTPS header to `api.poiskkino.dev`, not in source, URLs, UI errors, or metadata cache. localStorage is not encrypted secret storage; device/browser administrators can access it. Replacing or removing a key cancels Home, search, and by-ID catalog requests. A key epoch also rejects late results and cache publications, including when transport ignores abort. Only catalog cache/cursors are cleared. Removing it preserves saved collections.

**Authenticated requests with a real API key remain unverified.** Contracts, UI, errors, and caching were tested with synthetic keys and controlled HTTP fixtures. Live feeds and native catalog networking remain unverified. Keyless search/library use does not depend on this branch.

## Local data

- `father-cinema.library.v1`: favorites, recent openings, provider preferences, and optional `watched`. Legacy v1 is read without startup rewriting or automatic Watched migration.
- Watched accepts at most 1,000 manual records. A new mark at the limit is rejected explicitly; old marks are not silently evicted. Collections render 30 cards per page and preserve useful return focus.
- Manual-status changes and same-ID film/series refinement persist candidates before committing UI changes. Storage errors preserve the previous manual status. Refinement moves/deduplicates owned collections and preferences together. Offline metadata never blocks manual marking indefinitely.
- `father-cinema:catalog-api-key:v1`: optional API key. `father-cinema:catalog-metadata-cache:v1`: normalized public metadata/cursors, with an approximately 600 KiB LRU budget. Cards are fresh for 24 hours and genres for seven days. Stale fallback is labeled; optional cache failures never clear the key/library.

Persisted lists contain normalized cards and approved public image paths. They do not store player URLs/tokens, exact audio-option values, or third-party playback progress. Audio values stay in controller memory. Clearing app data removes local lists and the optional key.

## Development preview

From this directory:

```sh
python3 -m http.server 8876 --bind 127.0.0.1
```

Open `http://127.0.0.1:8876`. There is no runtime framework, bundler, or npm dependency. Arrows/Enter/Escape exercise parent navigation. Desktop preview does not prove Samsung installation/codecs/remote behavior. Installation requires your own Samsung development signing profile; certificates and signed WGT are excluded.

## Checks

With a modern Node version providing `node:test`, `fetch`, and `Response`, run from this directory:

```sh
node test-catalog-client.cjs
node test-core.cjs
node test-watched.cjs
node test-refinement.cjs
node test-collaps-bridge.cjs
node test-sounds.cjs
node test-verification-tools.cjs
python3 validate_export.py
```

Browser `verify-*.cjs` scenarios additionally need Playwright and an installed Chrome channel. `PLAYWRIGHT_MODULE` selects an existing module. `CINEMA_PREVIEW_URL` defaults to `http://127.0.0.1:8876/`. External HTTP is mocked/blocked; no TV, real key, or real media is used.

Generated reports/screenshots go to the repository's ignored `build/browser-reports/` by default. Set `CINEMA_REPORT_DIR` to another directory if needed; relative overrides resolve from the process working directory. Checked-in evidence is not overwritten by default. The verification-tool regression test needs Python 3 and uses temporary copies without opening a browser or contacting a service. New reports do not establish native compatibility. See [VERIFICATION.md](VERIFICATION.md).

## External sources and boundaries

- Keyless metadata: [Wikidata API](https://www.wikidata.org/w/api.php), [Kinopoisk property P2603](https://www.wikidata.org/wiki/Property:P2603), and Wikidata's CC0 metadata.
- Optional catalog: [PoiskKino documentation](https://poiskkino.dev/documentation), fixed `/v1.5` endpoints and header-only keys.
- Images: exact hosts `st.kp.yandex.net`, `avatars.mds.yandex.net`, `image.tmdb.org`, and `cdnrrviubnyuntopbez5.svc.cdn.yandex.net`. Only HTTPS without credentials/custom ports is accepted; query/fragment are discarded. Unknown hosts fall back to the Kinopoisk-ID resolver. Images use anonymous CORS/no-referrer and cards lazy-load. Posters are fetched, not bundled or claimed as original artwork.
- Players: `https://fbphdplay.top/api/players?kinopoisk={id}`, associated with the [service instructions](https://teletype.in/@fbdostup/instrukciya). This is an undocumented, changing contract. The Collaps bridge follows observed behavior, not a universal standard.

The parent rejects unknown player origins/actions, does not treat iframe load as playback, and does not extract media URLs or bypass DRM. It adds no first-party analytics or remote fonts. Embedded providers execute their own code and may contact their own services; parent CSP/URL allowlists do not guarantee tracker-free embedded pages. Use content you are authorized to access.

# Kino Doma architecture, 0.2.7

Kino Doma packages local HTML/CSS/JavaScript as a Tizen web widget. No continuously running computer is needed after installation. Online metadata, images, and video remain external dependencies. The runtime interface intentionally remains Russian while repository prose is English; localized source/test values are functional data.

## Modules

| Module | Responsibility |
|---|---|
| `core.js` | ID/URL/metadata validation, library v1, manual Watched candidates, film/series refinement, identical launch-URL deduplication |
| `catalog-client.js` | Optional fixed-origin PoiskKino API, header-only key, rejected redirects, validated fields/cursors, cancellation, timeouts, static errors |
| `catalog-ui.js` | Keyless Home, optional catalog/settings/genres, separate public-metadata cache |
| `adapters.js` | Keyless bilingual Wikidata search, player options by ID, attempted browser handoff |
| `collaps-bridge.js` | Narrow object postMessage adapter for acknowledged playback, absolute seek, and real audio-list requests/selections |
| `app.js` | Cards, saved collections, details, on-screen keyboard, focus, and Back routing |

There is no runtime framework, remote font, package manager, or first-party telemetry client. The native 0.2.6 baseline is preserved separately. Source 0.2.7 makes narrow lifecycle/focus fixes without restructuring the existing modules; it has browser evidence and no native 0.2.7 validation.

## Persistence

`father-cinema.library.v1` retains favorites, recent openings, preferences, and optional Watched. Watched is manual, capped at 1,000 without silent eviction, and never inferred from playback events. Candidate persistence precedes manual-status UI changes. Same-ID film/series refinement moves/deduplicates owned collections and preference keys together; existing target-type preference wins a collision. Write failure preserves the previous type/status. Offline metadata does not block manual marking.

Collections render 30 cards per page. Return navigation restores the card or nearest surviving one. Recent openings are bounded history, not completed-viewing records or playback resume positions.

The optional API key and public cache use separate localStorage entries. The password input is never prefilled. Keys are excluded from URLs, UI errors, player messages, and metadata cache. localStorage is app-local persistence, not encrypted credential storage. Approved image URLs become origin/path only. Raw player URLs and exact audio values remain in memory.

## Catalog

Keyless Home combines up to three recent items, three favorites, and existing starter films, deduplicated by identity. It has no setup panel, inactive online controls, fake ratings, or current-release claims. It makes no PoiskKino requests. Wikidata, manual links/IDs, and the library remain usable.

With a key, feeds use actual digital-premiere dates and rating/vote criteria. Unknown totals stay unknown. Discovery requires the actual previous cursor and stops at 10 pages. Failed Next restores the last successful same-section/genre list. Stale fallback is explicit; catalog search failure falls back to Wikidata.

Key replacement/removal increments an epoch, aborts tracked search/by-ID controllers and Home work, and resets only catalog state. Each client receives an epoch-bound key/cache adapter, so stale publishers cannot refill a cleared cache. Internal cancellation does not trigger a Wikidata fallback or render an old lookup result. The approximately 600 KiB public LRU cache contains normalized metadata and cursors. Cache failure never deletes the key/library. Contracts are fixture-tested; real authenticated access and native catalog CORS/WARP are unverified.

## Focus and playback

Home initially focuses Search; Search entry focuses the own Keyboard button. Empty/error completion restores a submit button blurred by native disabling only when the same query still owns the Search screen, focus remains on the document body, and no modal is open. Navigation or a deliberately focused control is never overridden. Keyboard, genre, and audio dialogs isolate their background and trap parent navigation. Own RU/ABC input does not establish stock Samsung IME support.

Collaps keeps focus in parent buttons and its iframe out of D-pad/Tab navigation. Accepted messages require the exact frame window/origin/envelope. Audio additionally requires the current pending request ID, expected item action, bounded labels/string values, and current-list membership. Selection sends the exact returned value, not an aggregator index. Sending a command or receiving cleanup does not establish an active track.

Play/pause/time UI follows accepted messages. First iframe load preserves valid early readiness; later loads reset the controller/deadline. Busy/reload/provider changes cancel stale requests and audio values. Other providers retain an explicitly unverified fallback.

## Boundaries

Exact parent WARP/CSP allowlists and text rendering constrain parent requests/bridge input. They do not make cross-origin provider pages first-party or tracker-free. No third-party player source, media extraction, DRM bypass, or poster assets are included.

Native claims are scoped in [VALIDATION.md](VALIDATION.md). Other models, all content/providers, stock RU IME, browser web appcontrol, and authenticated catalog access are not universally verified. Use your own signing profile as described in [installation](../docs/installation.md).

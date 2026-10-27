# Validation and limits, source 0.2.7

Source beta 0.2.7 changes app.js, catalog-ui.js, and the widget version in config.xml; the other eight runtime files match the preserved native 0.2.6 snapshot. Version 0.2.7 is browser-verified only and has not been installed on a TV. The native observations below apply to 0.2.6 and the earlier versions explicitly named. Native evidence consists of recorded device observations cross-checked against retained session records; installed bytes were not independently reread during this source update. Raw device/debug records are excluded.

## Current source regression checks

Both defects were reproduced against the previous implementation before fixing them. The current source adds these isolated browser regressions:

- Empty and failed searches retain usable Search focus; another Enter retries. A delayed completion never steals focus after section navigation.
- Key replacement and removal each cancel in-flight search and by-ID requests even when fetch ignores its abort signal.
- A cache adapter captured by a prior key epoch cannot publish after reset. No old result, fallback search, or stale cache record is committed; saved library data is retained.

The updated QoL suite has 12 checks and Home has 16. Current results are recorded in `runtime-fixes-verification.json`. These use synthetic keys and controlled HTTP, not real catalog authentication, media, or TV input. Historical reports below retain their actual versions; generated reports read the current manifest version rather than a hardcoded label.

## Complete browser run for source 0.2.7

All six suites were rerun sequentially through the repository's ephemeral-server runner with pinned Playwright 1.62.1: Home 16, Watched 8, identity refinement 4, QoL 12, Collaps transport 14, and audio selection 9. All **63 checks passed**, every generated report identifies source 0.2.7, and no unhandled errors were recorded. `BROWSER-STATUS.json` contains the fresh aggregate.

External HTTP was mocked or blocked. No real API key, media, or TV was used. The six checked-in per-suite JSON files below remain historical evidence with their original version labels; they were not overwritten or relabeled. This complete browser run does not establish native 0.2.7 compatibility.

## Native observations

| Area | Observed result | Limit |
|---|---|---|
| Standalone widget, 0.2.x | Installation, Samsung Home tile, real posters | One Tizen 9 setup, not all models |
| Search/input, 0.2.3-0.2.5 | Bilingual search; own RU/ABC keyboard physically produced code points 1072 and 97 in 0.2.5, with Clear/Back | Not stock Samsung Russian IME |
| Collaps, 0.2.3 | Actual video; physical OK pause/resume and plus/minus 10-second controls; parent focus | Not all content/providers/codecs |
| Audio, 0.2.4 | Own dialog, real list, physical selection with playback continuing, Back | No separate active-track acknowledgement or universal audibility claim |
| Watched, 0.2.5 | Physical mark/count/pressed/badge, collection, app-restart persistence, QA unmark | App restart, not a separate TV power-cycle test |
| Keyless Home, 0.2.6 | Installed version, three known cards, no setup panel, hidden feed controls; physical card/Favorite/Watched/Back route | No API key/live feed |
| Persistence/search, 0.2.6 | App process termination/relaunch retained mark/collection; QA mark removed. Both real title queries found ID 258687 without error | Text prepared diagnostically, submitted by physical Search Enter; not full-title physical typing |
| Optional catalog | Local contracts/UI using synthetic keys/HTTP fixtures | No real authenticated GET or native catalog-networking verification |

Final ordinary 0.2.6 launch followed cleanup: debug stopped, inspection port closed, SDB forwards empty, no active root session, normal launch succeeded. Home had three cards/three loaded posters, zero optional-catalog requests, no key/iframe/visible errors, and Watched count zero after QA cleanup. Temporary key setup was cancelled and no key file remained. These are scoped observations, not ongoing monitoring.

## Saved automated evidence

| Suite | Passed groups/scenarios | Scope |
|---|---:|---|
| Node catalog client | 17 | Controlled API/cache fixtures, no real API key |
| Node core | 9 | ID/URL/model validation |
| Node Watched | 4 | Candidates, bounds, legacy data |
| Node identity refinement | 3 | Collection/preference remap and deduplication |
| Node transport bridge | 9 | Messages, commands, bounds, reset |
| Node audio | 6 | Correlation, membership, cancellation |
| Browser Home | 12 | 0.2.6 keyless UI and optional-catalog fixtures |
| Browser Watched | 8 | 0.2.5 persistence/quota/pagination/navigation |
| Browser identity refinement | 4 | 0.2.5 pending-metadata race/rollback |
| Browser input QoL | 9 | 0.2.5 known IDs, input boundaries, keyboard/search |
| Browser transport | 14 | 0.2.5 controls, reload, focus, deadlines |
| Browser audio | 9 | 0.2.5 list/selection, modal focus/retry/reset |

Saved reports retain their actual run versions; older regressions are not relabeled as new 0.2.6 runs. External browser HTTP was mocked/blocked, with no TV, real key, or real media. Successful runs recorded no unhandled browser errors. Fixtures exercise real parent modules but do not prove native codecs, live providers, or authenticated access.

Regressions cover quota rollback, pending film-to-series refinement, 30-card pages, parent focus during buffering/retry, wrong-origin/source rejection, first-load versus repeat-load readiness, true cursor gating, stale fallback, key redaction, and key-change cancellation.

## Documentation/tooling review

The preserved native 0.2.6 snapshot remains unchanged; current source fixes are scoped above. Documentation distinguishes standalone and online dependencies, optional unverified catalog access, on-screen keyboard limits, unencrypted localStorage, and independent embedded providers.

The export validator now rejects unlisted nested files, symlinks, unsafe/duplicate manifest entries, and corrupt bytes using explicit checks that also work under Python optimization. Browser checks now write generated reports/screenshots to ignored build output or an explicit `CINEMA_REPORT_DIR`, preserving checked-in evidence by default. These fixes affect verification tools, not the installed app.

Recorded repository verification results include 17 passing Python tests, 48 passing Node domain checks and passing syntax checks for all six browser scripts. `test-verification-tools.cjs` passed two groups: 18 actual script-prelude cases covering default/absolute/relative report directories, and 26 source/ZIP validation cases covering ordinary and optimized Python execution. These tool tests use temporary files and a deliberately unresolved fake browser launch; no real browser, network, or TV is involved. The historical checked-in browser reports are retained without relabeling. Fresh generated evidence has its actual source version and separate output paths.

## Public evidence

`NATIVE-STATUS.json` is a sanitized summary, not a fresh device probe. `EXPORT-MANIFEST.json` records file sizes/SHA-256 except its own hash. `PUBLIC-PRIVACY.json` describes provenance, scans, localization, and exclusions. Raw debug/player data, private identities, installers, certificates, real keys, screenshots, posters, and media are excluded. Pattern scans complement the allowlist/manual review; they are not a general DLP guarantee.

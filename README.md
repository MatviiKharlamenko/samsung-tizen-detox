# Samsung Tizen Detox

[![Repository checks](https://github.com/MatviiKharlamenko/samsung-tizen-detox/actions/workflows/ci.yml/badge.svg)](https://github.com/MatviiKharlamenko/samsung-tizen-detox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Samsung Tizen configuration research and **Kino Doma**, a remote-friendly movie application. The repository provides source code, verified configuration procedures, validation results and rollback instructions.

**Current source: 0.2.7. Last TV-tested build: 0.2.6.** The current revision fixes search-focus recovery and catalog-request cancellation. Its automated browser checks are separate from the recorded TV results.

**Device evidence:** two Samsung 2024 configurations, each with its own observations and limits. The app's native tests remain scoped to the Q64D.

| Device and observation date | Exact configuration | Validation scope |
|---|---|---|
| QE75Q64DAUXXN, October 26, 2026 | Tizen 9.0, ARMv7, Linux 5.4.249, T-NKLDDEUC-0090 / 2123.9 | [Original system reboot and native app results](tv/profiles/qe75q64dauxxn-tizen9-2123.9.json) |
| QE75Q74DATXXN, October 27, 2026 | Tizen 9.0, ARMv7, Linux 5.4.249, T-NKM2DDEUC-0090 / 2123.9 | [Separate reboot-checked system results](tv/docs/q74d-results.md); both temporary root sessions closed and cleanup verified |

Other models and builds are unverified. A matching Tizen version or numeric firmware version does not establish matching packages or dependencies.

## Choose your starting point

| Goal | Start here |
|---|---|
| Try the app on a computer | [Local preview](#local-preview) |
| Install it on your own Samsung TV | [Installation and signing](docs/installation.md) |
| Understand the TV changes | [TV findings](tv/README.md), [procedures](tv/docs/verified-recipes.md), [rollback](tv/docs/rollback.md) |
| See what was verified and what remains open | [Project status and coverage](docs/PROJECT_STATUS.md), [TV validation](tv/docs/validation.md), [app validation](app/VALIDATION.md) |
| Use the app | [Quick start](QUICKSTART.md) |
| Contribute or report an issue | [Contributing](CONTRIBUTING.md), [security reporting](SECURITY.md) |
| Follow the project history | [Changelog](CHANGELOG.md) |

## Verified results

The table below summarizes the original Q64D results. The [Q74D case](tv/docs/q74d-results.md) separately checked its selected changes after a software reboot: two application flags, Russian OSD, DNS, startup controls and the canalysis guard. It preserved HbbTV and a different Bixby-related package and required no Wi-Fi band change. These device-specific decisions are not a universal disable list.

| Area | Observed result | Important boundary |
|---|---|---|
| System language | Russian OSD persisted after a full software OS reboot | Stock Samsung Russian soft-keyboard support remains unresolved |
| Network | 5 GHz Wi-Fi and both AdGuard Default DNS resolvers persisted | No maximum-throughput or complete traffic audit |
| Selected components | Four exact application disable flags and an existing vendor guard for canalysis persisted | No blanket service removal or claim of eliminating all tracking |
| Access | Temporary UID 0 and this kernel's capability range were verified | No persistent boot-root, TEE/DRM bypass or verified Tizen 10 upgrade |
| Kino Doma 0.2.6 | Installed Home icon, real RU/EN title search, posters, own keyboard, favorites and manual Watched collection | App-restart persistence was tested separately from the earlier OS reboot |
| Playback | Remote play/pause/seek/resume and Ukrainian audio selection worked with one external player | Not a guarantee for every film, voice track or provider |

No measured speedup, universal ad blocking or complete telemetry removal is claimed. [Root boundaries](tv/docs/root-capabilities.md) and [limitations](tv/docs/limitations.md) define the scope of the recorded results.

## Local preview

Clone the repository with Git, or download its source ZIP for a browser preview:

```sh
git clone https://github.com/MatviiKharlamenko/samsung-tizen-detox.git
cd samsung-tizen-detox
```

The preview only needs Python 3. From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory app
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Use a mouse or arrow keys, Enter and Escape. `npm run preview` starts the same server if Node.js is available. Browser collections are separate from the TV's local storage.

The app provides a Russian interface with Russian/English keyboard input and title search. The exact TV-tested 0.2.6 runtime is preserved in an [immutable reference snapshot](evidence/native-0.2.6/README.md), checked against its [native fingerprint](evidence/native-0.2.6-runtime.sha256). Active development source in `app/` has its own version and integrity manifest; it does not inherit native verification from the snapshot.

The default keyless mode offers Wikidata title search, links/IDs, clearly labelled starter cards and personal collections. Live new-release, genre and rating feeds are disabled. The optional catalog adapter has fixture tests; authenticated catalog requests were not tested on the TV. Search coverage is incomplete, and a metadata result does not guarantee available video.

Search, posters and external players require internet access. Third-party frames can make their own requests and have their own tracking behavior; our UI does not prove they are privacy-free. No film files, downloaded posters, third-party player code or account data are distributed here. See the [security boundaries](SECURITY.md).

## Check and package

Development checks require a Git working checkout, Node.js 22+ and Python 3.12+. The publication checker uses Git's candidate file list; source-ZIP users can preview/package the app, but should clone the repository to run the complete contributor checks. There are no npm runtime dependencies and no installation step for the default offline checks:

```sh
npm test
npm run package:unsigned
```

The packager stages **only 11 runtime files** in `build/runtime/` and creates an unsigned WGT under `build/`. It does not package test reports, connect to a TV, read certificates or sign anything. Use your own Samsung certificate profile for installation; follow the [official-tooling instructions](docs/installation.md). An installed app does not require a continuously running Mac.

CI runs the offline integrity/privacy/language checks, logic tests, unsigned packaging and all six isolated browser suites. Browser testing uses a pinned development dependency and preinstalled Chrome. Run it locally with `npm ci --ignore-scripts` followed by `npm run test:browser`; the runner manages its own loopback server and reports. CI cannot certify firmware compatibility, native playback, HDMI or DRM. See [contributing](CONTRIBUTING.md) for prerequisites and boundaries.

## Repository map

```text
app/          Tested app runtime, portable tests and app evidence summaries
tv/           Device-specific TV findings, rollback, sources, strict profiles
docs/         Installation, project coverage and repository review
evidence/     Immutable TV-tested runtime snapshot and fingerprint
tools/        Offline publication checks and unsigned runtime packager
.github/      CI and issue forms
```

The repository contains application source and sanitized technical findings. Credentials, signing profiles, device/network identifiers, raw session records, signed WGTs, firmware, SDK binaries, root payloads, user history and screenshots are excluded. See [review scope and validation](docs/REVIEW.md) for the publication boundaries.

Original materials are [MIT](LICENSE). [Third-party sources retain their licences](tv/THIRD_PARTY_NOTICES.md). Inspired by [Ansub/tv-detox](https://github.com/Ansub/tv-detox); its Android ADB/APK commands do not apply to Tizen. This independent project is not endorsed by Samsung or referenced services.

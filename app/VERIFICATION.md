# Source verification, 0.2.7

[VALIDATION.md](VALIDATION.md) separates native observations, saved test-run versions, and limitations. These checks need no TV, account, or network.

## Integrity

From this directory:

```sh
python3 validate_export.py
```

The helper verifies the recursive exact file set, the fixed 11-file runtime allowlist, safe unique names, sizes/SHA-256, and absence of symlinks. It requires matching numeric semantic versions (major.minor.patch) in the source manifest and config.xml rather than a hardcoded release number. Explicit failures remain active under `python3 -O`. If a separately created flat source ZIP has exactly the same members, its CRC/member set/bytes can be checked with:

```sh
python3 validate_export.py /path/to/flat-source.zip
```

The optional input is a flat source archive, not a signed installer or whole-repository ZIP. A missing, extra, modified, or linked file must fail validation. The manifest itself is excluded from its own hashes and is not a cryptographic signature.

## Runtime provenance

The baseline has 11 files: `index.html`, `styles.css`, `core.js`, `collaps-bridge.js`, `catalog-client.js`, `catalog-ui.js`, `adapters.js`, `app.js`, `icon.svg`, `icon.png`, and `config.xml`. Current source 0.2.7 changes app.js, catalog-ui.js, and config.xml relative to the separately preserved native 0.2.6 runtime snapshot. The other eight runtime files match that snapshot. The recorded unsigned-package digest applies to the native baseline, not a new 0.2.7 package; no installer is included.

The actual manifest targets Tizen 9, keeps package `FatherCine` and application `FatherCine.Main`, uses the original PNG icon, and has 14 exact access origins with no subdomain wildcards. The 0.2.7 fixes retain the Russian UI, application/package identity, storage compatibility, and existing localization fixtures. This source release has not been natively validated. The current documentation review did not access signing credentials or independently reread installed device bytes.

## Browser test output

Browser `verify-*.cjs` scenarios default to the repository's `build/browser-reports/`, not this source directory. `CINEMA_REPORT_DIR` overrides it; a relative override resolves from the process working directory. Directories are created as needed. Fixture/source reads still use the actual app path. Checked-in historical JSON retains its original version. Newly generated reports read the current source manifest version; runtime-fixes-verification.json summarizes the new 0.2.7 regressions.

`node test-verification-tools.cjs` checks report-directory resolution in all six actual script preludes and exercises validation against temporary modified source/ZIP copies, both normally and with Python optimization. It requires Python 3 but no Playwright installation, browser, network, or TV.

Playwright plus its Chrome channel are separate test-only dependencies. `PLAYWRIGHT_MODULE` selects an existing module; `CINEMA_PREVIEW_URL` defaults to localhost port 8876. All external traffic is mocked/blocked. Generated screenshots depict fixtures, not live recommendations. Changing test output locations does not upgrade older native/test evidence.

## Current complete browser aggregate

From the repository root, `npm run test:browser` runs all six suites sequentially with pinned Playwright 1.62.1 and an ephemeral loopback server. The fresh source 0.2.7 run passed 63 checks with no unhandled errors; `BROWSER-STATUS.json` records its counts and scope. All generated reports identified 0.2.7. Existing historical per-suite JSON remains unchanged. This fixture run used no real key, media, or TV and does not replace native validation.

## Evidence boundaries

Native summaries derive from recorded device observations cross-checked against retained session records; device identities and raw logs are excluded. Final 0.2.6 evidence covers keyless Home, physical Watched navigation, app-restart persistence, bilingual search submission, normal launch, and debug cleanup. Earlier native versions provide explicitly dated playback/audio/own-keyboard observations.

Browser reports describe isolated Chrome fixtures, not live/native certification. Real authenticated PoiskKino GET and native optional-catalog networking are unverified. The default keyless workflow does not use that branch.

## Public-data review

An explicit allowlist, recursive file/hash comparison, binary inspection, targeted private-path/device/credential/token scans, and manual network/storage review support `PUBLIC-PRIVACY.json`. No third-party player source, poster/media assets, signatures, certificates, private keys, installers, real keys, raw device/debug records, or personal paths are bundled.

Prose/report explanations are English. Cyrillic source/test values remain intentional UI localization, film/genre fixtures, keyboard layouts, and selector/assertion expectations. Native Russian-query evidence is encoded as Unicode scalar values. Synthetic test keys/token-shaped values are test-only, never real credentials or runtime defaults. This is a scoped source review, not a blanket security or tracker-free-service guarantee.

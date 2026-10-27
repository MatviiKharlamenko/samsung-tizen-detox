# Contributing

Contributions should make the documented results easier to reproduce without turning one tested TV into a claim of universal compatibility.

## Scope and language

Repository documentation, issue descriptions, review reports, and nonlocalized comments use **English**. Russian UI strings and Russian/English metadata fixtures are part of the tested application localization. Localization changes require functional validation; documentation-only changes must preserve runtime strings and selector expectations.

The 11 runtime files in `app/EXPORT-MANIFEST.json` identify the current source, **0.2.7**. The separately preserved [native 0.2.6 snapshot](evidence/native-0.2.6-runtime.sha256) records the version tested on the TV. Version 0.2.7 has software verification, not a new TV installation. Documentation changes must not silently change runtime bytes; functional changes need their own version, tests, updated provenance and a clear distinction between browser and device verification.

## Before making a change

1. Read the [project status](README.md), [limitations](tv/docs/limitations.md), and the relevant app or TV document.
2. For a new TV model/build, start with observations and a proposed evidence profile. Do not reuse registry enums, service guards, app IDs, or rollback values without checking them on that target.
3. Keep fixes focused. Explain the concrete failure and why the change resolves it; avoid broad refactors mixed with new evidence claims.

## Local validation

Use a Git working checkout, Python 3.12+ and Node.js 22+ as specified by the root `package.json` and CI. The normal repository-wide entry point is:

```sh
npm test
```

The app checks can also be run individually from the repository root:

```sh
python3 app/validate_export.py
node app/test-core.cjs
node app/test-watched.cjs
node app/test-refinement.cjs
node app/test-catalog-client.cjs
node app/test-collaps-bridge.cjs
node app/test-sounds.cjs
node app/test-verification-tools.cjs
python3 -m unittest discover -s tools -p 'test_*.py'
```

A failed hash check requires investigating the change; do not simply regenerate integrity metadata to hide an unexpected diff. When an intentional update changes checksummed files, update the appropriate manifest and describe that update in the PR. The separate native-runtime fingerprint is historical evidence: a future runtime must receive a new version and evidence record instead of replacing that baseline silently.

For the ordinary browser preview and your own signed TV installation, see [installation](docs/installation.md). The app has no runtime npm dependencies.

## Browser fixture checks

Install the pinned test-only dependency from the lockfile, then use the runner:

```sh
npm ci
node tools/run_browser_checks.cjs
```

Google Chrome must already be installed. The runner does not install a browser or open a personal browser profile. It starts its own Python preview on an automatically assigned loopback port, serves only the 11 runtime assets and runs all six `app/verify-*.cjs` suites sequentially. It does not reuse port 8765 or a separately running preview. The suites use controlled HTTP/player fixtures rather than a TV, real API key or real media. A failure stops the sequence; normal completion, failure and interrupt paths close the owned preview server.

Each run writes reports and screenshots to a new `build/browser-reports/run-*` directory. These are generated fixture results, separate from checked-in historical evidence. `CINEMA_REPORT_DIR` can select another report base outside `app/`; the runner still creates a fresh run subdirectory. `PLAYWRIGHT_MODULE` can select an existing Playwright installation instead of the locked local dependency, and `CINEMA_PYTHON` can select a Python 3.12+ executable. The runner sets `CINEMA_PREVIEW_URL` itself.

For a single advanced scenario, follow the direct-script instructions in the [app README](app/README.md). Do not point fixture scripts at a live TV debug endpoint or a personal browser profile. Passing fixture checks does not establish native codecs, live-provider availability or TV installation success.

## Evidence required for a pull request

State exactly what ran and what did not:

- The commit/app version, test layer, and result: static check, Node test, browser fixture, live web request, or actual TV operation.
- For device results, the nonunique model code, region if relevant, OS version, and firmware build. Explain the before/after state and rollback conditions without attaching raw databases.
- Distinguish an app restart, software OS reboot, power removal, and firmware update. None implies the others.
- For performance claims, provide comparable measurements and a repeatable workload. A stopped process or freed storage is not a measured interface speedup.
- For a package/service change, include the exact target identity, dependency reasoning, saved before-state, readback, and tested rollback. Keep the before-state itself local if it contains personal data.

Prefer a small text summary to a raw session dump. Record limitations and failed experiments as clearly as successful ones. Tests with synthetic data must remain labelled synthetic.

## Privacy and distribution

Never commit signing profiles, P12/private keys, account tokens, real catalog keys, TV serial numbers/DUIDs/MAC addresses, private network addresses/SSIDs, personal watch lists, raw player URLs/tokens, device databases, or unredacted screenshots. Use the [security policy](SECURITY.md) for sensitive findings.

The repository ships original source and documentation, not Samsung firmware, an SDK, a root payload, personal signed WGTs, external player code, poster files, or video. Preserve applicable license notices and cite primary sources for platform claims. Do not assume that an available API or poster URL grants redistribution rights to its entire catalog.

## Submitting

Open a focused issue or pull request in English. Explain the problem, final behavior, meaningful validation, and material limitations. For documentation-only changes, confirm that runtime hashes remain unchanged. Do not claim a real-device result from an emulator, mocked browser test, or an SDK exit code alone.

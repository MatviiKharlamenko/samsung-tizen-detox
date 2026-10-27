# Repository review

Pre-release review completed on October 27, 2026. Scope: the complete public file tree, documentation, consistency with recorded device evidence, installation instructions, publication boundaries and developer checks. This was not a new firmware-source audit, penetration test or hardware benchmark. A subsequent [Q74D device session](../tv/docs/q74d-results.md) has its own dated profile/schema; it does not change the original Q64D or native app evidence.

## Findings addressed

| Review finding | Resolution |
|---|---|
| Mixed Russian/English project documentation and duplicate entry pages | One English README, English quick start and translated TV/app documentation; localized runtime strings remain intentional |
| Findings were spread across separate documentation/source exports | [Project coverage](PROJECT_STATUS.md) maps original goals to evidence, outcomes and remaining limits |
| No complete fresh-user TV setup/signing/install path | [Installation](installation.md) distinguishes official prerequisites and commands from device-specific observations |
| Packaging the whole app folder could include tests and reports | `tools/package_unsigned.py` stages an explicit 11-file runtime allowlist and builds an unsigned WGT |
| No CI or standard contributor check command | `npm test` and pinned-action CI cover offline checks and existing logic tests without credentials or TV access |
| Export integrity used removable Python assertions and missed nested extra files | App validation now uses explicit checks and a complete file set, including symlink/path handling |
| Browser suites overwrote committed historical reports | Optional suites now write to ignored `build/browser-reports/` or `CINEMA_REPORT_DIR` |
| No repeatable language/link/privacy/profile checks at repository level | `tools/check_repository.py` checks public candidates, English Markdown/YAML/JSON prose, relative links/anchors, manifests and every keyword used by the closed evidence schema |
| Filesystem aliases could bypass candidate checking or overwrite a source through build output | Dangling symlinks are included and rejected; output symlinks, hard links and special files are refused before content writes, with disposable-tree regression tests |
| No durable distinction between current source edits and tested native bytes | A separate historical fingerprint records all 11 native 0.2.6 runtime files; documentation changes do not alter them |
| No contributor/security reporting process | English contribution guide, issue forms and an enabled private GitHub vulnerability-reporting route |
| A second TV had a different firmware family and package inventory | The Q74D has a separate exact profile, closed schema and reboot-checked results; the original Q64D evidence remains unchanged |

## Source and publication hardening

Additional reproducible defects were addressed during clean-checkout and publication reviews:

| Defect | Resolution and regression |
|---|---|
| Search lost remote focus after empty/error results | Source 0.2.7 restores the Search button only when the request still owns the search route and no later control has focus |
| Key replacement/removal left catalog lookups active | Source 0.2.7 cancels search/ID requests and rejects old-client cache writes even when a transport ignores cancellation |
| Publication checks could miss different content already staged in Git | The index and worktree are checked independently, including staged blobs missing or changed locally; Git-backed negative tests cover both cases |
| Registered evidence validation could miss staged-only profile or schema changes | Both the Git index bytes and worktree must contain exactly the registered model/schema pairs and pass the same closed-schema and identity checks |
| A fingerprint could retain 11 entries while substituting an unrelated file | The native reference snapshot is checked against the exact required 11-file set as well as content hashes |
| Dependency lock URLs could reference a nonpublic npm registry | Public npm tarball URLs and SHA-512 integrity are required in both staged and working lockfiles; a fresh-cache public install was verified |

The public clone and source ZIP were exercised independently: offline checks and unsigned packaging passed, and ZIP-served assets matched their source bytes. Browser tests now run sequentially with pinned Playwright, an automatically managed loopback server and isolated output. These operations neither contact a TV nor use a real catalog key or external media.

The exact native 0.2.6 runtime is archived under `evidence/native-0.2.6/runtime/`. Current source 0.2.7 is browser-verified only; historical native observations are not reassigned to it. Details of the targeted regressions are retained in [app validation](../app/VALIDATION.md).

## What the checks establish

The native snapshot fingerprint identifies the historical reference build; the app source manifest identifies the current development revision. Neither independently rereads the installed TV or proves future changes safe. Browser fixture reports exercise our own UI/protocol contracts with synthetic responses; they are not live catalog or universal video-provider tests.

The repository checker is a focused safeguard, not a general data-loss-prevention product. It checks tracked and eligible untracked public files, not ignored private signing/research directories. Its schema validator covers every keyword used by this repository's deliberately closed schema and rejects unsupported keywords; it is not a general JSON Schema implementation. Native observations remain historical, with their limits in the coverage and validation documents.

The review added six Python boundary tests and verification-tool regressions covering 18 browser-report path cases plus 20 integrity cases, including optimized Python execution. The existing app logic suite has 48 checks. A local unsigned build reproduced the recorded 0.2.6 archive hash, while the separate runtime fingerprint checks all 11 uncompressed files. These are repository/source checks, not new TV experiments.

The later two-model evidence review expanded the Python suite to 38 tests, including Git-index evidence bypass regressions. The complete `npm test` command and current unsigned packaging passed locally. Q74D hardware results were collected separately and are not inferred from these automated checks.

## Preservation and exclusions

Preserved: the app source, portable logic/browser tests, historical validation summaries, exact model/build scope, selected changes and rollback prerequisites, access boundaries, failed IME experiments and cleanup, primary-source references, and open compatibility/performance questions.

Excluded: raw session records, device/network identifiers, account data, certificate profiles, passwords/tokens, private backups, watch history, native screenshots, external media/player source, SDK/firmware binaries and root payloads.

## Remaining limits

- Two exact TV/builds have separate observations and selected software-reboot checks; no cross-model compatibility certification. Q74D root-session cleanup was verified, but app playback, native installation and keyboard testing remain separate.
- Stock Russian Samsung soft-keyboard input remains unresolved.
- No supported Tizen 10 upgrade was verified for either recorded unit at its research date.
- No comparable performance benchmark or complete telemetry/advertising elimination proof.
- No complete post-change streaming/DRM/HDMI/PS5 test matrix.
- No authenticated optional-catalog TV test; keyless mode is the chosen default.
- No guarantee for every external provider, film, voice track or browser policy.

These are documented limits of the evidence, not completed features. Future changes need their own scoped tests and updated evidence; [contributing](../CONTRIBUTING.md) describes that process.

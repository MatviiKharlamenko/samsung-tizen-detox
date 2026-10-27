# Security and privacy

This is an experimental project with observations for two exact TV/firmware combinations and native app tests on one of them. It has no supported-version or response-time guarantee. A documentation update or passing local tests is not a security assessment of Samsung firmware or external playback services.

## Reporting a sensitive issue

Do not put credentials, a device identifier, private network details, personal library contents, raw logs, or an actionable unpublished vulnerability in a public issue or pull request.

Use [GitHub's private vulnerability report](https://github.com/MatviiKharlamenko/samsung-tizen-detox/security/advisories/new). Private vulnerability reporting was enabled and its setting checked during the 2026-10-27 repository review. If GitHub does not offer the form to you, open a minimal public issue asking for a private reporting channel, without including sensitive details. No response-time guarantee or separate security email is provided.

For a non-sensitive reproducible bug, use the normal issue template and provide a sanitized summary.

## Trust boundaries

- The unsigned packager reads the public runtime and creates local build output. It does not contact a TV or read signing credentials.
- Samsung TV installation needs your own author/distributor signing profile. Keep certificate material and profile secrets outside this repository.
- Developer Mode, SDB, and Web Inspector are development access. Use them on a trusted network, restrict the allowed host, and close debug sessions when finished. The app itself does not require permanent root or an always-running computer.
- Root procedures are separate from app installation. The documented result is temporary root, not control of the secure world, a persistent boot modification, or permission to bypass firmware signing.
- Search terms and film identifiers can be sent to external metadata/player services; poster and video requests contact their respective hosts. These services have their own behavior and policies. Blocking selected DNS names does not establish the absence of all telemetry or ads.
- An optional catalog key is stored locally by the app and sent to its fixed catalog endpoint as an HTTPS header. A password input is not encrypted-at-rest secret storage. Do not share browser storage, TV databases, or a profile containing a key.
- External players run in cross-origin frames. The parent bridge validates its expected source/origin and message shape, but the project does not audit or control every external service, film, or advertising behavior.

## Safe troubleshooting

Use placeholders in public examples. Remove serial numbers, DUIDs, MACs, private addresses, SSIDs, tokens, certificate paths containing personal names, and player query strings before sharing diagnostics. A screenshot may contain these even when the visible error looks harmless.

If a real secret is exposed, revoke or rotate it at its issuer. Deleting a file or rewriting history does not invalidate a credential already copied elsewhere. Report the location and credential type without repeating the value.

Do not weaken certificate checks, disable security services, expose developer ports publicly, or run a guessed bulk-disable list as a fix for an app installation problem. Use the documented before-state and [rollback](tv/docs/rollback.md) for the specific verified system procedures.

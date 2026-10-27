# Changelog

Repository maintenance and the installed app have separate verification histories. A documentation/tooling change does not imply a new TV app installation or hardware test.

## Device documentation - 2026-10-27

- Add an independently inspected QE75Q74DATXXN / T-NKM2DDEUC-0090 / 2123.9 case with a separate closed evidence profile/schema.
- Preserve the original Q64D profile, schema and native app results.
- Record the Q74D's two targeted application flags, retained HbbTV/Bixby companion, existing 5 GHz/consent state and language, DNS, startup and canalysis changes checked after a full software reboot. Both temporary root sessions were closed and cleanup was verified; video playback and native own-app installation remain untested on this device.

## 0.2.7 - 2026-10-27

- Restore remote focus after an empty or failed search without overriding subsequent navigation.
- Cancel catalog search/ID lookups on key replacement or removal, and reject stale cache writes from earlier clients.
- Check staged Git blobs separately from working files before publication, including staged files removed or cleaned locally.
- Preserve the TV-tested 0.2.6 source in an immutable runtime snapshot; validate the exact fingerprint file set.
- Add a pinned browser-test dependency, automatic ephemeral-server runner and six-suite browser verification in CI.
- Pin dependency downloads to the public npm registry with verified SHA-512 integrity and portable-install checks.
- Use SHA-pinned official CI actions running on Node.js 24.

This source revision is browser-verified. It has not been installed or tested on a TV; the last recorded native build remains 0.2.6.

## 0.2.6 - 2026-10-27

Initial public release of the TV documentation and application source.

- Consolidated the public documentation and report narratives into English.
- Added installation/signing instructions, a coverage map, review record, contribution/security policies and issue forms.
- Added offline repository checks, native runtime fingerprints, runtime-only unsigned packaging and CI.
- Hardened source/ZIP integrity validation and isolated optional browser-test reports from committed evidence.
- Added regression coverage for verification tools, schema constraints and filesystem alias handling.
- Preserved all 11 runtime files of the verified app 0.2.6 without modification.

- Excluded private signing material, device/network identifiers, raw research sessions, firmware/SDK/root binaries and media.

See [review scope](docs/REVIEW.md) for validation details and remaining limits.

## Recorded TV app development - 2026-10-26

| Version | Main change / verification boundary |
|---|---|
| 0.2.1 | SDK installation made the app visible in Apps; Home pinning and launch were verified |
| 0.2.2 | Exact allowed CDN origins were added; one Collaps source reached real playback |
| 0.2.3 | Parent remote controls for play/pause/seek/resume and Back were verified; own RU/EN keyboard was tested |
| 0.2.4 | Real audio menu integrated; physical-remote Ukrainian track selection and continued playback were verified |
| 0.2.5 | Manual Watched collection, app-restart persistence and own-keyboard checks; optional catalog behavior tested with fixtures |
| 0.2.6 | Useful keyless Home; physical navigation, Watched persistence, and real Russian/English title search verified on TV |

These entries summarize the recorded case, not a guarantee for every film/provider or a full OS-reboot test for each version. [Native evidence](app/NATIVE-STATUS.json) and [app validation](app/VALIDATION.md) retain the distinctions.

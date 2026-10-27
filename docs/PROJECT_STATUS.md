# Project status and coverage

This coverage map separates the original QE75Q64DAUXXN observations on October 26, 2026 from a QE75Q74DATXXN configuration session on October 27. Both reported Tizen 9.0 and numeric firmware 2123.9, with different firmware families. The original profile/schema and native app evidence remain unchanged.

The [Q74D results](../tv/docs/q74d-results.md) include a full software OS reboot with changed boot identity and fresh readbacks for Russian OSD, both selected DNS resolvers, two exact application flags, the individually checked canalysis guard and startup controls. Both temporary root sessions were closed with staging cleanup and unchanged original system-file hashes. Wi-Fi was already 5 GHz, two privacy consents were already unchecked, HbbTV and the different Bixby-related `iacr` package were preserved, and the final SDK app list remained at 20. No Q74D own-app installation, actual video playback, stock Russian keyboard fix or measured acceleration is claimed.

The table below preserves the original Q64D's successful changes and useful negative findings. An unverified capability is not a supported recipe; its per-device results do not transfer automatically to the Q74D.

Current development source is 0.2.7, with browser-regression fixes for search focus and optional-catalog cancellation. Native observations below remain scoped to 0.2.6 and earlier builds. The exact native 0.2.6 runtime is preserved in the [reference snapshot](../evidence/native-0.2.6/README.md); no new TV installation was performed for this source revision.

| Area | Documentation and evidence | Result or remaining limit |
|---|---|---|
| Identify the TV and available access | [Model profile](../tv/profiles/qe75q64dauxxn-tizen9-2123.9.json), [SDK](../tv/docs/sdk-and-app.md), [root](../tv/docs/root-capabilities.md) | Exact model/build scope; temporary root and normal SDK operations distinguished |
| Understand Developer Mode | [Installation](installation.md), [SDK results](../tv/docs/sdk-and-app.md) | Own signed-app installation/debugging works without root; developer mode is not full system access |
| Performance and telemetry evaluation | [Validation](../tv/docs/validation.md), [limitations](../tv/docs/limitations.md) | Short CPU/RAM samples do not isolate tracking overhead or establish comparable interface-performance benchmarks |
| Reduce optional tracking/ads | [Verified procedures](../tv/docs/verified-recipes.md), [rollback](../tv/docs/rollback.md) | Four exact disable flags, canalysis vendor guard and filtered DNS verified; no claim of removing every tracking path |
| Privacy choices and startup behavior | [TV findings](../tv/README.md), [validation](../tv/docs/validation.md) | Viewing/interest-ad consents were manually disabled and saved; TV Plus autorun was disabled; not every consent flag was independently reread |
| Remove unwanted apps / storage | [TV validation](../tv/docs/validation.md), [limitations](../tv/docs/limitations.md) | Nineteen unused applications were manually removed. Free storage is distinct from free RAM; browser-history recovery was not validated |
| Improve Wi-Fi/DNS | [Procedures](../tv/docs/verified-recipes.md), [rollback](../tv/docs/rollback.md) | 5 GHz and both chosen resolvers survived a software OS reboot; no BSSID pin, speed guarantee or router-wide change |
| Russian TV menus | [Language recipe](../tv/docs/verified-recipes.md) | Russian OSD verified after software reboot; this does not change Smart Hub country or every web-delivered service page |
| Russian stock keyboard | [Native IME findings](../tv/docs/native-ime.md) | Resources/preferences were investigated, but stock soft-keyboard Russian input was not achieved; temporary experiments were cleaned up |
| Russian/Ukrainian Samsung TV Plus channels | [Limitations](../tv/docs/limitations.md) | A supported regional channel switch was not established. Home tile removal and autorun changes do not uninstall all TV Plus registrations |
| HbbTV | [Procedures](../tv/docs/verified-recipes.md), [rollback](../tv/docs/rollback.md) | The exact package was disabled; interactive broadcast features were outside the retained feature set |
| Tizen 10 | [Limitations](../tv/docs/limitations.md), [sources](../tv/docs/sources.md) | No supported upgrade for this exact unit was verified at the research date. Root does not supply compatible signed firmware |
| Preserve normal viewing and PS5 | [Remaining checks](../tv/docs/validation.md) | Official apps and shared frameworks retained. Full post-change Netflix/Apple TV DRM, audio and PS5 HDR/HDMI regression is still open |
| App installation and Home icon | [Installation](installation.md), [app native evidence](../app/NATIVE-STATUS.json) | Own signed 0.2.6 installed and normally launched; Home icon placement tested in earlier updates |
| Movie search and posters | [App validation](../app/VALIDATION.md) | Real Russian and English queries returned the same film on TV; posters loaded. Wikidata coverage is incomplete |
| Multiple providers / voices | [App design](../app/DESIGN.md), [validation](../app/VALIDATION.md) | Shared URLs are deduplicated; real Collaps audio choices and one Ukrainian track were tested, not all providers/films |
| Convenient keyboard and remote controls | [Quick start](../QUICKSTART.md), [app validation](../app/VALIDATION.md) | Own RU/EN keyboard and parent playback controls tested. These do not fix the stock keyboard in other apps |
| Favorites / Recent / Watched | [App documentation](../app/README.md), [native evidence](../app/NATIVE-STATUS.json) | Manual marks, collection, focus and app-restart persistence verified; Recent is an opening history, not viewing proof |
| New releases / genres / ratings | [App documentation](../app/README.md) | Optional catalog adapter has fixture tests. Keyless mode is the default configuration; live feeds are disabled and authenticated TV requests remain untested |
| Reproducible public project | [Repository review](REVIEW.md), [contributing](../CONTRIBUTING.md) | English documentation, source fingerprints, offline checks, runtime-only packaging, CI, installation and issue guidance |
| Source 0.2.7 hardening | [App validation](../app/VALIDATION.md), [regressions](../app/runtime-fixes-verification.json) | Empty/error search focus and key-change lookup cancellation fixed with isolated browser regressions; no new native compatibility claim |
| Cleanup / persistence boundaries | [TV validation](../tv/docs/validation.md), [app native evidence](../app/NATIVE-STATUS.json) | Temporary root, owned virtual input devices and inspection ports were closed/removed. Full power-loss, firmware-update and 0.2.6 OS-reboot persistence are not established |

## Deliberately not performed

No blanket debloat, service-name-based removal, DRM/security-framework removal, system-partition remount, cross-model firmware flashing, permanent boot-root, routine cache flushing, memory-killer service or replacement of the official Premium YouTube app was used. No evidence justified those changes.

Private low-level dumps and local backups are not a distributable recovery image. They remain outside Git. The public notes retain the procedures, rollback prerequisites, normalized observations, primary references and explicit gaps needed to understand the result.

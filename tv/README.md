# Samsung Tizen TV notes

Configuration results for two separately inspected Samsung 2024 models. Both reported Tizen 9.0, ARMv7 and Linux 5.4.249; their firmware families, installed packages and selected changes differ.

| Device | Exact firmware | Observation and scope |
|---|---|---|
| [QE75Q64DAUXXN profile](profiles/qe75q64dauxxn-tizen9-2123.9.json) | T-NKLDDEUC-0090 / 2123.9 | October 26, 2026: original reboot-checked system changes and later native app/IME investigation |
| [QE75Q74DATXXN profile](profiles/qe75q74datxxn-tizen9-2123.9.json) | T-NKM2DDEUC-0090 / 2123.9 | October 27, 2026: [separate reboot-checked configuration case](docs/q74d-results.md), both temporary root sessions closed and cleanup verified |

Other models and builds are unverified. A second model's inspection is not a general compatibility certification.

This documentation is part of [Samsung Tizen Detox](../README.md), alongside the original [Kino Doma app source](../app/README.md).

## Original Q64D system results

These specific results survived a full software OS reboot, confirmed by a changed boot identifier:

| Change | Confirmation |
|---|---|
| Russian OSD | Typed VCONF readback and the actual Home/settings interface |
| 5 GHz Wi-Fi | Reconnected at 5560 MHz without a persistent access-point lock |
| Both AdGuard Default DNS resolvers | 94.140.14.14 and 94.140.15.15 remained in the active configuration |
| HbbTV, ACR, targeted-ad-service, Samsung Analytics | Global disable flags remained set for four exact app IDs; their processes were absent |
| canalysis | The owned marker persisted; its process was absent and the stock unit was unchanged |

Temporary root was reacquired after that reboot. Persistent boot-root was not installed. The final temporary root session was later closed. Power removal and firmware-update persistence were not tested.

## Q74D differences

The Q74D already used 5 GHz Wi-Fi, and both inspected privacy-consent checkboxes were already unchecked. Russian OSD, both chosen DNS resolvers, two exact global application-disable flags, the individually checked canalysis guard and startup controls survived the checked software reboot. HbbTV and `com.samsung.tv.iacr` were preserved; `com.samsung.tv.acr` was absent. A different media-analytics service also remained present. Read the [Q74D case](docs/q74d-results.md) before transferring any Q64D procedure. Its own-app installation, actual video playback and stock Russian keyboard have not been tested.

## Q64D Kino Doma, SDK and keyboard input

The installed **Kino Doma 0.2.6** Tizen Web app has a working Home icon immediately after YouTube. Ordinary use of the installed app does not require a running Mac preview server.

- Earlier app tests verified real playback, pause, seek, resume and Back with a remote. Version 0.2.4 verified physical-remote selection of one Ukrainian audio track and continued playback in one player. This is not a promise about every film, track or provider.
- Versions 0.2.5 and 0.2.6 verified manual Watched marking, app-restart persistence and the separate Watched collection. Version 0.2.6 also verified return to the selected card, three clearly labelled starter cards and actual Russian/English title search. The test mark was removed. An app restart is not an OS-reboot test for 0.2.6.
- The SDK channel installed/updated, launched, debugged and stopped a correctly signed own WGT **without root**. CDP captured that app's Web viewport; it did not capture the entire native TV interface.
- **The stock Samsung Russian on-screen keyboard remains unresolved.** Russian OSD/preferences and Kino Doma's own RU/EN keyboard are separate results. The temporary all-languages flag was restored to false and the owned virtual input devices were removed.

The default configuration uses keyless mode. Automatic current-release, genre and rating feeds are disabled; starter and personal cards are not presented as live rankings. The optional PoiskKino adapter has no configured key and no verified authenticated request. The provider's published Demo quota was 200 requests/day and up to 10 pages on the observation date; [dated sources](docs/sources.md#catalog) describe its limits.

Read [SDK/app results](docs/sdk-and-app.md) and [native IME findings](docs/native-ime.md) for the separate test stages.

## Using these notes

1. Compare the exact model/build and evidence stage with the appropriate sanitized profile in the table above.
2. Read the [root boundaries](docs/root-capabilities.md) and [limitations](docs/limitations.md). SDK access is not a root shell.
3. Select one [system procedure](docs/verified-recipes.md). Save its original typed values, flags and runtime state privately before changing it.
4. Prepare the [rollback](docs/rollback.md), then verify the result independently using the [validation guide](docs/validation.md).

If a prerequisite differs, the procedure needs new investigation. Do not copy another TV's enums, network identifiers or marker contents. Obtaining root is a separate state-changing action through the [pinned upstream method](docs/sources.md#root); its probe is not a read-only check.

Official YouTube Premium, Netflix, Apple TV, Browser, Home, the store, keyboard, audio and HDMI/PS5 components were retained. Shared DRM/account/package/audio/display/network frameworks were not disabled. A full post-change streaming/PS5 regression is still outstanding. No measured speedup, universal ad blocking or complete telemetry elimination is claimed.

## Public evidence and licensing

The [original strict schema](schemas/public-evidence.schema.json) accepts only the reviewed Q64D snapshot. The [separate Q74D schema](schemas/q74d-evidence.schema.json) fixes that device's own reboot, cleanup and remaining functional-check evidence. Neither is a general compatibility database. New facts or models require a deliberate schema change and review. Do not add raw sessions, databases, credentials, network identifiers, viewing history or unreviewed screenshots.

`MANIFEST.sha256` covers the documentation files. `PUBLICATION-CHECK.json` describes the local documentation checks and their limits; neither certifies the firmware or the whole repository. This subtree contains no installer, payload, WGT, SDK, firmware, certificates, keys or third-party source tree. App source lives separately in [app/](../app/README.md).

Original materials are [MIT](LICENSE). [Third-party sources retain their licenses](THIRD_PARTY_NOTICES.md). This is an independent project, not endorsed by Samsung or the referenced services. The documentation was inspired by Android TV Detox; its ADB/APK instructions do not apply to Tizen.

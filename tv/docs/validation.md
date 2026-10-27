# Interpreting and validating the results

Evidence levels apply to a single action and exact configuration:

| Level | Requirement |
|---|---|
| `research` | A primary source or another model's report; execution here is not claimed |
| `observed` | A readback from the specified TV; missing/unknown values are not silently changed to false |
| `applied` | A write followed by a fresh independent readback; session checks are identified |
| `reboot-checked` | The stated checks repeated after the specified kind of reboot |

One maintainer-observed device is not independent reproduction across a model range. The public profile is a sanitized summary, not raw logs or a complete test transcript.

## Device-specific stages

The original Q64D profile below preserves the October 26 stages. The separate [Q74D case](q74d-results.md) and [profile](../profiles/qe75q74datxxn-tizen9-2123.9.json) record October 27 software-reboot readbacks for Russian OSD, DNS, two global app flags, canalysis and startup controls. Its firmware family and package selection differ. Both temporary sessions were closed and their cleanup was verified. Neither device's untested capabilities inherit the other's results.

The Q74D comparison recorded 900 loaded units/seven failed before and 905 loaded units/six failed after reboot. All six after failures already existed before; no new failed unit was found. The different `media-analytics-service` was no longer failed and remained preserved. These counts do not establish causality, a performance gain or removal of all analytics. HTTPS 200 from YouTube/Netflix/Apple TV before and after reboot, plus a pre-reboot YouTube Premium interface check, are separate from actual video/DRM/audio playback.

## Original Q64D system reboot results

- A full software OS reboot was confirmed by a changed boot identifier; the identifier itself is excluded.
- Temporary root was reacquired after boot.
- The Russian locale and actual Russian interface persisted; Wi-Fi returned to 5560 MHz and both DNS resolvers persisted.
- Four exact app IDs retained global disable flags and their corresponding processes were absent.
- The canalysis marker persisted, its stock unit hash was unchanged and its process was absent.

The disable flag, runtime stop and next-boot result are distinct checks. A package-manager exit code alone is insufficient. See the [procedure prerequisites](verified-recipes.md) and [rollback conditions](rollback.md).

## Later checks, separate from the OS reboot

- Kino Doma 0.2.6 was installed; its Home icon immediately after YouTube launched it successfully.
- SDK channel 0 installed/updated, launched, debugged and stopped the own signed app; CDP captured its viewport without root.
- Earlier versions verified real remote play/pause/seek/resume/Back. Version 0.2.4 verified a physical Ukrainian-track selection, changed track label and continued video.
- Version 0.2.5 verified physical-remote Watched marking, app-restart persistence and the collection; the test mark was removed. Eight software/browser checks also passed.
- Version 0.2.6 verified three starter cards, hidden unavailable online feeds, physical D-pad/detail actions, restored card focus, repeated Watched marking and app-restart persistence. The test mark was removed. Actual Russian and English searches passed without error.
- The stock Russian IME remained unresolved. Its transient flag was restored to false and owned virtual devices were removed with readback.
- The default configuration uses keyless mode. The optional authenticated catalog was not enabled; live current-release/rating/genre feeds were not claimed.
- Final 0.2.6 diagnostics ended: debug stopped, port closed, owned forwards removed and normal launch succeeded. All three Home posters loaded without visible errors or an iframe; no catalog API request was observed in that check. Temporary root was closed.

See the [SDK/app chronology](sdk-and-app.md) for the exact scope. No later app test is relabelled as an OS-reboot result.

## Remaining functional checks

- Actual Netflix/Apple TV film playback, DRM license, audio and seek after all changes.
- YouTube, Browser/stock input, other players/tracks and sustained playback after all changes. One successful player test is not complete regression coverage.
- PS5: real HDMI/HDR handshake, picture, audio, Game Mode, Input Signal Plus and CEC.
- Power removal, update persistence and repeated long standby/wake cycles.
- Interface speed under matched conditions with repeated samples; measure network and application performance separately.

HTTP 200, exit code 0, app launch, a registry flag, an absent process and successful playback are different results. None substitutes for the others.

## Coverage and numerical limits

The audit read 479 registrations: 24 onboot, 52 autorestart and 324 preload flags. These flags can overlap and are not a count of running processes. Loaded systemd units numbered 880 before reboot and 877 after. The before snapshot contained seven failed units; the after snapshot contained six, all of which were already failed before. The profile's `preexisting_failed_units=6` counts that overlap, not the total before reboot. These snapshots establish no cause for a failure or change in failure state. System journal files were not found in the inspected locations, which does not prove that every log facility was absent.

Only six dependency entries were recorded in the registry. This incomplete graph does not justify treating other components as independent; shared frameworks were retained.

CPU was 9.16% in a five-second sample before reboot and 22.55% in a different post-boot sample. The conditions differ, so these values prove neither acceleration nor deterioration. Different MemAvailable snapshots are not a before/after benchmark. These observations do not isolate tracking overhead, establish RAM recovery or demonstrate a fixed responsiveness improvement.

## Public documentation checks

Before publishing new evidence, check its exact per-device schema, private-data patterns, links, manifest and the files themselves. The [original schema](../schemas/public-evidence.schema.json) and [Q74D schema](../schemas/q74d-evidence.schema.json) deliberately fix separate reviewed snapshots. Extra fields, raw logs, screenshots, databases and keys are excluded. Schema checks are not a substitute for checking new observations.

`PUBLICATION-CHECK.json` records local documentation checks. Source pins identify the referenced versions; external links and vendor terms can still change. Documentation checks do not certify the firmware, fully audit the application or reproduce the TV session.

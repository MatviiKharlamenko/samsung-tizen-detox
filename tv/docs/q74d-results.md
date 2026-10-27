# QE75Q74DATXXN results

Observed on October 27, 2026: **Samsung QE75Q74DATXXN (2024), Tizen 9.0, ARMv7, Linux 5.4.249, firmware T-NKM2DDEUC-0090 / 2123.9**. The numeric firmware version was read independently from the actual About TV interface. The reported platform was `24_NKM2_QTV_T09`; the software build identifier was `T-NKM2DDEUC-0090-REL-202603190159`.

The [separate sanitized profile](../profiles/qe75q74datxxn-tizen9-2123.9.json) records this device. It does not extend the original Q64D profile to a different model. **The selected changes were checked after a full software OS reboot, confirmed by changed boot identity. Both temporary root sessions were then closed and their cleanup was verified.** No power-removal, firmware-update, complete playback or performance comparison is claimed.

## Access and baseline

Developer Mode and the SDK connection worked. The capability response reported plugin `3.8.11_TV_REL`, ARMv7/32-bit and Tizen 9.0. Ordinary interactive shell, root toggles and the SDB root permission were disabled; package debug and .NET debug capabilities were enabled. Empty responses to shell identity and a broker version request did not establish shell access or a firmware version.

A separate temporary root session subsequently reported UID/EUID/GID/EGID 0, .NET 6, effective capabilities `0000003fffffffff`, SMACK label `User` and seccomp mode 0. Root was reacquired after the software reboot for fresh readbacks. This is a separate result from Developer Mode. No persistent boot-root was installed. Kernel privileges do not establish a firmware-signature, DRM, TEE or universal SMACK bypass; see [root boundaries](root-capabilities.md).

The initial systemd inventory contained 900 loaded units and seven failed units. After reboot it contained 905 loaded units and six failed units, all already failed before; there were no new failed units in that comparison. `media-analytics-service` was no longer failed. No cause was inferred for the changed counts or service state. The SDK app list contained 20 entries initially and again after the final root cleanup. This is an SDK list count, not the count of every registered application/service or a measure of running processes.

## Changes checked after the software reboot

| Target | Before | Result and evidence |
|---|---|---|
| System language | Existing String `db/menu_widget/language=en_GB.utf8`; `ru_RU.utf8` installed | The String remained `ru_RU.utf8`; the actual native startup/settings interface remained Russian |
| DNS | Automatic ISP-provided resolvers | Both AdGuard Default resolvers, `94.140.14.14` and `94.140.15.15`, remained in the manual active configuration and effective resolver readback |
| Targeted-ad app | `com.samsung.tv.targeted-ad-service` global disable flag false | Global disable flag remained true; per-user override rows remained absent and the target process was absent |
| Samsung Analytics | `com.samsung.tizen.samsung-analytics` global disable flag false | Global disable flag remained true; per-user override rows remained absent and the target process was absent |
| canalysis | Matching vendor guard; marker absent | Owned marker persisted with matching hash/metadata; unit inactive/dead, MainPID 0, ConditionResult false and process absent; stock unit unchanged |
| Startup | Smart Hub Home and Samsung TV Plus autorun on; Last App and Multi View Mirroring off | All four controls remained off, confirmed in the actual native startup interface |

DNS returned sinkhole answers for `config.samsungads.com` before and after reboot. YouTube, Netflix and Apple TV hostnames resolved and HTTPS requests returned 200 in both stages. Resolution and HTTP status are not proof of successful streaming playback, DRM or audio. DNS filtering also does not prove that local recognition computation stopped or all advertisements disappeared.

The two application flags are persistent configuration writes; the flags, per-user state and corresponding process absence were checked separately after reboot. A different `media-analytics-service` remained present and was preserved. These two results do not establish removal of every analytics or recognition component.

### canalysis guard verification

The actual unit `/usr/lib/systemd/system/canalysis-service.service` had SHA-256 `71aee4ce76c4addf3a5f6b28ce0378995d265b60d66c5bc3f9d34ad6e5b26c98` and the existing negative condition `ConditionPathExists=!/opt/usr/share/systemd/system/canalysis-daemon`. This was checked on the Q74D itself rather than inferred from the matching Q64D hash.

The marker did not exist before this operation. The owned replacement was 54 bytes, SHA-256 `6f96d534fb01c2cb98b9da764cb0f522318c6b44c876b0d4e2dc887bab05592e`, mode `0644`, owner `root:root`, SMACK label `User`. Its operation-specific contents remain in the private rollback record. The marker controls future starts; the separate StopUnit call handled the current process. After reboot its hash/metadata matched, the unit was inactive/dead with MainPID 0, ConditionResult false and NRestarts 0, and its process was absent. The stock unit hash was unchanged.

## Observations that did not require a change

- Wi-Fi was already using **5 GHz at 5540 MHz**, reported signal -53 dBm and link rate 433 Mbps. After reboot it automatically remained at 5540 MHz, -54 dBm and 433 Mbps. No roaming command or persistent access-point lock was applied. A negotiated link rate is not measured internet throughput.
- The individual viewing-information and interest-based advertising dialogs already showed their consent checkboxes unchecked. Their existing opt-out state was visually confirmed; it was not newly disabled during this work.
- **HbbTV was preserved.** The original Q64D's HbbTV decision was not copied to this device.
- The Q64D app ID `com.samsung.tv.acr` was absent. A different package, `com.samsung.tv.iacr`, was present; its manifest described a Bixby companion with media and TV-search actions. It was preserved. A similar name does not prove the same purpose or dependencies.
- The SDK app list remained at 20 entries. No mass uninstall or routine Clear Data operation was used for this configuration.

These differences are why the original four-app Q64D disable list is not a universal Samsung recipe. The Q74D session changed exactly two global application-disable flags.

## Recovery and remaining validation

The saved original String, automatic DNS mode/current service, global flags and unit/marker state are kept privately. Restore the selected target's own previous state using the [rollback rules](rollback.md); do not copy the first TV's network identifiers or baseline.

For the two app flags, enabling the exact app globally is an inverse only because its saved global flag was false before this operation. Do not invent or reset per-user overrides. Remove the canalysis marker only when its owned content/hash and metadata match the saved operation; restart the service only to restore its previous runtime state. Startup rollback returns only the two changed controls to on; the controls that were already off remain off. The privacy checkboxes were already unchecked and require no inverse change.

Both temporary root sessions were closed, owned staging cleanup succeeded, and the original password-file and genuine SDB public-key hashes were unchanged at both cleanups. The transfer receiver was closed. A final ordinary SDK read still showed the root capability flags disabled and 20 listed apps. Access cleanup does not undo the saved configuration changes above.

Before reboot, the native YouTube Premium app launched and its loaded recommendations were visually inspected. An actual video was not played as a validation test. This is an app-launch/interface check, not video, audio or DRM coverage.

The following remain separate validation steps:

- Real YouTube, Netflix/Apple TV DRM playback and audio, Browser/stock input, HDMI/HDR/audio and standby/wake checks.
- A stock Russian soft-keyboard test; Russian OSD does not establish Russian keyboard input.
- Any Kino Doma signing, installation, Home-icon, playback or remote-control tests on this device. Earlier app results belong to the Q64D.
- Comparable repeated performance measurements, power-removal persistence, firmware-update persistence and a complete telemetry traffic audit.

No supported Tizen 10 update was established for this unit, and no firmware update or cross-model flash was performed. The [source references](sources.md) explain mechanisms; the device-specific readbacks above establish the scope of this result.

# Verified procedures for one Q64D

Tested configuration: QE75Q64DAUXXN, Tizen 9.0, ARMv7, Linux 5.4.249, firmware 2123.9. The specific system results below were rechecked after a full software OS reboot. This was not a power-removal test or a complete media regression.

The later [Q74D case](q74d-results.md) has separate software-reboot readbacks and a different selection of retained/disabled packages. Its firmware family is T-NKM2DDEUC rather than T-NKLDDEUC. Only two application flags were changed there; HbbTV and the different Bixby-related `iacr` package were preserved. Read the exact case rather than treating the Q64D list as universal.

These commands require an already established root context with the stock-user mapping used by the tested archive route. SDK channel 0 alone is insufficient. The historical root session is now closed; this repository does not provide a running agent.

`SAVED_NETWORK_SERVICE`, `OWN_AP_BSSID`, `SAVED_APP_ID` and `SAVED_MARKER` stand for your own locally recorded values. They are not ready-to-use arguments. Do not publish their substituted values.

Before each change, save the original typed value, global/per-user flags, relevant runtime/unit state and the inverse operation. Change one target, then obtain an independent readback and check essential functions. Stop if the model, tool or prerequisite differs. See [rollback](rollback.md) and [validation](validation.md).

## Russian OSD

Prerequisites: the installed system already contains `ru_RU.utf8`, and `db/menu_widget/language` exists with type String. The original value on the tested TV was `en_GB.utf8`; read your own original value instead of assuming it matches.

```sh
vconftool get db/menu_widget/language
vconftool set -f -t string db/menu_widget/language ru_RU.utf8
vconftool get db/menu_widget/language
```

Inspect the actual Home/settings interface. A successful VCONF write without the expected interface change is not a successful result. Both the typed value and Russian UI persisted after the software reboot. Store region and firmware were not changed. Roll back by setting the saved original String and checking the screen again. This procedure does not install locale files or enable a Russian stock keyboard. See [system-settings sources](sources.md#tizen).

## Both DNS resolvers

Record the active Connection Manager service, its existing resolver mode, `Nameservers.Configuration` and the effective resolvers. Select the current Wi-Fi service; do not copy another TV's service identifier. Keep a working way to select the network through the normal TV interface.

The tested write was:

```sh
connmanctl config SAVED_NETWORK_SERVICE --nameservers ipv4.manual 94.140.14.14 94.140.15.15
```

Read the active service configuration and effective `/etc/resolv.conf`, then test DNS from the TV and the required services. Both resolvers persisted after reboot. Fixing the fallback in the service configuration is different from editing only the generated `resolv.conf`. Restore your saved resolver mode and list to roll back; do not substitute an arbitrary public DNS service for the original configuration.

DNS does not guarantee removal of all ads or show that local ACR computation stopped. A failed external player alone is not proof that a blocked hostname is required media; investigate its role before changing DNS policy.

## 5 GHz Wi-Fi

Privately match the active network to visible access points using frequency, signal and BSSID. Confirm that the chosen point belongs to the intended network. A targeted `wpa_cli roam OWN_AP_BSSID` to an available 5 GHz point was tested, followed by WPA `COMPLETED` and a frequency readback of 5560 MHz.

After the software reboot, the TV reconnected at 5560 MHz without a persistent BSSID lock. This is one successful reconnect, not a guarantee of future band selection or measured throughput improvement. To return, select the previous available connection normally or roam to the saved owned access point; its availability may have changed.

## Four targeted global app-disable flags

| Function | Verified app ID |
|---|---|
| HbbTV | `org.tizen.hbbtv` |
| ACR | `com.samsung.tv.acr` |
| Targeted advertising | `com.samsung.tv.targeted-ad-service` |
| Samsung Analytics | `com.samsung.tizen.samsung-analytics` |

Confirm that the exact app ID is installed. Record its original global and per-user disable flags and whether its process is running. Process one app ID at a time:

```sh
pkgcmd -D -t app -n SAVED_APP_ID --global
```

**Disable and stop are separate actions.** The package-manager flag does not establish that an existing process ended. In the recorded session, running targets were stopped separately and the final result was verified again after reboot. This page does not prescribe an unverified universal stop command. If an already running target remains, report the change as incomplete until an exact supported stop method or a separately planned reboot has been verified.

Read the registry independently. On this build, the global field is `package_app_info.app_disable` in `/opt/dbspace/.pkgmgr_parser.db`; user-specific overrides also require checking. The [pinned registry implementation](sources.md#vetro) documents the separate global/per-user reads. Use read-only queries, restrict them to the intended app ID, and keep user IDs/private paths out of public reports. A missing table or schema difference is a reason to stop, not to create or edit it.

After the software reboot, all four global flags were `app_disable=true` and their corresponding processes were absent. The components remain installed. Disabling HbbTV intentionally removes its interactive broadcast features; the ACR result concerns this app ID, not every recognition or telemetry component.

If the package manager returns unsupported/error or the flag does not change, do not work around it with direct SQL writes. Do not copy HbbTV numeric VCONF enums from another model. See [registry/HbbTV sources](sources.md#vetro).

The inverse is `pkgcmd -A -t app -n SAVED_APP_ID --global` **only when the saved global flag was enabled before this operation**. Do not overwrite unrelated per-user state. Restart only a target that was previously running, if required to restore its original runtime state, and check the registry and affected function again.

## canalysis: the exact vendor guard

On the tested firmware:

- Stock unit: `/usr/lib/systemd/system/canalysis-service.service`
- Stock unit SHA-256: `71aee4ce76c4addf3a5f6b28ce0378995d265b60d66c5bc3f9d34ad6e5b26c98`
- Negative condition: `ConditionPathExists=!/opt/usr/share/systemd/system/canalysis-daemon`

Read the unit and hash first. Confirm this exact condition and save the unit's original runtime state plus the marker's existence/content/hash/owner/mode/label. Never overwrite a pre-existing marker. The recorded operation created an owned marker with unique contents and a saved hash, then called systemd D-Bus `Manager.StopUnit` for `canalysis-service.service` with mode `replace`.

The condition prevents a future start when the path exists; it does not stop a process already running. Do not rewrite the stock unit or copy another operation's marker contents. After reboot, the marker remained, the process was absent and the stock unit hash was unchanged. Verification must include unit state, MainPID/ConditionResult and the exact process; an accepted StopUnit job alone is insufficient.

Rollback removes only the marker created by this operation, after its contents/hash and ownership match the saved record. StartUnit is appropriate only if it restores the previous running state. A similar guard was researched on another model in [Couchroot](sources.md#couchroot); this result was checked against the Q64D unit itself.

## An experiment that did not become a recommendation

A targeted StopUnit for `contents-recognition-service` worked during the session. A persistent mask attempt through MaskUnitFiles returned `EROFS` because the system path was read-only. No persistent override was installed; StartUnit restored the service, which was active with its process present.

This is a negative research result, not a disable recipe. No system remount, unknown boot daemon or blanket mask is recommended. Voice-app/client, ondevice-voice and shared services were retained. Neither their presence nor stopping a different ACR component proves recording or the absence of all telemetry.

## Separate later stages

Own-WGT SDK operations, native playback/audio/Watched tests and the unresolved stock IME are described in [SDK/app results](sdk-and-app.md) and [IME findings](native-ime.md). They were later stages, not part of the earlier full OS-reboot check or additional system debloat.

# Rolling changes back

Before changing a target, save its original state privately: model/build, typed values, global/per-user flags, process/unit state, unit definition/hash, marker existence/content/hash/owner/mode/label and the planned inverse. Keep local state files owner-readable only (0600). These records do not belong in a public issue.

Rollback restores **the selected target's previous state**. Enabling everything is not a rollback. If the original state is unknown, an automatic inverse is not justified.

The inverse procedures below are conditional recovery instructions. A complete rollback/reapply cycle for every retained system change was not performed; they must not all be described as exercised rollback tests. The rejected persistent mask and temporary IME/input experiments did have the specific restoration/cleanup checks described below.

## System changes

| Change | Inverse and preconditions |
|---|---|
| Russian OSD | Set the saved original String through the same existing VCONF key; read it back and inspect the actual interface. The tested original locale was `en_GB.utf8`, which is not a default for every TV. |
| DNS | Restore the saved `Nameservers.Configuration` and resolver mode on the correct active service; verify effective resolvers, DNS and playback. Preserve the distinction between the original automatic and manual modes. |
| Wi-Fi roam | Return to the saved, still-available connection; retain normal TV network selection as a recovery path. The old access point or signal may have changed. |
| Global app-disable | Use `pkgcmd -A -t app -n SAVED_APP_ID --global` only if this operation changed a previously enabled global flag. Read global/per-user state independently; do not reset unrelated overrides. Start only a previously running target and verify its function. |
| canalysis marker | Remove only the marker created by this operation after its saved contents/hash and ownership match. Preserve any pre-existing marker. StartUnit only if the service previously ran, then check unit state and the exact process. |
| Temporary root | End the access tool's session and perform its documented cleanup. This closes access; it does not undo saved system changes. |

For OSD, the inverse has the same typed form as the original write:

```sh
vconftool set -f -t string db/menu_widget/language SAVED_ORIGINAL_LOCALE
vconftool get db/menu_widget/language
```

`SAVED_ORIGINAL_LOCALE` is a placeholder for the String read before the change. Do not execute it literally. DNS restoration likewise depends on the saved service/mode/list; no universal automatic-mode command is asserted for other vendor builds.

An enabled flag is separate from runtime state. Conversely, ending a process is not a persistent disable. Restore both only to the extent needed to reproduce the saved state. The canalysis guard similarly controls future starts; StopUnit/StartUnit control runtime state.

After a timeout, read the actual state first: the operation may have completed. Do not repeat writes blindly. If the firmware, unit hash, marker or registry changed since the record was made, investigate that drift before overwriting anything.

Do not restore an entire old package database over a live registry to undo one flag. Copying an active SQLite file does not guarantee a consistent backup. If a database backup is needed, use a consistent SQLite backup method and verify it independently; keep it private.

## Q74D rollback scope

The [Q74D case](q74d-results.md) keeps a separate original-state record. Its locale changed from `en_GB.utf8`, DNS changed from automatic mode, and exactly two previously enabled global applications received disable flags. Its HbbTV and Bixby-related `iacr` package were preserved and have no disable operation to reverse. Wi-Fi required no band change, and privacy consents were already unchecked.

For startup controls, only Smart Hub Home and Samsung TV Plus autorun changed from on to off. Last App and Multi View Mirroring were already off; rollback must preserve that original state. Its owned canalysis marker differs from the first device's marker and must be matched to its own saved record. These are conditional inverse instructions, not a completed rollback/reapply test.

## App and IME experiments

The temporary all-languages flag was restored to false. All owned virtual input devices were deinitialized and their absence was checked; no cleanup is outstanding. Do not remove or modify existing physical devices while repeating cleanup. Previously changed Russian IME language/OSD preferences remain separate from the unresolved Russian-layout problem. Their presence is not proof of working input.

The test Watched mark was removed using the ordinary remote after persistence testing. Removing an optional catalog key should affect only the catalog configuration and its cache, preserving favorites/Watched. Update the own WGT using the same author/signing identity. Data retention was observed across an update, but removal, Clear Data and factory reset have no promised byte-for-byte undo.

These system procedures do not require a Browser or Smart Hub reset. Browser history and sign-in recovery were not validated. Binaries, private backups and credentials are not included here.

## Verify the return

Repeat the [same functional checks](validation.md) after rollback. Stop further changes if Home, input, audio, HDMI or networking fails, and investigate the last specific target. Official streaming DRM/audio and PS5 behavior still need their own complete post-change regression; restoring a flag alone does not establish those outcomes.

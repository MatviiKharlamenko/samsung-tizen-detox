# Limits and retained functions

The original reboot-checked results belong to QE75Q64DAUXXN / T-NKLDDEUC-0090 / 2123.9. A separate [QE75Q74DATXXN case](q74d-results.md), T-NKM2DDEUC-0090 / 2123.9, has its own selected software-reboot readbacks and verified temporary-session cleanup. Another model's size/region, or even the same Tizen and numeric firmware versions, does not establish matching unit conditions, registry schema, enums or dependencies.

The Q74D changed two application-disable flags and preserved HbbTV and `com.samsung.tv.iacr`; the Q64D's `com.samsung.tv.acr` was absent there. Q74D Wi-Fi was already 5 GHz and its two inspected privacy consents were already unchecked. The original Q64D app/IME/playback results below remain scoped to that device; no second-device app installation or stock Russian keyboard result is implied.

## System and performance limits

There is no claim of a complete firmware audit, elimination of every telemetry channel, universal ad removal, DRM/TEE/UEP/Secure Boot bypass, arbitrary firmware/OS installation, persistent boot-root or measured acceleration. Targeted process checks do not cover all network traffic. DNS does not automatically filter all video advertising.

Home/`csfs`/`home.media`/`home.sidebar`/`quicklaunch`/`comss`/`coba.adagent`, keyboard/IME/TTS/Voice Guide, Cobalt/Chromium/wrt/webappservice, official streaming apps, account/security/license/DRM/securestorage, installer/package manager, HDMI/AVControl/tv-viewer/gamebar, audio/display/network/Bluetooth were retained. This was a protection list for this investigation, not a complete dependency graph.

`contents-recognition-service` was restored after a temporary stop test; its persistent mask failed because the system path was read-only. Voice components were retained. No system remount, blanket mask or unknown boot hook is recommended.

A software reboot was verified; power removal was not. Tizen 10 was not confirmed as a supported update for this exact TV, and no OTA or firmware update was started. Root does not change panel/HDMI hardware limits; 4K120 is not promised for this SKU.

The normal privacy-consent opt-out is separate from disabling an app. A complete final machine/visual readback of every consent flag was not completed. Removing the TV Plus Home card does not prove removal from Guide or every internal registration. Disabling HbbTV intentionally affects interactive broadcast features; it is not a general Live TV channel-import solution.

## App, capture and input limits

Both root-based native UI capture and SDK/CDP capture of the own Web app's viewport were verified. Private session images are excluded. DRM-video and HDMI capture were not tested.

Kino Doma 0.2.6 was tested on the TV for its Home icon, keyless Home, ordinary remote navigation, RU/EN search and manual Watched persistence across an app restart. Ukrainian track selection and continued playback were tested earlier in 0.2.4. These results do not establish every external player, an OS reboot after 0.2.6, or a complete firmware/performance regression. See the [separate stages](sdk-and-app.md).

Russian stock IME remains unresolved. Russian OSD/preferences and the app's own keyboard do not replace that test. Owned temporary input devices were removed and the experimental all-languages flag was restored. See the [IME findings](native-ime.md).

The default configuration uses keyless mode. The optional authenticated catalog is disabled and unverified. Automatic current-release feeds are off and starter cards are not called rankings or latest releases. Personal keys, watched titles and personal library data are excluded from the public profile.

## Remaining functional verification

Official streaming components and PS5-related services were retained, but this does not establish complete playback or HDMI regression coverage. Real Netflix/Apple TV DRM playback and audio, YouTube, Browser input, PS5 HDMI/HDR/audio, Game Mode/Input Signal Plus/CEC, long playback, standby/wake and power-removal/update persistence remain separate checks. See [validation](validation.md).

# Primary sources and versions

GitHub links below are pinned to full commits. Mutable API/CDP pages were checked on October 26, 2026 and are not presented as immutable source pins. These are research references; their code is not included in this documentation subtree. The Q64D observations are recorded in the original [sanitized profile](../profiles/qe75q64dauxxn-tizen9-2123.9.json). Upstream success on a different model is not a Q64D test.

The October 27 [Q74D case](q74d-results.md) and [separate profile](../profiles/qe75q74datxxn-tizen9-2123.9.json) distinguish additional direct device observations from the existing source references. The same numeric firmware version does not imply the same firmware family or installed components. No third-party result is relabelled as a test on either recorded device.

## Root

- [samsung-tv-root README](https://github.com/chris-ritsen/samsung-tv-root/blob/3b97edf3762db7670585d73e29623dc56195bf98/README.md).
- [Archive namespace/launcher implementation](https://github.com/chris-ritsen/samsung-tv-root/blob/3b97edf3762db7670585d73e29623dc56195bf98/payloads/common/SamsungTvArchiveRoot.cs).
- [Root agent identity implementation](https://github.com/chris-ritsen/samsung-tv-root/blob/3b97edf3762db7670585d73e29623dc56195bf98/payloads/common/SamsungTvRootAgent.cs).

## Vetro

- [Registry readback](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/app/service/app-registry.js).
- [HbbTV](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/app/service/hbbtv.js).
- [Quick settings/app-disable and separate stop](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/app/service/quick-settings.js).
- [Debloat and protected dependencies](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/app/service/debloat.js).

## Couchroot

- [Model-specific startup/disable trials](https://github.com/splitcipher/couchroot/blob/fd8a945588786c4af0c859064dbf52266be7091a/docs/lab/devices/qn90a/startup-disable-tests.md).
- [Model-specific app cleanup notes](https://github.com/splitcipher/couchroot/blob/fd8a945588786c4af0c859064dbf52266be7091a/docs/lab/devices/qn90a/app-cleanup.md).

## Linux

- [Capability number definitions](https://github.com/torvalds/linux/blob/6b4b543fa18757297ac756a6fe6e64f506b7844a/include/uapi/linux/capability.h).
- [SMACK: labels, onlycap and ptrace policy](https://github.com/torvalds/linux/blob/6b4b543fa18757297ac756a6fe6e64f506b7844a/Documentation/admin-guide/LSM/Smack.rst).

This pin supplies primary Linux definitions, not the exact vendor firmware source tree. The TV's capability range was established through its own `cap_last_cap=37` readback.

## Tizen

- [Samsung: security/API privileges](https://github.com/Samsung/tizen-docs/blob/128b80177c638f33d6e0f2e1172cb2c7420bd521/docs/application/native/reference/security-privileges.md).
- [Samsung TizenFX system-settings implementation](https://github.com/Samsung/TizenFX/tree/b9922d4a712483dc43f452538bafb36897b67878/src/Tizen.System.SystemSettings).
- [Tizen documentation content license](https://github.com/Samsung/tizen-docs/blob/128b80177c638f33d6e0f2e1172cb2c7420bd521/content-license.md).

## TV Detox: documentation inspiration

- [README: Android TV and lack of Tizen support](https://github.com/Ansub/tv-detox/blob/6429d34d3230033802f6e5371d93540a19a82751/README.md).
- [Candidate review and reversibility](https://github.com/Ansub/tv-detox/blob/6429d34d3230033802f6e5371d93540a19a82751/docs/debloat.md).

Android commands and package lists were not transferred. See [third-party notices](../THIRD_PARTY_NOTICES.md) for licenses.

## SDK

- [Samsung install/launch guide](https://github.com/Samsung/tizen-agent-skills/blob/b0330c597aeb8477e550fdcd0decd57396f0c330/tizen-sdk-skills/common/skills/tizen-install-app/SKILL.md) and [launch fallback implementation](https://github.com/Samsung/tizen-agent-skills/blob/b0330c597aeb8477e550fdcd0decd57396f0c330/tizen-sdk-skills/common/scripts/tizen-install-app/tizen-install-app.sh): Samsung TV channel 0 `was_execute`.
- [Samsung Web-app RWI/CDP guide](https://github.com/Samsung/tizen-agent-skills/blob/b0330c597aeb8477e550fdcd0decd57396f0c330/tizen-sdk-skills/common/skills/tizen-webapp-debug/SKILL.md).
- [Samsung certificate manager guide](https://github.com/Samsung/tizen-agent-skills/blob/b0330c597aeb8477e550fdcd0decd57396f0c330/tizen-sdk-skills/docs/certificate/certificate-manager-guide.en.md): Samsung TV author/distributor signing profile. No account data, certificate or device identifiers are included here.
- [CDP Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot): mutable primary reference, checked October 26, 2026. Own-app viewport capture is separate from whole native UI capture.

`vd_appinstall`, `debug` and `was_kill` are described here as observations on the exact TV, not universal documented commands for every Samsung.

## IME

- [Samsung input-method guide](https://github.com/Samsung/tizen-docs/blob/128b80177c638f33d6e0f2e1172cb2c7420bd521/docs/application/web/guides/text-input/input-method.md).
- [Official Tizen 9 source RPM, dated snapshot](https://download.tizen.org/snapshots/TIZEN/Tizen-9.0/Tizen-9.0-Unified/tizen-9.0-unified_20261019.231504/repos/standard/source/enlightenment-0.20.0-tz9_39.3.9.src.rpm): CLI/key-routing research. The checked source artifact SHA-256 was `eddbe6c155e2c213f09464208a3a1ca45cb75a0ed349cbca69ad7008d00e6d2d`. Source snapshot tz9_39.3.9 differs from retail compositor tz9_36.1.3; syntax agreement and the limited Down behavior were verified separately. The archive/code is not included.

## Catalog

- [PoiskKino homepage/plans](https://poiskkino.dev/#tariffs), [documentation](https://poiskkino.dev/documentation) and [public OpenAPI reference](https://api.poiskkino.dev/documentation/swagger-ui-init.js). Checked October 26, 2026: a personal `X-API-KEY`, free Demo quota of 200 requests/day, up to 10 pages, and home media libraries among the stated uses.

These mutable primary pages are not permanent guarantees of quota or terms. The default configuration uses keyless mode; the optional authenticated catalog was not enabled or tested. This documentation does not relicense service data or posters.

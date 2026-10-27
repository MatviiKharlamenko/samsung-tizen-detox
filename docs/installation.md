# Preview, package, and install Kino Doma

This guide separates an ordinary browser preview from installing a signed Samsung TV application. Installing the app does **not** require root or any of the system modifications documented in `tv/`.

The recorded TV installation was **0.2.6** on one QE75Q64DAUXXN running Tizen 9.0 and firmware 2123.9. The current source is **0.2.7**, with software verification and no new TV installation. Its manifest targets Tizen 9.0. Other models, older Tizen versions, and a fresh installation on another TV remain unverified. The separate historical runtime snapshot and current-source checks are described in [app validation](../app/VALIDATION.md).

## 1. Start with the browser preview

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory app
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Use a mouse or arrow keys, Enter, and Escape. Python 3 is sufficient to serve the app; there is no frontend build step or runtime npm dependency.

Search, posters, and external playback need an internet connection. The browser preview has its own local lists: it does not read or modify the TV's Favorites, Recent, or Watched data. External iframe, CORS, autoplay, and video behavior can differ from a real TV. A successful preview is not proof of TV compatibility.

For automated fixture checks, install the locked development dependency with `npm ci`, keep Google Chrome installed, and run `node tools/run_browser_checks.cjs`. That command uses an independent ephemeral loopback server and fresh ignored report output, leaving a manual preview on port 8765 untouched. See [contributing](../CONTRIBUTING.md#browser-fixture-checks) for requirements and output details. It does not install or test the app on a TV.

## 2. Prepare your own Samsung development environment

Install the appropriate SDK and extensions from Samsung's [TV SDK instructions](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html): Tizen Studio, TV support, the Web CLI, and Samsung Certificate Extension. Keep certificate tooling current; Samsung documents that certificate creation with extensions older than 2.0.73 stopped being supported after September 2025.

Make `sdb` and the SDK's `tizen` CLI available in your terminal, or invoke them by their full installed paths. The commands below use POSIX shell syntax; adapt paths and variable assignment for your shell.

Create your own Samsung TV certificate profile using the [official certificate guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html). It needs an author certificate and a distributor certificate containing **your TV's DUID**. Keep the certificates, passwords, DUID, and signing-profile file private. Updates to your installation should retain the same author certificate.

This repository does not contain the original TV's signing profile, certificates, SDK, or signed installer. A generic local/self-signed Tizen profile is not a replacement for the Samsung TV profile.

## 3. Connect the TV

Follow Samsung's [TV connection instructions](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html). With the computer and TV on the same network:

1. Open the TV's Apps settings and enter `12345` with the remote's numeric keypad.
2. Enable Developer Mode, enter the **computer's** current IP address as the allowed host, save, and restart the TV.
3. Add the TV in the SDK Device Manager and connect it.
4. In Device Manager, use **Permit to install applications** for the connected target, as described in Samsung's [TV CLI prerequisites](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html).

Use the actual serial reported by the SDK, not a model name:

```sh
sdb devices
```

No router port forwarding or public debug endpoint is needed. Device identifiers and connection details belong in your local configuration, not in an issue or commit.

## 4. Stage only the runtime files

Run the repository's unsigned packager:

```sh
python3 tools/package_unsigned.py
```

It stages the 11 current-source runtime files in `build/runtime/` and creates `build/kino-doma-0.2.7-unsigned.wgt`. It does not sign, connect to a device, change the TV, or read a signing profile. The archive is useful for inspecting the exact payload; it is **not an installable Samsung-signed release** and does not represent a new native-device test.

Do not package the whole `app/` folder: it also contains tests, documentation, reports, and integrity metadata. Keep generated files under the ignored `build/` directory.

### Choose the build input

| Input | Version and evidence |
|---|---|
| `build/runtime/`, staged by the packager | Current 0.2.7 source and software fixes; no new TV installation |
| `evidence/native-0.2.6/runtime/` | The exact 11-file source snapshot of the recorded native 0.2.6 app; other TVs remain unverified |

To build the TV-tested reference instead, copy its flat runtime into a separate, empty build directory:

```sh
mkdir -p build/reference-0.2.6
cp evidence/native-0.2.6/runtime/* build/reference-0.2.6/
```

Use an empty destination rather than mixing files with an earlier SDK build. Keep the evidence snapshot unchanged: **never build or sign inside `evidence/`**. In the next section, set `CINEMA_STAGE` to `build/reference-0.2.6` for this option. The current and reference sources retain the same application/storage identities; source identity is separate from your own signing identity.

## 5. Build and sign with the SDK

The following is Samsung's documented Tizen Studio CLI route, applied to the staged runtime. This review checked the command syntax against the [official TV CLI guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html); it did not repeat an installation using a fresh SDK and another TV.

Replace the profile value with the name in **your** Certificate Manager:

```sh
CINEMA_PROFILE='YourSamsungTVProfile'
CINEMA_STAGE='build/runtime'
tizen build-web -- "$CINEMA_STAGE"
tizen package -t wgt -s "$CINEMA_PROFILE" -- "$CINEMA_STAGE/.buildResult"
```

Use the signed package's actual output path printed by the SDK. Do not assume that the WGT filename equals the application ID. SDK generations may use different tooling; consult the command help for the installed version rather than mixing `tizen` and `tz` flags.

The configured identities are:

| Field | Value |
|---|---|
| Widget/storage identity | `urn:father-cinema:prototype` |
| Package ID | `FatherCine` |
| Full application ID | `FatherCine.Main` |
| Current source version | `0.2.7` |
| Recorded native version | `0.2.6` |

The historical widget ID is retained to preserve the tested application's storage identity. Do not change identities merely to match a folder or repository name.

## 6. Install, run, and verify

Set these placeholders from your SDK and package output:

```sh
CINEMA_TARGET='your-device-serial-from-sdb-devices'
CINEMA_PACKAGE_DIR="$CINEMA_STAGE/.buildResult"
CINEMA_PACKAGE_FILE='the-exact-signed-filename-reported-by-the-sdk.wgt'
tizen install -s "$CINEMA_TARGET" --name "$CINEMA_PACKAGE_FILE" -- "$CINEMA_PACKAGE_DIR"
tizen run -s "$CINEMA_TARGET" -p FatherCine.Main
```

For TV applications, `tizen run -p` takes the **full application ID**, not just `FatherCine`. The standard SDK command route above should be the first choice.

On the recorded TV, a correctly signed own WGT was installed through Samsung's SDK channel-0 broker; normal launch and stop also worked without root. Those model-specific observations are documented in [SDK and app results](../tv/docs/sdk-and-app.md). They are not a guarantee that every SDK/device combination exposes the same broker.

Verify the visible app and version, not only a process exit code. On the TV:

- Find the Kino Doma app in Apps. Add it to Home if desired; this is a separate launcher action.
- Search for a title in Russian and English, then open the intended film.
- Add and remove a Watched mark; close and reopen the app to check persistence.
- Test an external player, the remote's Back path, and any audio selection you need.
- End the debugging session and launch normally when finished.

The installed app does not need the computer or preview server to remain running. Network-based features still need the TV's internet connection. Clearing or uninstalling application data can remove its local lists; changing the author certificate is not an update strategy.

## Troubleshooting boundaries

| Symptom | Check |
|---|---|
| TV absent or offline in the SDK | Same network, the allowed Developer Mode host address, the TV restart, and Device Manager connection |
| Signing or installation rejected | Samsung TV certificate type, target DUID, profile selection, certificate validity, and Permit to install applications |
| Package has no application metadata | Confirm the staged root contains the repository's `config.xml`, entry HTML, and icon |
| App installed but no Home tile | Check Apps first, then add the app to Home; installation and pinning are different operations |
| Browser preview works but video fails on TV | Check the actual provider, TV browser behavior, external service availability, and [known limitations](../tv/docs/limitations.md) |
| Russian stock keyboard is still absent | The app's own RU/EN keyboard is separate from Samsung's native IME; the native issue remains unresolved |

Do not solve installation problems by disabling certificate validation, posting signing material, exposing debug ports to the internet, or applying unrelated root/firmware changes.

## Source checks

The Samsung SDK, certificate, TV-device, and TV-CLI pages linked above were checked on **2026-10-27**. They document the vendor workflow; the repository's [native evidence](../app/NATIVE-STATUS.json) records the narrower observations actually made on the original TV. No new device installation or firmware test was performed during this documentation review.

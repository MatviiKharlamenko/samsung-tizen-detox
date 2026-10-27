# SDK access and the installed Kino Doma app

Observed October 26, 2026 on one QE75Q64DAUXXN, Tizen 9.0 / firmware 2123.9. Installation, launch, version readback, interface capture and actual playback are separate evidence. This is a sanitized maintainer summary: private packages, keys, library contents and raw endpoints are excluded.

## Without root: a correctly signed own WGT

Developer Mode and standard SDB access did not provide an ordinary root shell. Samsung SDK channel 0 nevertheless supported the installed own Tizen Web app:

| Operation | Verified result |
|---|---|
| `vd_appinstall` | Installation/update of the correctly signed own WGT through the stock TV broker |
| `was_execute` | Launch of the own application |
| `debug` | Debug launch of the own Web app and access to its RWI/CDP |
| `was_kill` | App stop; a subsequent launch created a new process |
| CDP screenshot | The own Web app's actual viewport, without root |

The tested WGT used a Samsung author certificate and a device-scoped Samsung distributor profile generated with the official certificate tooling. The signing identity and device authorization were private prerequisites, not supplied by this repository. Use your own supported signing setup for your TV; the [official certificate guide](sources.md#sdk) describes that route. This observed case does not establish the certificate requirements of every possible installation path. No signature bypass is claimed.

This SDK channel is not an arbitrary Linux shell. A successful exit code does not replace broker completion, version readback and a screen check. The result concerns the own app, not management of unrelated or system packages.

The pinned Samsung source corroborates the channel 0 `was_execute` launch fallback. Other broker commands listed here are observations on this TV, not universal public API guarantees for every Samsung. See [SDK sources](sources.md#sdk).

CDP was restricted to the selected own Web target. Its viewport is not a screenshot of Samsung Home, native IME, DRM-video or HDMI. Whole native UI screenshots used a separate root route. Developer debugging was used for inspection; normal use of the installed app does not require a Mac server.

## Verified app stages

- **0.2.6 installation and Home:** the app was registered, the icon was pinned immediately after YouTube and launch from it worked. The icon survived successive app updates. A full OS reboot after 0.2.6 is not claimed.
- **Ordinary remote:** earlier TV tests verified video `readyState=4`, increasing playback position, pause/seek/resume and return to the app interface. Parent controls retained focus so Back did not depend on a cross-origin iframe handling it.
- **0.2.4 audio:** a physical remote opened the player's real track list, selected a Ukrainian track, closed the menu and changed the visible track name; video continued. Identical aggregator iframe URLs were not treated as independently working audio tracks.
- **0.2.5 Watched:** manual marking with the physical remote, a visible badge/count, normal app stop/new debug launch, retained mark and the separate collection were verified. The test mark was removed with the physical remote. Opening a title was not treated as completing it; automatic completion is not claimed.
- **0.2.6 keyless Home and Watched:** three starter cards, no key-setup form and hidden unavailable online feeds. Physical remote navigation from search to a card, detail opening and favorite/Watched actions were tested. Back restored the previous card's focus with its badge/count. After a normal stop/new launch, the mark and collection remained; the test mark was then removed. Actual Russian and English title searches returned without error.
- **Software checks:** eight browser checks for Watched passed without unhandled errors. They supplement the native test rather than replacing it.

The playback observation covers one source/session. Availability of every film, stream quality/duration, all tracks and every provider is not established. Media URLs, playlists/tokens and frame IDs are excluded.

## Closing the 0.2.6 diagnostic session

The debug app was stopped, the diagnostic port was closed and owned SDB forwards were removed. A normal launch without debug then succeeded. Three starter cards/posters loaded on the final Home screen; there were no visible errors or open iframe. No personal catalog key was present, and that Home check sent no catalog API requests. Temporary setup resources were closed. The temporary root session was also closed.

## Catalog: chosen keyless mode

Automatic current-release, genre and rating rows are disabled without a configured data source. Clearly labelled starter and personal cards take their place. The installed 0.2.6 keyless Home was verified on the TV; 0.2.5 checks above are historical. The app's own RU/EN keyboard was tested separately from stock IME.

The optional PoiskKino client passed mock-based software checks, but no key was configured and no authenticated GET or live fresh-release feed was tested. On the source-check date, the provider published a free Demo quota of 200 requests/day and up to 10 pages. These are dated optional-provider terms; the default configuration does not require this integration.

If this optional catalog is enabled later, use a personal `X-API-KEY` and keep it out of URLs, logs and public artifacts. A best-new criterion must use actual dates, ratings and vote counts. The 24-hour metadata and 7-day genre cache durations are client policy; a separate open license for the entire catalog/poster collection or a vendor-specified cache TTL was not found in the reviewed public docs. See the [dated primary sources](sources.md#catalog).

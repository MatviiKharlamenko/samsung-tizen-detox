# Sources and third-party projects

This documentation subtree contains original writing and separate sanitized Samsung QE75Q64DAUXXN and QE75Q74DATXXN observations. Third-party projects were used as primary research references. Their code, documentation copies, executables, firmware, SDKs, certificates and keys are not included in this subtree.

Each source retains its license. Attribution does not relicense third-party material. A result on another model is not evidence of Q64D compatibility. This project does not assign authorship or support to Samsung or the source authors.

| Source | Use and license |
|---|---|
| [samsung-tv-root, 3b97edf](https://github.com/chris-ritsen/samsung-tv-root/tree/3b97edf3762db7670585d73e29623dc56195bf98) | Temporary-root method, link only. [Unlicense](https://github.com/chris-ritsen/samsung-tv-root/blob/3b97edf3762db7670585d73e29623dc56195bf98/LICENSE) |
| [Vetro, a8e35a6](https://github.com/andrearicci93/vetro/tree/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa) | Registry, HbbTV and reversible operations, links only. [MIT](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/LICENSE), [upstream notices](https://github.com/andrearicci93/vetro/blob/a8e35a691ceaff8e3f5518ca3f7ac611db7614fa/THIRD_PARTY_NOTICES.md) |
| [Couchroot, fd8a945](https://github.com/splitcipher/couchroot/tree/fd8a945588786c4af0c859064dbf52266be7091a) | Model-specific trials/rollback, links only. [0BSD](https://github.com/splitcipher/couchroot/blob/fd8a945588786c4af0c859064dbf52266be7091a/LICENSE) |
| [TV Detox, 6429d34](https://github.com/Ansub/tv-detox/tree/6429d34d3230033802f6e5371d93540a19a82751) | Documentation inspiration; Android code is not included. [MIT](https://github.com/Ansub/tv-detox/blob/6429d34d3230033802f6e5371d93540a19a82751/LICENSE) |
| [Linux capability header](https://github.com/torvalds/linux/blob/6b4b543fa18757297ac756a6fe6e64f506b7844a/include/uapi/linux/capability.h) | Capability definitions, link only. Source-file SPDX: `GPL-2.0 WITH Linux-syscall-note` |
| [Linux SMACK documentation](https://github.com/torvalds/linux/blob/6b4b543fa18757297ac756a6fe6e64f506b7844a/Documentation/admin-guide/LSM/Smack.rst) | Primary policy reference, link only; the document is not copied |
| [Samsung/tizen-docs](https://github.com/Samsung/tizen-docs/tree/128b80177c638f33d6e0f2e1172cb2c7420bd521) | Privilege model summarized in original words. [CC BY 3.0 for text; BSD-3-Clause for examples](https://github.com/Samsung/tizen-docs/blob/128b80177c638f33d6e0f2e1172cb2c7420bd521/content-license.md) |
| [Samsung TizenFX](https://github.com/Samsung/TizenFX/tree/b9922d4a712483dc43f452538bafb36897b67878) | Additional system-settings reference, link only. [Apache-2.0](https://github.com/Samsung/TizenFX/blob/b9922d4a712483dc43f452538bafb36897b67878/LICENSE) |
| [Samsung tizen-agent-skills](https://github.com/Samsung/tizen-agent-skills/tree/b0330c597aeb8477e550fdcd0decd57396f0c330) | SDK/certificate/RWI references, links only. [Apache-2.0](https://github.com/Samsung/tizen-agent-skills/blob/b0330c597aeb8477e550fdcd0decd57396f0c330/LICENSE) |
| [Official Tizen 9 source snapshot](https://download.tizen.org/snapshots/TIZEN/Tizen-9.0/Tizen-9.0-Unified/tizen-9.0-unified_20261019.231504/repos/standard/source/enlightenment-0.20.0-tz9_39.3.9.src.rpm) | CLI/input research, link only; the package spec declares BSD-2-Clause and MIT. Source/binaries are not included |
| [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot) | Screenshot reference link only; protocol source/document copies are not included |
| [PoiskKino](https://poiskkino.dev/) | Dated optional-catalog/quota references, links only. A separate open license for the entire catalog/poster collection was not found in the reviewed public docs; API responses/images are not included |

Vetro has its own notices for several MIT/Unlicense components and links to GPL-3.0 TizenBrew/TizenTube. Those projects and dependencies are not included here. Any future code transfer needs file-specific license review and retention of the applicable license/notice; this link-only table does not replace that work.

Original documentation is distributed under [MIT](LICENSE). It does not copy Samsung firmware/source excerpts or another project's README. The repository's original Kino Doma source is separate in [app/](../app/README.md); linking to external services does not license their content or player code.

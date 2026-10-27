# Native IME: verified behavior and unresolved input

Observed October 26, 2026. Russian Samsung OSD was verified separately from the on-screen keyboard language. Kino Doma has its own RU/EN input interface, which does not modify the stock IME. See the [official IME concepts](sources.md#ime).

## Russian stock input was not solved

Russian variants were present in installed resources. Changing the physical-keyboard setting and targeted IME preferences to Russian did not produce a verified Russian stock layout or Russian input. The active input language returned to `en_GB`; previously changed IME language/OSD preferences remained Russian. These values do not prove successful layout selection. User dictionaries and input history were not used.

A temporary all-languages Boolean made the globe icon visually active, but a selectable Russian-language list was not verified. The flag was restored to **false** and the index to 0 after the experiment. This is not a recommended recipe for enabling Russian.

## A limited native-input capability through root

WebSocket commands bypassed the active stock IME even in a plain Browser input field. The retail compositor's diagnostic CLI syntax matched the researched Tizen 9 source. An owned temporary virtual input device, assigned the Remocon subclass, let **Down move focus inside the on-screen keyboard** while it remained open.

However, Return/KP_Enter committed or closed the keyboard instead of selecting the visually focused button. Touch/mouse trials also failed to verify complete control or access to language settings. This does not establish full physical-remote emulation and does not solve the Russian stock IME.

All owned temporary virtual devices were deinitialized and their absence was checked. No device cleanup is outstanding; existing physical input devices were not modified. This subtree contains no device-node numbers/names, input traces or binary injector.

The common Tizen 9 source explains CLI/key-routing behavior, but it differs from the exact retail build. The [dated source snapshot](sources.md#ime) was used for investigation, not as replacement firmware. A private VirtualKey ABI was not guessed from symbol names.

Russian OSD, a keyboard-language preference, native focus movement and actual Russian text entry are distinct observations. Only Kino Doma's own RU/EN keyboard has a successful Russian-input result in these notes.

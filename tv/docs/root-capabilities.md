# Verified root capabilities and boundaries

On the tested QE75Q64DAUXXN, the root agent reported UID/EUID/GID/EGID 0, SMACK label `User`, .NET 6 and `CapBnd/CapPrm/CapEff=0000003fffffffff`. Linux 5.4.249 reported `cap_last_cap=37`, so this mask includes bits 0-37, all capabilities defined by that kernel. `NoNewPrivs=0` and `Seccomp=0` describe the inspected process, not every TV application. See the [primary Linux definitions](sources.md#linux).

The tested [archive-launcher route](sources.md#root) used the system .NET runtime, a separate mount namespace and the stock archive launcher. This was not a user namespace presenting a virtual UID 0. The system files checked by the method were not persistently replaced. Subsequent root commands could still change shared TV data: temporary access does not make their effects temporary.

Root allowed system inspection and the specific [documented changes](verified-recipes.md). It was reacquired after a full software OS reboot; persistent boot-root was not installed. **The final temporary root session was closed after the 0.2.6 checks.** These capabilities describe a verified historical session, not a running service or an available shell in this repository.

## Root and SDK access are separate

SDK channel 0 independently installed/updated, launched, debugged and stopped the correctly signed own Web app, and CDP captured its viewport without root. These SDK operations do not establish arbitrary Linux shell access or a signature bypass. See [SDK/app evidence](sdk-and-app.md).

A root-native input diagnostic moved the stock on-screen keyboard's focus using an owned temporary Remocon device. Complete Select/OK behavior and the Russian stock layout were not solved. The experimental flag was restored and the owned devices were removed. See [native IME limits](native-ime.md).

## What was not established

- Having a capability is not proof that every corresponding operation worked. Kernel-module loading, every partition and arbitrary unsigned ARM ELF execution were not tested.
- SMACK applies independently of UID. `onlycap` was read as empty and the ptrace policy was 1; neither proves SMACK was disabled or every domain was accessible. See [SMACK documentation](sources.md#linux).
- Tizen API privileges and public/partner/platform signatures remain separate boundaries. UID 0 does not make an app platform-signed. See the [official security model](sources.md#tizen).
- No UEP/SFD, TEE/TrustZone, DRM/HDCP, Secure Boot or firmware-signature bypass was performed.
- Capturing native UI does not establish DRM-video or HDMI capture.
- Reacquiring temporary root after a software reboot is not persistent boot-root and does not prove access after power removal or an update.

Closing the root session is access cleanup. It does not revert saved VCONF settings, app flags, network settings or the owned canalysis marker. Those changes have separate [rollback procedures](rollback.md). Real boot identifiers, network addresses, tokens and raw session output are excluded from the public profile.

## Separate Q74D observation

The [QE75Q74DATXXN session](q74d-results.md), firmware T-NKM2DDEUC-0090 / 2123.9, independently reported UID/EUID/GID/EGID 0, .NET 6, effective capabilities `0000003fffffffff`, SMACK `User` and seccomp mode 0 on ARMv7/Linux 5.4.249. Its normal SDB capability response still disabled interactive shell and root toggles. The successful temporary-root result is separate from those SDK flags.

The Q74D has its own [closed profile](../profiles/qe75q74datxxn-tizen9-2123.9.json). Root was independently reacquired after its full software OS reboot for fresh readbacks. Both temporary sessions were then closed, owned staging cleanup succeeded, and the original password-file and genuine SDB public-key hashes were unchanged at both cleanups. The transfer receiver was closed; a final SDK app read succeeded with ordinary root flags still disabled. No persistent boot-root was installed, and the privilege boundaries above still apply.

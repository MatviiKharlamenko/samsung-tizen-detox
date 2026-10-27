# Native 0.2.6 reference build

`runtime/` preserves the exact 11 public runtime files used for the recorded TV installation of Kino Doma 0.2.6. The separate [fingerprint](../native-0.2.6-runtime.sha256) checks this immutable source snapshot.

The active development source is in [`app/`](../../app/README.md). Later source revisions do not inherit the reference build's native verification status. Current source and last TV-tested version are identified separately in [native status](../../app/NATIVE-STATUS.json).

This directory contains original application source and its own icon, not a signed installer, certificate profile, device data, external media or third-party player source. It does not require signing credentials to verify its hashes. The recorded observation limits remain in [app validation](../../app/VALIDATION.md) and [TV validation](../../tv/docs/validation.md).

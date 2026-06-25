# Security Policy

## Supported versions

OpDICOM is pre-1.0. Security fixes are applied to the latest `main` and the most
recent published `0.x` release.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
("Report a vulnerability" under the repository's **Security** tab), or email the
maintainer listed in the repository profile.

We aim to acknowledge reports within **72 hours** and to provide a remediation
plan within **7 days** for confirmed issues.

## Scope & threat model

OpDICOM runs **entirely client-side**. Its security posture rests on a few
principles:

- **No network egress by default.** The library never uploads pixel data or
  metadata. Patient data stays in the browser unless the host app explicitly
  configures a DICOMweb endpoint.
- **No telemetry / analytics.** There is no phone-home of any kind.
- **Untrusted input.** DICOM files are treated as untrusted. Parsing must never
  execute file-embedded content. Report any parser crash that is exploitable
  beyond a denial of service (e.g. memory disclosure via the WASM codecs).
- **Dependencies.** We track advisories via Dependabot and `pnpm audit` in CI.

### Recommended host-app hardening

- Serve over HTTPS with a strict **Content-Security-Policy**. The viewer needs
  `worker-src blob:` and `script-src 'self'` (plus `wasm-unsafe-eval` for the
  WASM codecs); it does **not** need `connect-src` to third parties.
- If you accept user-supplied files, validate size/quantity before loading.
- Anonymize before sharing exports — OpDICOM does not strip PHI automatically.

## Known accepted advisories

- **GHSA-h67p-54hq-rp68 (`js-yaml` ≤ 4.1.1, moderate).** Reaches us only through
  `@kitware/vtk.js → xmlbuilder2 → js-yaml`, used by VTK's XML/YAML data formats.
  This path is **not exercised by the 2D DICOM viewer**. A full fix requires
  forcing `js-yaml` to a new major across `xmlbuilder2`, which risks breaking it.
  We pin `js-yaml ≥ 3.14.2` (closing the other advisory) and track upstream for a
  clean fix. CI fails the build on **high**+ severity advisories.

## Not a medical device

OpDICOM is **not** cleared or approved for primary diagnosis. Security findings
that affect diagnostic correctness (pixel values, HU, orientation) are treated
with the same severity as classic vulnerabilities.

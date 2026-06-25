# Contributing to OpDICOM

Thanks for your interest! OpDICOM is open source (MIT) and contributions of all
kinds are welcome — code, docs, examples, bug reports, and ideas.

## Development setup

```bash
# Requirements: Node >= 20, pnpm >= 9
pnpm install
pnpm dev          # run the demo playground
pnpm typecheck    # type-check all packages
pnpm build        # build publishable packages
```

This is a pnpm workspace monorepo:

```
packages/
  parser/   @opdicom/parser  — DICOM metadata parser
  core/     @opdicom/core     — headless viewer engine (Cornerstone3D)
  viewer/   @opdicom/viewer   — <opdicom-viewer> Web Component
apps/
  demo/     reference integration / playground
```

## Guidelines

- **TypeScript strict.** No `any` unless justified with a comment.
- **No patient data in the repo.** `.dcm` files are git-ignored. Use public sample data.
- **Keep it framework-agnostic.** Core logic must not depend on any UI framework.
- **Conventional Commits** for messages (`feat:`, `fix:`, `docs:`, `chore:`…).
- Add/Update tests for behavior changes.

## Safety note

OpDICOM is **not** a medical device. Any change that could affect how pixel values,
Hounsfield Units, rescale, or orientation are presented must be reviewed carefully —
visual correctness in medical imaging is a safety concern.

## Pull requests

1. Fork & branch from `main`.
2. Make focused changes with passing `pnpm typecheck`.
3. Open a PR describing the motivation and approach.

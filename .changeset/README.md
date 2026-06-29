# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

To record a change for release, run:

```bash
pnpm changeset
```

Pick the affected packages and a semver bump, and commit the generated file.
On merge to `main`, the Release workflow opens/updates a "Version Packages" PR;
merging that PR publishes the bumped packages to npm. See
[docs/RELEASING.md](../docs/RELEASING.md).

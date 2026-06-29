# Releasing & hosting

## Live demo — GitHub Pages (automatic)

Pushes to `main` run `.github/workflows/pages.yml`, which builds the demo and
deploys it to GitHub Pages at:

```
https://tilsonf.github.io/opdicom/
```

One-time enablement: repository **Settings → Pages → Build and deployment →
Source: GitHub Actions** (or it's enabled automatically on the first run via
`actions/configure-pages`).

## Publishing to npm (Changesets)

Packages published: `@opdicom/parser`, `@opdicom/core`, `@opdicom/viewer`,
`@opdicom/react`, `@opdicom/vue` (the demo is private). Each has a
`publishConfig.exports` pointing at its built `dist/`.

### One-time setup

1. **npm scope/org.** The packages use the `@opdicom` scope. Either create the
   free npm organization **opdicom** (npmjs.com → Add Organization), or rename
   the scope to your username in each `package.json`.
2. **NPM token.** Create an **Automation** access token on npm (Account →
   Access Tokens) and add it to the repo as a secret named **`NPM_TOKEN`**
   (Settings → Secrets and variables → Actions).

### Release flow

1. While developing, record changes:
   ```bash
   pnpm changeset      # choose packages + semver bump, write a summary
   ```
   Commit the generated file under `.changeset/`.
2. On merge to `main`, the **Release** workflow opens/updates a
   **"Version Packages"** PR that applies the bumps and updates changelogs.
3. **Merge that PR** → the workflow runs `pnpm release` (`pnpm build &&
   changeset publish`) and publishes the bumped packages to npm with
   provenance.

### Manual publish (fallback)

```bash
pnpm build
pnpm changeset version   # apply pending bumps
pnpm changeset publish   # requires `npm login`
```

# Eliminating the esbuild bundle step

## Motivation

`pricing-core/` was bundled by esbuild into `pricing-core/bundle.js`, symlinked into
`pages/compiled-pricing-core.js` so 11ty's passthrough could serve it. The bundle step
existed solely because browsers cannot resolve bare module specifiers
(`import ... from '@observablehq/plot'`) or extensionless imports (`./conversion`).

This created friction:
- Two independent build systems with an implicit, symlink-based coupling
- `npm install` required at two levels (root + `pricing-core/`)
- CI needed two install steps with two lock files in the npm cache key
- Dev workflow ran two watchers in parallel (esbuild + 11ty), with a known UX limitation
  where 11ty's watcher did not detect bundle changes via the symlink inode, requiring
  manual browser refreshes on JS changes
- The bundle is a poor artefact for `pricing-core` as a reusable library — it bundles
  all dependencies in, preventing tree-shaking by downstream consumers

## Decision

Serve `pricing-core/` source files directly via 11ty passthrough. Resolve npm packages
at runtime using a native browser import map in `base.njk`, pointing to pinned esm.sh
CDN URLs.

## Trade-offs

**CDN dependency at runtime**: the site already loads MathJax from `cdn.jsdelivr.net`,
and the intended audience (clients, learners) is online. This is acceptable.

**No offline support**: a fully self-contained build is no longer possible without
reintroducing a bundle step. Acceptable given the deployment context.

**Source files visible in devtools**: individual module requests are now visible in the
Network tab. This is a positive for development and a non-issue for production.

## What changed

- `pricing-core/index.js`, `fitting/fit.js`, `fitting/adam.js`, `visualisation/index.js`
  — extensionless and directory imports replaced with explicit `.js` paths for browser
  compatibility
- `pages/_layouts/base.njk` — import map added with pinned esm.sh URLs for
  `@observablehq/plot`, `@observablehq/inputs`, `d3`, and `htl` (the last is imported
  directly by `visualisation/inputs/` despite being an undeclared transitive dependency)
- `.eleventy.js` — `{ "pricing-core": "pricing-core" }` passthrough added
- `pages/*.js` — import updated from `./compiled-pricing-core.js` to
  `./pricing-core/index.js`
- `pages/compiled-pricing-core.js` symlink — deleted
- `pricing-core/package.json` — build scripts and esbuild devDependency removed;
  dependencies retained for documentation and IDE type support
- `pricing-core/node_modules/`, `pricing-core/package-lock.json` — deleted
- Root `package.json` — simplified to `build: eleventy` and `dev: eleventy --serve`;
  `npm-run-all2` devDependency removed
- `.github/workflows/static.yml` — pricing-core install step and its cache key removed

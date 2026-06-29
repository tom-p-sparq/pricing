# Bundling pricing-core for the static site

> **Status**: reversed. See below for the original decision and the rationale for reverting it.

---

## Original decision (now reversed): serve pricing-core source directly

### Motivation

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

### Decision

Serve `pricing-core/` source files directly via 11ty passthrough. Resolve npm packages
at runtime using a native browser import map in `base.njk`, pointing to pinned esm.sh
CDN URLs.

### Trade-offs at the time

**CDN dependency at runtime**: the site already loads MathJax from `cdn.jsdelivr.net`,
and the intended audience (clients, learners) is online. This is acceptable.

**No offline support**: a fully self-contained build is no longer possible without
reintroducing a bundle step. Acceptable given the deployment context.

**Source files visible in devtools**: individual module requests are now visible in the
Network tab. This is a positive for development and a non-issue for production.

---

## Reversal: bundle pricing-core as a site build artefact

### Motivation

Serving source files directly creates two loading problems that compound on a cold visit:

1. **Module waterfall** — the browser fetches `pricing-core/index.js`, discovers its
   imports, fetches each of those, discovers their imports, and so on across ~54 source
   files. Each fetch is a round trip.
2. **CDN cold-start** — 15 separate esm.sh requests (including 9 stdlib packages), each
   requiring DNS resolution and a TLS handshake to a new origin.

### Decision

Run esbuild from the root as part of 11ty's build pipeline. `pricing-core/index.js` is
bundled with all npm dependencies inlined (resolved from root `node_modules`) and output
to `_site/pricing-core/index.js` — the same URL that page scripts already import. No
import path changes in any page script; no CDN at runtime.

### Why the original friction points no longer apply

- **Two build systems / symlink coupling**: esbuild runs inside `.eleventy.js` via the
  `eleventy.before` event hook. There is one build system, one command.
- **Two package.json files / two install steps**: `pricing-core/` has no `package.json`
  or `node_modules`. esbuild reads source from `pricing-core/` and resolves packages
  from the single root `node_modules`.
- **Two dev watchers / symlink inode issue**: `eleventyConfig.addWatchTarget('pricing-core/')`
  extends 11ty's watcher. esbuild re-runs inside the same process on each rebuild.
- **"Poor artefact for a reusable library"**: the bundle lives in `_site/` (gitignored),
  not in `pricing-core/`. It is a deployment artefact for this site, not a modification
  to the library. A downstream consumer of `pricing-core/` would import from the source
  and bundle with their own toolchain.

### Effect on IDE / type checking

Page scripts keep their existing relative imports (`../pricing-core/index.js`). VS Code
resolves these to the source files via normal filesystem resolution — the jsconfig path
aliases are unchanged and the full JSDoc type system continues to work.

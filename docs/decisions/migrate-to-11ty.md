# Migrating to Eleventy (11ty)

## Motivation

Every page repeats the same `<head>` boilerplate (charset, viewport, stylesheet, favicon, MathJax config + CDN script), `<header>` nav, and `<footer>`. The only per-page differences are the `<title>`, the main content, and the module `<script>` src. Eleventy eliminates this duplication via template inheritance.

## New directory structure

```
pricing/
├── .eleventy.js          ← 11ty config
├── package.json          ← new root-level package; orchestrates everything
├── pricing-core/         ← unchanged except removing serve/dev scripts
│   └── package.json      ← remove serve/dev scripts; esbuild outfile unchanged
└── pages/
    ├── _layouts/
    │   └── base.njk      ← shared layout (single source of truth)
    ├── index.html        ← stripped to front matter + content only
    ├── 00-intro-conversion-models.html
    ├── 01-parametric-conversion-models.html
    ├── 02-specifying.html
    ├── 03-fitting.html
    ├── 04-model-selection.html
    └── style.css         ← unchanged, passthrough copied
```

11ty reads from `pages/`, writes to `_site/`. The dev server serves `_site/`.

## Key files

### `pages/_layouts/base.njk`

The single source of truth for shared chrome:

```nunjucks
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>">
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" id="MathJax-script" async></script>
  <title>{{ title }}</title>
</head>
<body>
  <header>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
      </ul>
    </nav>
  </header>
  <div class="main-container">
    {{ content | safe }}
  </div>
  {% if script %}
  <script type="module" src="/{{ script }}"></script>
  {% endif %}
  <footer>
    <p>&copy; 2026 TP Prescott</p>
  </footer>
</body>
</html>
```

### A page after stripping

e.g. `pages/00-intro-conversion-models.html`:

```html
---
layout: base.njk
title: An Introduction to Conversion Modelling
script: 00-intro-conversion-models.js
---

<h1>Conversion Modelling: an Introduction</h1>

<div>
  <p>Hello, and welcome to the first of a set of notes...</p>
  ...
</div>

<div id="conversion-container"></div>
...
```

YAML front matter declares the layout, title, and which JS module to load. Everything else is pure content. `index.html` omits `script` — the `{% if script %}` block in the layout handles this cleanly.

### `.eleventy.js`

```js
export default function(eleventyConfig) {
  // Copy assets straight through to _site/
  eleventyConfig.addPassthroughCopy("pages/style.css");
  eleventyConfig.addPassthroughCopy("pages/*.js");

  return {
    dir: {
      input: "pages",
      layouts: "_layouts",
      output: "_site",
    }
  };
}
```

The `pages/*.js` passthrough picks up both per-page bundled scripts **and** `compiled-pricing-core.js` (the core bundle). No separate passthrough rule is needed for the core.

### Root `package.json`

```json
{
  "type": "module",
  "scripts": {
    "build:js": "cd pricing-core && npm run build",
    "build:html": "eleventy",
    "build": "npm run build:js && npm run build:html",
    "watch:js": "cd pricing-core && npm run watch",
    "watch:html": "eleventy --serve",
    "dev": "npm-run-all --parallel watch:js watch:html"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0",
    "npm-run-all2": "^8.0.0"
  }
}
```

`"type": "module"` is required because `.eleventy.js` uses `export default` (ESM syntax). `eleventy --serve` runs its own dev server on port 8080, replacing `http-server`.

`watch:html` must be a named script — `npm-run-all` expects script names as arguments, not shell commands. Use `npm-run-all2` (the maintained fork of the abandoned `npm-run-all` v4; same API, drop-in replacement).

## URL format change

11ty's default output turns `pages/foo.html` into `_site/foo/index.html`, producing pretty URLs (`/foo/` rather than `/foo.html`). Two things follow from this:

- Inter-page links in content must drop the `.html` suffix: `href="00-intro-conversion-models.html"` → `href="/00-intro-conversion-models/"`.
- Asset paths in the layout use root-relative `/style.css` (not relative `style.css`), which already matches the 11ty server's expectations.

## esbuild output path

`pricing-core/package.json` builds to `outfile=bundle.js` (i.e. `pricing-core/bundle.js`). The per-page scripts import from `./compiled-pricing-core.js`, which is a **symlink** at `pages/compiled-pricing-core.js → ../pricing-core/bundle.js` — no manual copy involved. No change to the esbuild outfile is needed.

11ty's passthrough copy dereferences symlinks and writes the real file content to `_site/`, so the `pages/*.js` glob picks this up correctly. The symlink must be preserved — do not delete it assuming it is a duplicate.

`bundle.js` is gitignored (`*/bundle.js` in `.gitignore`), so after a fresh checkout the symlink is dangling until esbuild runs. The `build` script runs `build:js` before `build:html`, so this resolves correctly — but the order must not be swapped.

**Dev UX limitation**: 11ty's file watcher watches the symlink's inode, not the symlink target. When esbuild writes a new `bundle.js`, the symlink inode is unchanged and 11ty does not trigger a browser reload. JS changes in dev mode require a manual browser refresh.

## GitHub Actions workflow

The existing `.github/workflows/static.yml` needs three changes:

**`cache-dependency-path`** — currently only watches `pricing-core/package-lock.json`. After migration there is also a root-level lock file, so both must be listed or a root dependency change won't bust the cache:

```yaml
cache-dependency-path: |
  package-lock.json
  pricing-core/package-lock.json
```

**Build steps** — the single `cd pricing-core && npm install && npm run build` becomes two installs (the two packages are independent, so `npm install` at the root does not reach into `pricing-core`) followed by the root build script:

```yaml
- name: Install root dependencies
  run: npm install
- name: Install pricing-core dependencies
  run: cd pricing-core && npm install
- name: Build
  run: npm run build
```

**Upload path** — changes from `pages` to `_site`:

```yaml
- uses: actions/upload-pages-artifact@v3
  with:
    path: '_site'
```

The GitHub Pages source setting in the repository does **not** need to change — it is already set to `build_type: workflow` (GitHub Actions), so the Actions-based deployment continues to work as-is.

## Migration steps

1. **Create root `package.json`** with `"type": "module"` and the scripts above; run `npm install` to pull in `@11ty/eleventy` and `npm-run-all2`. Add `_site/` to `.gitignore`. Commit the generated `package-lock.json` — CI's npm cache depends on it being present at checkout.
2. **Create `.eleventy.js`** at the repo root with the config above.
3. **Create `pages/_layouts/base.njk`** with the shared layout above.
4. **Strip each HTML file** down to front matter + content — purely mechanical, one page at a time. Update any inter-page `href` attributes to drop `.html` suffixes and use root-relative paths.
5. **Remove `serve` and `dev` scripts** from `pricing-core/package.json` (superseded by the root-level `dev` script).
6. **Update `.github/workflows/static.yml`** as described in the GitHub Actions section above.
7. **Smoke-test** with `npm run dev` and verify each page renders correctly before merging.

The migration is safe to do incrementally — pages can be converted one at a time while the rest continue to work, as long as 11ty is configured before any page is stripped.

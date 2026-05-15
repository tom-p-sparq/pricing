# pricing
Interactive explorations of pricing models and optimisation

## Local development

Install dependencies at both levels (first time only):

```bash
npm install
cd pricing-core && npm install && cd ..
```

Then start the dev server from the repository root:

```bash
npm run dev
```

Then open [http://localhost:8080](http://localhost:8080) in a browser.

`npm run dev` runs two things in parallel:
- **esbuild** in watch mode — rebuilds `pricing-core/bundle.js` whenever source files change
- **11ty** in watch mode — rebuilds `_site/` and serves it with live reload

## Production build

```bash
npm run build
```

The built site is output to `_site/`. GitHub Actions deploys this to GitHub Pages at `/pricing/` on pushes to `main`.

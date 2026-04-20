# pricing
Interactive explorations of pricing models and optimisation

## Local development

```bash
cd pricing-core
npm install      # first time only
npm run dev
```

Then open [http://localhost:8080](http://localhost:8080) in Chrome.

`npm run dev` runs two things in parallel:
- **esbuild** in watch mode — rebuilds `bundle.js` whenever source files change
- **http-server** — serves the `pages/` directory with CORS enabled and no caching

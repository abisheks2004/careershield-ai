# CareerShield AI

CareerShield AI is a client-side recruitment scam risk scanner with a small Node API for integrating a future production scoring pipeline.

## Structure

- `src/` - React/Vite frontend
- `src/lib/analyzer.js` - shared heuristic scoring logic
- `server/` - Node HTTP API
- `public/` - static frontend assets

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Run the API separately when needed:

```bash
npm run server
```

The API exposes `GET /api/health` and `POST /api/analyze` with a JSON body containing `type` (`job`, `message`, or `url`) and `input`.

## Build for publishing

```bash
npm run build
npm run preview
```

The generated `dist/` directory is ignored by git and should be deployed by the hosting provider's Vite build workflow. The current UI intentionally labels its local scoring as a demo; connect the API to a production model before treating results as authoritative.

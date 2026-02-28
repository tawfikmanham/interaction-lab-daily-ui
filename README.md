# Interaction Lab Daily UI

Small Next.js playground for interaction experiments and embeddable UI demos.

## Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS

## Run locally
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.

## Key routes
- `/` main interactive page
- `/daily-ui/globe-wireframe` 3D globe interaction (drag to rotate, scroll to zoom)
- `/daily-ui/piano/v3` piano interaction
- `/heart-rate` heart rate demo

## WordPress embed files
Standalone HTML snippets for custom HTML blocks:
- `wordpress-embed-globe.html`
- `wordpress-embed-piano-v1.html`
- `wordpress-embed-piano-v2.html`
- `wordpress-embed-piano-v3.html`
- `wordpress-embed-heart-rate.html`
- `wordpress-embed.html` (payment button)

Public copies are in `public/` for direct preview via local URLs.

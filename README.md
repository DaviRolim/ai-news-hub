# AI News Hub

An information hub curating the most important news in artificial intelligence.

## Tech Stack

**[Astro 6](https://astro.build)** + **[Tailwind CSS v4](https://tailwindcss.com)**

### Why Astro?

- **Zero JS by default** — news hub is content-first; no React overhead needed
- **Static output** — fast CDN-deployable builds, no server required
- **Content Collections** — first-class support for structured news articles with type safety
- **Island architecture** — easy to add interactivity (search, filters) only where needed
- **Fast builds** — ships in seconds on Vercel/Netlify/Cloudflare Pages

### Why Tailwind v4?

- CSS-native configuration — no `tailwind.config.js` to manage
- Vite plugin integration with Astro is seamless
- Utility-first keeps styling co-located and minimal

## Project Structure

```
src/
  components/   — reusable Astro components (NewsCard, etc.)
  layouts/      — page shell (Base.astro)
  pages/        — file-based routing
  styles/       — global.css (Tailwind import)
  content/      — news article data (JSON/Markdown)
public/         — static assets
```

## Commands

| Command         | Action                             |
| --------------- | ---------------------------------- |
| `npm install`   | Install dependencies               |
| `npm run dev`   | Dev server at http://localhost:4321 |
| `npm run build` | Build to `./dist/`                 |
| `npm run preview` | Preview production build         |

## Roadmap

1. RSS feed aggregation pipeline
2. Content collections with schema validation
3. Category filtering
4. Search
5. Deploy to Cloudflare Pages

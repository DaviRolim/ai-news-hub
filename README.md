# AI News Hub

An information hub curating the most important news in artificial intelligence.

## Local Setup

**Project location (managed by Paperclip):**

```
~/.paperclip/instances/default/projects/5ae389e2-6082-4a80-90df-e96d41dc62df/6cf71234-6412-4e42-965e-30949bf8dc0f/_default
```

> No remote repository yet. The project is local-only. To push to GitHub: create a repo, then `git remote add origin <url> && git push -u origin main`.

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

# AI News Hub

An information hub curating the most important news in artificial intelligence.

**Live site:** _Deploy to Cloudflare Pages to get the URL (see Deployment below)_

## Deployment (Cloudflare Pages)

### One-time setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and create a new project.
2. Connect the GitHub repo: `DaviRolim/ai-news-hub`
3. Use these build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Node.js version:** `22`
4. Deploy — Cloudflare will build and host the site automatically.
5. Update this README with the live URL once deployed.

### Automated content refresh

A GitHub Actions workflow (`.github/workflows/refresh-content.yml`) runs every 6 hours:
1. Fetches the latest AI news from RSS feeds
2. Commits updated `src/data/articles.json` if changed
3. The push triggers a Cloudflare Pages rebuild

The workflow can also be triggered manually from the GitHub Actions UI.

## Local Setup

**Project location (managed by Paperclip):**

```
~/.paperclip/instances/default/projects/5ae389e2-6082-4a80-90df-e96d41dc62df/6cf71234-6412-4e42-965e-30949bf8dc0f/_default
```

Also accessible at: `~/playground/ai-news-hub` (symlink)

**GitHub:** https://github.com/DaviRolim/ai-news-hub

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

1. ~~RSS feed aggregation pipeline~~
2. Content collections with schema validation
3. Category filtering
4. Search
5. ~~Deploy to Cloudflare Pages~~

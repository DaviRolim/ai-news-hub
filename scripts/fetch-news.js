/**
 * AI News aggregation pipeline.
 * Fetches RSS feeds, normalizes articles, deduplicates, and writes to src/data/articles.json.
 * Run: node scripts/fetch-news.js
 */

import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'Models' },
  { name: 'Anthropic', url: 'https://www.anthropic.com/news/rss.xml', category: 'Safety' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', category: 'Research' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'Industry' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', category: 'Research' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/feed/', category: 'Industry' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'Industry' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'Tools' },
  { name: 'Ars Technica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'Research' },
  { name: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml', category: 'Research' },
];

const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'llm', 'large language model',
  'gpt', 'claude', 'gemini', 'neural', 'deep learning', 'chatgpt', 'openai', 'anthropic',
  'deepmind', 'transformer', 'generative', 'diffusion', 'foundation model', 'agent',
  'reinforcement learning', 'natural language', 'computer vision', 'multimodal',
];

async function fetchFeed(source) {
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'AI-News-Hub/1.0 (RSS reader)' },
    });
    if (!res.ok) {
      console.warn(`  ${source.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const articles = parseFeed(xml, source);
    console.log(`  ${source.name}: ${articles.length} articles`);
    return articles;
  } catch (e) {
    console.warn(`  ${source.name}: ${e.message}`);
    return [];
  }
}

function parseFeed(xml, source) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
  });

  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch {
    return [];
  }

  // Support RSS 2.0, RSS 1.0 (RDF), and Atom
  const channel = parsed?.rss?.channel ?? parsed?.['rdf:RDF']?.channel ?? parsed?.feed;
  if (!channel) return [];

  const rawItems = channel.item ?? channel.entry ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, 20).flatMap(item => {
    const title = getText(item.title);
    if (!title) return [];

    const url = resolveLink(item.link);
    if (!url) return [];

    const rawDesc = item.description ?? item.summary ?? item['content:encoded'] ?? item.content ?? '';
    const summary = stripHtml(getText(rawDesc)).slice(0, 400).trim();

    const rawDate = item.pubDate ?? item.published ?? item.updated ?? '';
    const publishedAt = normalizeDate(getText(rawDate));

    return [{
      title: title.trim(),
      source: source.name,
      summary: summary || title,
      url,
      publishedAt,
      category: source.category,
    }];
  });
}

function getText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.__cdata ?? val['#text'] ?? '';
  }
  return '';
}

function resolveLink(link) {
  if (!link) return '';
  if (typeof link === 'string') return link;
  if (Array.isArray(link)) {
    // Atom feeds may have multiple <link> elements; prefer the alternate/html one
    const alt = link.find(l => l['@_rel'] === 'alternate' || !l['@_rel']);
    return alt?.['@_href'] ?? link[0]?.['@_href'] ?? '';
  }
  if (typeof link === 'object') {
    return link['@_href'] ?? link['#text'] ?? '';
  }
  return '';
}

function stripHtml(str) {
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function isAIRelevant(article) {
  const text = (article.title + ' ' + article.summary).toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw));
}

function deduplicate(articles) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  return articles.filter(a => {
    const titleKey = a.title.toLowerCase().slice(0, 60);
    if (seenUrls.has(a.url) || seenTitles.has(titleKey)) return false;
    seenUrls.add(a.url);
    seenTitles.add(titleKey);
    return true;
  });
}

async function main() {
  console.log('Fetching AI news...');
  const results = await Promise.all(SOURCES.map(fetchFeed));
  let articles = results.flat();

  console.log(`\nRaw articles: ${articles.length}`);

  articles = articles.filter(isAIRelevant);
  console.log(`After AI relevance filter: ${articles.length}`);

  articles = deduplicate(articles);
  console.log(`After deduplication: ${articles.length}`);

  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  articles = articles.slice(0, 50);

  const outDir = join(__dirname, '../src/data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'articles.json'), JSON.stringify(articles, null, 2));

  console.log(`\nSaved ${articles.length} articles to src/data/articles.json`);
  if (articles.length > 0) {
    console.log(`Latest: "${articles[0].title}" (${articles[0].publishedAt})`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

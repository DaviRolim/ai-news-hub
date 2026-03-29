export interface ArticleRecord {
  title: string;
  source: string;
  summary: string;
  content?: string;
  url: string;
  publishedAt: string;
  category?: string;
}

export interface Article extends ArticleRecord {
  category: string;
  content: string;
  slug: string;
  formattedDate: string;
  readingMinutes: number;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function createArticles(rawArticles: ArticleRecord[]): Article[] {
  const slugCounts = new Map<string, number>();

  return rawArticles.map((article) => {
    const content = normalizeCopy(article.content || article.summary || article.title);
    const summary = normalizeCopy(article.summary || content || article.title);
    const baseSlug = slugify(article.title);
    const slugCount = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, slugCount + 1);

    return {
      ...article,
      category: article.category || 'General',
      summary,
      content,
      slug: slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`,
      formattedDate: formatDate(article.publishedAt),
      readingMinutes: estimateReadingTime(content),
    };
  });
}

export function getRelatedArticles(articles: Article[], currentArticle: Article, limit = 3): Article[] {
  const sameCategory = articles.filter(
    (article) => article.slug !== currentArticle.slug && article.category === currentArticle.category,
  );
  const otherStories = articles.filter(
    (article) => article.slug !== currentArticle.slug && article.category !== currentArticle.category,
  );

  return [...sameCategory, ...otherStories].slice(0, limit);
}

export function createParagraphs(copy: string, sentencesPerParagraph = 2): string[] {
  const sentences = normalizeCopy(copy)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (sentences.length <= sentencesPerParagraph) {
    return [normalizeCopy(copy)];
  }

  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(index, index + sentencesPerParagraph).join(' '));
  }

  return paragraphs;
}

function normalizeCopy(copy: string): string {
  return copy.replace(/\s+/g, ' ').trim();
}

function formatDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? publishedAt : dateFormatter.format(date);
}

function estimateReadingTime(copy: string): number {
  const words = copy.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'article';
}

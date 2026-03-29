import type { ArticleRecord, Article } from './articles';
import { createArticles } from './articles';

export interface VideoRecord {
  videoId: string;
  title: string;
  channelName: string;
  summary: string;
  description?: string;
  thumbnailUrl: string;
  publishedAt: string;
  url: string;
  type: 'video';
}

export function createVideos(rawVideos: VideoRecord[]): Article[] {
  const asArticles: ArticleRecord[] = rawVideos.map((v) => ({
    title: v.title,
    source: v.channelName,
    summary: v.summary,
    content: v.description || v.summary,
    url: v.url,
    publishedAt: v.publishedAt,
    category: 'Video',
    videoId: v.videoId,
    thumbnailUrl: v.thumbnailUrl,
    channelName: v.channelName,
    type: 'video' as const,
  }));

  return createArticles(asArticles);
}

export function mergeContent(articles: Article[], videos: Article[]): Article[] {
  return [...articles, ...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

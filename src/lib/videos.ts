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
  channelUrl?: string;
  keyPoints?: string[];
  type: 'video';
}

export interface Video extends Article {
  videoId: string;
  thumbnailUrl: string;
  channelName: string;
  channelUrl: string;
  keyPoints: string[];
  videoUrl: string;
  embedUrl: string;
  description: string;
  type: 'video';
}

export function createVideos(rawVideos: VideoRecord[]): Video[] {
  const asArticles: ArticleRecord[] = rawVideos.map((v) => ({
    title: v.title,
    source: v.channelName,
    summary: v.summary,
    content: v.description || v.summary || v.title,
    description: v.description || v.summary || v.title,
    url: v.url,
    publishedAt: v.publishedAt,
    category: 'Video',
    videoId: v.videoId,
    thumbnailUrl: v.thumbnailUrl,
    channelName: v.channelName,
    channelUrl: v.channelUrl || v.url,
    keyPoints: v.keyPoints || [],
    type: 'video' as const,
  }));

  return createArticles(asArticles)
    .filter((video): video is Article & Required<Pick<Article, 'videoId' | 'thumbnailUrl'>> => Boolean(video.videoId && video.thumbnailUrl))
    .map((video) => ({
      ...video,
      videoId: video.videoId,
      thumbnailUrl: video.thumbnailUrl,
      channelName: video.channelName || video.source,
      channelUrl: video.channelUrl || video.url,
      keyPoints: Array.isArray(video.keyPoints) ? video.keyPoints.filter(Boolean) : [],
      videoUrl: video.url,
      embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
      description: video.description || video.content,
      type: 'video' as const,
    }));
}

export function mergeContent(articles: Article[], videos: Article[]): Article[] {
  return [...articles, ...videos].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getRelatedVideos(videos: Video[], currentVideo: Video, limit = 3): Video[] {
  const sameChannel = videos.filter(
    (video) => video.slug !== currentVideo.slug && video.channelName === currentVideo.channelName,
  );
  const otherVideos = videos.filter(
    (video) => video.slug !== currentVideo.slug && video.channelName !== currentVideo.channelName,
  );

  return [...sameChannel, ...otherVideos].slice(0, limit);
}

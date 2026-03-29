/**
 * YouTube video fetching pipeline.
 * Fetches YouTube Atom feeds for AI-focused channels, normalizes videos, and writes to src/data/videos.json.
 * Run: node scripts/fetch-youtube.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchTranscript } from '../node_modules/youtube-transcript/dist/youtube-transcript.esm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const MAX_VIDEOS_PER_FETCH = 30;
const MAX_KEY_POINTS = 5;
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const YOUTUBE_CHANNELS = [
  { name: 'Nate B Jones', channelId: 'UC0C-17n9iuUQPylguM1d-lQ', handle: '@NateBJones' },
  { name: 'Greg Isenberg', channelId: 'UCPjNBjflYl0-HQtUvOx0Ibw', handle: '@GregIsenberg' },
  { name: 'IndyDevDan', channelId: 'UC_x36zCEGilGpB1m-V4gmjg', handle: '@IndyDevDan' },
  { name: 'Jaymin West', channelId: 'UCtrGZc-hme--8LECM0dMS5A', handle: '@jaymin-west' },
  { name: 'Nate Herk', channelId: 'UC2ojq-nuP8ceeHqiroeKhBA', handle: '@nateherk' },
  { name: 'Matt Wolfe', channelId: 'UChpleBmo18P08aKCIgti38g', handle: '@mreflow' },
];

async function fetchChannelVideos(channel) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'AI-News-Hub/1.0 (RSS reader)' },
    });
    if (!res.ok) {
      console.warn(`  ${channel.name}: HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const videos = parseAtomFeed(xml, channel);
    console.log(`  ${channel.name}: ${videos.length} videos`);
    return videos;
  } catch (e) {
    console.warn(`  ${channel.name}: ${e.message}`);
    return [];
  }
}

function parseAtomFeed(xml, channel) {
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

  const feed = parsed?.feed;
  if (!feed) return [];

  const rawEntries = feed.entry ?? [];
  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  return entries.slice(0, 5).flatMap(entry => {
    const videoId = getText(entry['yt:videoId']);
    if (!videoId) return [];

    const title = getText(entry.title);
    if (!title) return [];

    const mediaGroup = entry['media:group'] ?? {};
    const description = getText(mediaGroup['media:description'] ?? entry.summary ?? '');
    const thumbnailUrl =
      mediaGroup['media:thumbnail']?.['@_url'] ??
      `https://i4.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const publishedAt = normalizeDate(getText(entry.published ?? entry.updated ?? ''));

    return [{
      videoId,
      title: title.trim(),
      channelName: channel.name,
      summary: createFallbackSummary(description, title),
      description: description.trim(),
      thumbnailUrl,
      publishedAt,
      channelUrl: `https://www.youtube.com/${channel.handle}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      type: 'video',
    }];
  });
}

function getText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return val.__cdata ?? val['#text'] ?? '';
  return '';
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

function deduplicateByVideoId(videos) {
  const seen = new Set();
  return videos.filter(v => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
}

function normalizeCopy(copy) {
  return copy.replace(/\s+/g, ' ').trim();
}

function createFallbackSummary(description, title) {
  const normalized = normalizeCopy(description || title);
  return normalized.slice(0, 400).trim() || title.trim();
}

async function fetchTranscriptText(videoId) {
  try {
    const transcript = await fetchTranscript(videoId);
    return normalizeCopy(transcript.map((segment) => segment.text).join(' '));
  } catch (error) {
    console.warn(`  transcript ${videoId}: ${error.message}`);
    return '';
  }
}

async function generateSummaryFromTranscript(video, transcriptText) {
  const fallbackSummary = createFallbackSummary(video.description, video.title);

  if (!transcriptText || !anthropic) {
    return {
      summary: fallbackSummary,
      keyPoints: [],
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `Summarize this AI-focused YouTube video transcript as strict JSON.\n\nReturn exactly this shape:\n{\"summary\":\"2-3 sentences\",\"keyPoints\":[\"point 1\",\"point 2\"]}\n\nRules:\n- summary must be 2-3 concise sentences\n- keyPoints must contain 3-5 items\n- each key point must be a short sentence fragment\n- no markdown fences\n- no extra keys\n\nTitle: ${video.title}\nChannel: ${video.channelName}\nTranscript:\n${transcriptText}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');

    const parsed = JSON.parse(text);
    const summary = typeof parsed.summary === 'string' ? normalizeCopy(parsed.summary) : fallbackSummary;
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints
          .filter((point) => typeof point === 'string')
          .map((point) => normalizeCopy(point))
          .filter(Boolean)
          .slice(0, MAX_KEY_POINTS)
      : [];

    return {
      summary: summary || fallbackSummary,
      keyPoints,
    };
  } catch (error) {
    console.warn(`  summary ${video.videoId}: ${error.message}`);
    return {
      summary: fallbackSummary,
      keyPoints: [],
    };
  }
}

async function enrichVideo(video) {
  const transcriptText = await fetchTranscriptText(video.videoId);
  const { summary, keyPoints } = await generateSummaryFromTranscript(video, transcriptText);

  return {
    ...video,
    summary,
    keyPoints,
  };
}

async function main() {
  console.log('Fetching YouTube videos...');
  const results = await Promise.all(YOUTUBE_CHANNELS.map(fetchChannelVideos));
  let videos = results.flat();

  console.log(`\nRaw videos: ${videos.length}`);

  videos = deduplicateByVideoId(videos);
  console.log(`After deduplication: ${videos.length}`);

  videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  videos = videos.slice(0, MAX_VIDEOS_PER_FETCH);

  console.log(`Generating summaries for ${videos.length} videos...`);
  videos = await Promise.all(videos.map(enrichVideo));

  const outDir = join(__dirname, '../src/data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'videos.json'), JSON.stringify(videos, null, 2));

  console.log(`\nSaved ${videos.length} videos to src/data/videos.json`);
  if (videos.length > 0) {
    console.log(`Latest: "${videos[0].title}" by ${videos[0].channelName} (${videos[0].publishedAt})`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

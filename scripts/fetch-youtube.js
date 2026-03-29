/**
 * YouTube video fetching pipeline.
 * Fetches YouTube Atom feeds for AI-focused channels, normalizes videos, and writes to src/data/videos.json.
 * Run: node scripts/fetch-youtube.js
 */

import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      summary: description.slice(0, 400).trim() || title.trim(),
      description: description.trim(),
      thumbnailUrl,
      publishedAt,
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

async function main() {
  console.log('Fetching YouTube videos...');
  const results = await Promise.all(YOUTUBE_CHANNELS.map(fetchChannelVideos));
  let videos = results.flat();

  console.log(`\nRaw videos: ${videos.length}`);

  videos = deduplicateByVideoId(videos);
  console.log(`After deduplication: ${videos.length}`);

  videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

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

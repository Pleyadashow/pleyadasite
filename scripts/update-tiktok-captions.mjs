// Refreshes the caption + sound-line text inside the existing TikTok
// blockquotes in index.html, using TikTok's public oEmbed endpoint.
// It only updates text for the video IDs already present in the file —
// it cannot discover new videos (oEmbed requires a known video URL).

import { readFile, writeFile } from "node:fs/promises";

const INDEX_HTML_PATH = new URL("../index.html", import.meta.url);
const REQUEST_DELAY_MS = 800;
const FETCH_TIMEOUT_MS = 10_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalizeCaption(title) {
  return title.trim().replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ");
}

async function fetchOEmbed(videoId) {
  const videoUrl = `https://www.tiktok.com/@.pleyadashow/video/${videoId}`;
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PleyadashowCaptionBot/1.0)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const caption = normalizeCaption(data.title || "");

    // The sound/music line is the last <a>...</a> inside oEmbed's `html` field,
    // e.g. <a ... title="♬ Булька - Назар Савко" ...>♬ Булька - Назар Савко</a>
    const soundMatch = /<a[^>]*title="♬\s*([^"]+)"[^>]*>/.exec(data.html || "");
    const sound = soundMatch ? soundMatch[1].trim() : null;

    return { caption, sound };
  } finally {
    clearTimeout(timeout);
  }
}

function updateBlock(block, { caption, sound }) {
  let updated = block;
  if (caption) {
    updated = updated.replace(/<p>[\s\S]*?<\/p>/, `<p>${escapeHtml(caption)}</p>`);
  }
  if (sound) {
    updated = updated.replace(
      /(<a target="_blank" href="https:\/\/www\.tiktok\.com\/@\.pleyadashow\/video\/\d+\?refer=embed">)[\s\S]*?(<\/a>)/,
      `$1${escapeHtml(sound)}$2`
    );
  }
  return updated;
}

async function main() {
  const html = await readFile(INDEX_HTML_PATH, "utf8");

  const blockRe = /<blockquote class="tiktok-embed"[^>]*data-video-id="(\d+)"[^>]*>[\s\S]*?<\/blockquote>/g;
  const blocks = [...html.matchAll(blockRe)];

  if (blocks.length === 0) {
    console.log("No TikTok blockquotes found in index.html — nothing to do.");
    return;
  }

  console.log(`Found ${blocks.length} TikTok video blocks. Fetching fresh captions...`);

  let result = html;
  let changedCount = 0;

  for (const match of blocks) {
    const [originalBlock, videoId] = match;
    try {
      const fresh = await fetchOEmbed(videoId);
      const updatedBlock = updateBlock(originalBlock, fresh);
      if (updatedBlock !== originalBlock) {
        result = result.replace(originalBlock, updatedBlock);
        changedCount += 1;
        console.log(`  [${videoId}] caption updated.`);
      } else {
        console.log(`  [${videoId}] unchanged.`);
      }
    } catch (err) {
      console.warn(`  [${videoId}] skipped — oEmbed fetch failed: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (changedCount === 0) {
    console.log("No caption changes — index.html left untouched.");
    return;
  }

  await writeFile(INDEX_HTML_PATH, result, "utf8");
  console.log(`Updated ${changedCount} caption(s) in index.html.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

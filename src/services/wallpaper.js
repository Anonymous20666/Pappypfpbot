const axios = require('axios');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const { Wallpaper, Channel } = require('../database/models');
const { getWallpaperCategoryDir, downloadFile } = require('../utils/storage');
const { sleep } = require('../utils/helpers');

const CATEGORIES = [
  'girls', 'boys', 'anime', 'cars', 'nature',
  'gaming', 'aesthetic', 'weekend_specials', 'monthly_collections',
];

const CATEGORY_QUERIES = {
  girls: 'beautiful girl portrait aesthetic wallpaper 8k ultra HD tall',
  boys: 'handsome man portrait aesthetic wallpaper 8k ultra HD tall',
  anime: 'anime wallpaper 8k ultra HD aesthetic tall portrait',
  cars: 'luxury sports car wallpaper 8k ultra HD',
  nature: 'nature landscape wallpaper 8k ultra HD tall',
  gaming: 'gaming wallpaper 8k ultra HD aesthetic',
  aesthetic: 'aesthetic wallpaper 8k ultra HD pastel tall',
  weekend_specials: 'weekend vibes aesthetic wallpaper 8k ultra HD',
  monthly_collections: 'monthly wallpaper collection aesthetic 8k ultra HD',
};

async function fetchWallpapers(category, count = 10) {
  const query = CATEGORY_QUERIES[category] || `${category} wallpaper 4k`;
  const images = [];

  if (config.apis.pexelsKey) {
    try {
      const r = await axios.get('https://api.pexels.com/v1/search', {
        params: { query, per_page: count, page: Math.floor(Math.random() * 5) + 1, orientation: 'portrait' },
        headers: { Authorization: config.apis.pexelsKey },
        timeout: 10000,
      });
      for (const photo of (r.data?.photos || [])) {
        images.push({
          url: photo.src?.original || photo.src?.large2x,
          width: photo.width,
          height: photo.height,
          source: 'pexels',
        });
      }
    } catch (e) {
      logger.warn(`Pexels fetch (${category}): ${e.message}`);
    }
  }

  if (images.length < count && config.apis.unsplashKey) {
    try {
      const r = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: count - images.length, page: Math.floor(Math.random() * 5) + 1, orientation: 'portrait' },
        headers: { Authorization: `Client-ID ${config.apis.unsplashKey}` },
        timeout: 10000,
      });
      for (const photo of (r.data?.results || [])) {
        images.push({
          url: photo.urls?.raw ? `${photo.urls.raw}&w=4320&h=7680&fit=crop&q=100` : (photo.urls?.full || photo.urls?.regular),
          width: photo.width,
          height: photo.height,
          source: 'unsplash',
        });
      }
    } catch (e) {
      logger.warn(`Unsplash fetch (${category}): ${e.message}`);
    }
  }

  return images;
}

async function downloadAndStoreWallpapers(category, count = 5) {
  const images = await fetchWallpapers(category, count);
  const dir = getWallpaperCategoryDir(category);
  const stored = [];

  for (const img of images) {
    try {
      const existing = await Wallpaper.findOne({ url: img.url });
      if (existing) continue;

      const filename = `wp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const localPath = path.join(dir, filename);
      await downloadFile(img.url, localPath);

      const wp = await Wallpaper.create({
        category,
        url: img.url,
        localPath,
        source: img.source,
        width: img.width,
        height: img.height,
      });
      stored.push(wp);
      await sleep(500);
    } catch (e) {
      logger.warn(`Download wallpaper: ${e.message}`);
    }
  }

  return stored;
}

async function getUnpostedWallpapers(category, platform, limit = 5) {
  const query = { category };
  if (platform === 'telegram') query.postedToTg = false;
  if (platform === 'whatsapp') query.postedToWa = false;

  return Wallpaper.find(query).sort({ addedAt: 1 }).limit(limit);
}

async function postWallpapersToTelegram(bot, category) {
  const channel = config.channels.telegram;
  if (!channel) return [];

  const wallpapers = await getUnpostedWallpapers(category, 'telegram', 5);
  if (!wallpapers.length) return [];

  const posted = [];
  const displayName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const hashtag = `#${category.replace(/_/g, '')}`;
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (wallpapers.length >= 2) {
    const mediaGroup = wallpapers.slice(0, 10).map((wp, i) => {
      const source = wp.localPath && fs.existsSync(wp.localPath)
        ? { source: wp.localPath }
        : wp.url;
      return {
        type: 'photo',
        media: typeof source === 'string' ? source : source,
        ...(i === 0 ? {
          caption: `${displayName} \u2022 Daily Drop\n${dateStr}\n\n${hashtag} #wallpaper #HD #${config.bot.name}\n\nBy @${config.bot.name}`,
          parse_mode: 'Markdown',
        } : {}),
      };
    });

    try {
      await bot.telegram.sendMediaGroup(channel, mediaGroup);
      for (const wp of wallpapers) {
        wp.postedToTg = true;
        await wp.save();
        posted.push(wp);
      }
    } catch (e) {
      logger.warn(`Media group post to TG channel: ${e.message}`);
      for (const wp of wallpapers) {
        try {
          const source = wp.localPath && fs.existsSync(wp.localPath)
            ? { source: wp.localPath }
            : wp.url;
          await bot.telegram.sendPhoto(channel, source, {
            caption: `${displayName} \u2022 Daily Drop\n\n${hashtag} #wallpaper #HD\n\nBy ${config.bot.name}`,
          });
          wp.postedToTg = true;
          await wp.save();
          posted.push(wp);
          await sleep(2000);
        } catch (e2) {
          logger.warn(`Fallback post to TG channel: ${e2.message}`);
        }
      }
    }
  } else {
    for (const wp of wallpapers) {
      try {
        const source = wp.localPath && fs.existsSync(wp.localPath)
          ? { source: wp.localPath }
          : wp.url;
        await bot.telegram.sendPhoto(channel, source, {
          caption: `${displayName} \u2022 Daily Drop\n${dateStr}\n\n${hashtag} #wallpaper #HD\n\nBy ${config.bot.name}`,
        });
        wp.postedToTg = true;
        await wp.save();
        posted.push(wp);
        await sleep(2000);
      } catch (e) {
        logger.warn(`Post to TG channel: ${e.message}`);
      }
    }
  }

  return posted;
}

async function runDailyWallpaperJob(bot) {
  logger.info('Running daily wallpaper job');

  for (const category of CATEGORIES) {
    try {
      await downloadAndStoreWallpapers(category, 3);
      await postWallpapersToTelegram(bot, category);
      await sleep(5000);
    } catch (e) {
      logger.error(`Wallpaper job (${category}): ${e.message}`);
    }
  }

  logger.info('Daily wallpaper job complete');
}

module.exports = {
  CATEGORIES, fetchWallpapers, downloadAndStoreWallpapers,
  getUnpostedWallpapers, postWallpapersToTelegram, runDailyWallpaperJob,
};

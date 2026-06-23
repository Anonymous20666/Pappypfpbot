const K = require('../handlers/keyboards');
const config = require('../config');
const { isOwner, checkForceJoin } = require('../middleware/auth');
const { Channel } = require('../database/models');

async function start(ctx, bot) {
  const canUse = await checkForceJoin(ctx, bot);
  if (!canUse) return;

  const name = ctx.from?.first_name || 'User';
  const owner = isOwner(ctx.from?.id);

  const channels = await Channel.find({ isActive: true });
  const waChannels = channels.filter(c => c.platform === 'whatsapp');
  const tgChannels = channels.filter(c => c.platform === 'telegram');

  let channelText = '';
  if (tgChannels.length) {
    channelText += '\n\n\ud83d\udce2 *Our Telegram Channel:*\n' + tgChannels.map(c => c.link).join('\n');
  }
  if (waChannels.length) {
    channelText += '\n\n\ud83d\udcf1 *WhatsApp Channel:*\n' + waChannels.map(c => c.link).join('\n');
  }

  await ctx.reply(
    `\u2728 *Welcome to ${config.bot.name}, ${name}!* \u2728\n\n` +
    `Your premium WhatsApp & Media management bot.\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n` +
    `\ud83d\uddbc *HD Profile Pictures* \u2014 Zero cropping, full quality\n` +
    `\ud83d\udd04 *Auto-Rotate PFP* \u2014 Schedule automatic changes\n` +
    `\ud83d\udc65 *Group PFP Changer* \u2014 Instant or daily scheduled\n` +
    `\ud83d\udd0d *Image Search* \u2014 HD images, up to 20 per page\n` +
    `\u2b07\ufe0f *Media Downloader* \u2014 8+ platforms supported\n` +
    `\ud83c\udf05 *Wallpaper Gallery* \u2014 Curated HD collections\n` +
    `\ud83d\udcf1 *Multi-Account* \u2014 Manage unlimited WA accounts` +
    `${channelText}\n\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `_Tap a button below to get started:_`,
    { parse_mode: 'Markdown', reply_markup: K.mainMenu(owner) }
  );
}

module.exports = { start };

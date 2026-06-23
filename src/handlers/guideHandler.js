const K = require('./keyboards');
const config = require('../config');

async function start(ctx) {
  await ctx.editMessageText(
    `\ud83d\udcd6 *${config.bot.name} \u2014 User Guide*\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n` +
    `\ud83d\udcf1 *Pair WhatsApp*\n` +
    `Link your WhatsApp account to manage your profile picture remotely. ` +
    `Enter your phone number with country code, then choose Code or QR pairing.\n\n` +
    `\ud83d\uddbc *Change Profile Picture*\n` +
    `After pairing, send any image to set it as your WhatsApp PFP. ` +
    `Full HD quality with zero cropping.\n\n` +
    `\ud83d\udd04 *Auto-Change PFP*\n` +
    `Schedule automatic PFP rotation. Choose hourly or daily intervals, ` +
    `upload your images, and the bot cycles through them automatically.\n\n` +
    `\ud83d\udc65 *Group PFP Changer*\n` +
    `Change any WhatsApp group's profile picture. Send the image, ` +
    `then the group invite link. The bot joins, sets the PFP, and leaves.\n` +
    `_Note: The group must allow the bot to be promoted to admin._\n\n` +
    `\ud83d\udd0d *Image Search*\n` +
    `Search for HD images by keyword. Results come in batches of 20 ` +
    `with a "View More" option for endless browsing.\n\n` +
    `\u2b07\ufe0f *Media Downloader*\n` +
    `Download videos and images from Pinterest, TikTok, Instagram, ` +
    `Twitter/X, YouTube, Facebook, Threads, and Reddit. ` +
    `Use Auto Detect or choose a specific platform.\n\n` +
    `\ud83c\udf05 *Wallpaper Gallery*\n` +
    `Browse curated HD wallpapers by category: Girls, Boys, Anime, ` +
    `Cars, Nature, Gaming, Aesthetic, and more.\n\n` +
    `\ud83d\udce9 *Support*\n` +
    `Have an issue or question? Send a message through Support ` +
    `and the team will reply directly in chat.\n\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\ud83d\udca1 *Tip:* Use /start anytime to return to the main menu.`,
    { parse_mode: 'Markdown', reply_markup: K.backMain() }
  ).catch(() => ctx.reply('Use /start to see the main menu.', { reply_markup: K.backMain() }));
}

module.exports = { start };

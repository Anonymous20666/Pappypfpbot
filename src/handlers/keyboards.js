const config = require('../config');

const K = {
  mainMenu(owner = false) {
    const b = [
      [{ text: '\ud83d\uddbc Image Search', callback_data: 'pinterest' }, { text: '\ud83d\udcf1 Pair WhatsApp', callback_data: 'pair_wa', color: 'green' }],
      [{ text: '\ud83d\udc64 My Accounts', callback_data: 'paired' }, { text: '\ud83d\udc65 Group PFP', callback_data: 'group_pfp' }],
      [{ text: '\u2b07\ufe0f Download Media', callback_data: 'download' }, { text: '\ud83c\udf05 Wallpapers', callback_data: 'wallpapers' }],
      [{ text: '\ud83d\udcd6 User Guide', callback_data: 'guide', color: 'dark' }],
      [{ text: '\ud83d\udce9 Support', callback_data: 'support' }],
    ];
    if (owner) b.push([{ text: '\ud83d\udd27 Owner Panel', callback_data: 'owner', color: 'dark' }]);
    return { inline_keyboard: b };
  },

  accountMenu(num) {
    return { inline_keyboard: [
      [{ text: '\ud83d\uddbc Set Profile Picture', callback_data: `set_pfp:${num}`, color: 'green' }],
      [{ text: '\ud83d\udc41 View Current PFP', callback_data: `get_pfp:${num}` }, { text: '\ud83d\uddd1 Remove PFP', callback_data: `del_pfp:${num}`, color: 'red' }],
      [{ text: '\ud83d\udd04 Auto Change PFP', callback_data: `auto_pfp:${num}` }],
      [{ text: '\u23f9 Stop Auto Change', callback_data: `stop_auto:${num}`, color: 'red' }],
      [{ text: '\u26a0\ufe0f Purge Session', callback_data: `purge:${num}`, color: 'red' }],
      [{ text: '\u25c0\ufe0f Back', callback_data: 'paired', color: 'dark' }],
    ]};
  },

  afterPair(num) {
    return { inline_keyboard: [
      [{ text: '\ud83d\uddbc Set Profile Picture', callback_data: `set_pfp:${num}`, color: 'green' }],
      [{ text: '\ud83d\udd12 Make Permanent', callback_data: `perm:${num}` }],
      [{ text: '\ud83d\uddd1 Delete Session', callback_data: `purge:${num}`, color: 'red' }],
      [{ text: '\ud83c\udfe0 Main Menu', callback_data: 'main_menu', color: 'dark' }],
    ]};
  },

  autoMenu(num) {
    return { inline_keyboard: [
      [{ text: '\u23f0 Hour Based', callback_data: `auto_hour:${num}` }, { text: '\ud83d\udcc5 Day Based', callback_data: `auto_day:${num}` }],
      [{ text: '\u25c0\ufe0f Back', callback_data: `account:${num}`, color: 'dark' }],
    ]};
  },

  groupPfpMenu() {
    return { inline_keyboard: [
      [{ text: '\u26a1 Immediate Change', callback_data: 'gpfp_immediate', color: 'green' }],
      [{ text: '\ud83d\udcc5 Scheduled Daily Change', callback_data: 'gpfp_scheduled' }],
      [{ text: '\ud83d\udcca My Active Tasks', callback_data: 'gpfp_tasks', color: 'dark' }],
      [{ text: '\u25c0\ufe0f Back', callback_data: 'main_menu', color: 'dark' }],
    ]};
  },

  downloadMenu() {
    return { inline_keyboard: [
      [{ text: '\ud83d\udccc Pinterest', callback_data: 'dl_pinterest' }, { text: '\ud83c\udfb5 TikTok', callback_data: 'dl_tiktok' }],
      [{ text: '\ud83d\udcf7 Instagram', callback_data: 'dl_instagram' }, { text: '\ud83d\udc26 Twitter/X', callback_data: 'dl_twitter' }],
      [{ text: '\u25b6\ufe0f YouTube', callback_data: 'dl_youtube' }, { text: '\ud83d\udcf9 Facebook', callback_data: 'dl_facebook' }],
      [{ text: '\ud83e\uddf5 Threads', callback_data: 'dl_threads' }, { text: '\ud83e\udd16 Reddit', callback_data: 'dl_reddit' }],
      [{ text: '\ud83d\udd0d Auto Detect (paste any URL)', callback_data: 'dl_auto', color: 'green' }],
      [{ text: '\u25c0\ufe0f Back', callback_data: 'main_menu', color: 'dark' }],
    ]};
  },

  wallpaperCategories() {
    return { inline_keyboard: [
      [{ text: '\ud83d\udc69 Girls', callback_data: 'wp_girls' }, { text: '\ud83d\udc68 Boys', callback_data: 'wp_boys' }],
      [{ text: '\ud83c\udfad Anime', callback_data: 'wp_anime' }, { text: '\ud83d\ude97 Cars', callback_data: 'wp_cars' }],
      [{ text: '\ud83c\udf3f Nature', callback_data: 'wp_nature' }, { text: '\ud83c\udfae Gaming', callback_data: 'wp_gaming' }],
      [{ text: '\u2728 Aesthetic', callback_data: 'wp_aesthetic' }],
      [{ text: '\ud83c\udf1f Weekend Specials', callback_data: 'wp_weekend_specials', color: 'green' }],
      [{ text: '\ud83d\udcc6 Monthly Collections', callback_data: 'wp_monthly_collections', color: 'green' }],
      [{ text: '\u25c0\ufe0f Back', callback_data: 'main_menu', color: 'dark' }],
    ]};
  },

  pinterestBottom(q, page) {
    return { inline_keyboard: [[
      { text: '\u27a1\ufe0f View More', callback_data: `pi_more:${page + 1}:${q}`, color: 'green' },
      { text: '\ud83c\udfe0 Main Menu', callback_data: 'main_menu', color: 'dark' },
    ]]};
  },

  ownerPanel() {
    return { inline_keyboard: [
      [{ text: '\ud83d\udd04 Restart Bot', callback_data: 'o_restart', color: 'red' }],
      [{ text: '\ud83d\udd17 Force Join Settings', callback_data: 'o_fj' }, { text: '\ud83d\udce2 Channels', callback_data: 'o_channels' }],
      [{ text: '\ud83d\udce3 Broadcast', callback_data: 'o_broadcast', color: 'green' }, { text: '\ud83d\udcca Statistics', callback_data: 'o_stats', color: 'dark' }],
      [{ text: '\ud83d\udc65 Users', callback_data: 'o_users' }],
      [{ text: '\ud83d\udcf1 Owner WA Status', callback_data: 'o_wa_status', color: 'green' }],
      [{ text: '\ud83d\udd10 Set Owner WA Number', callback_data: 'o_wa_set' }],
      [{ text: '\ud83d\udd17 Pair Owner WA', callback_data: 'o_wa_pair', color: 'green' }],
      [{ text: '\ud83c\udfe0 Main Menu', callback_data: 'main_menu', color: 'dark' }],
    ]};
  },

  confirm(yes, no = 'main_menu') {
    return { inline_keyboard: [[
      { text: '\u2705 Confirm', callback_data: yes, color: 'green' },
      { text: '\u274c Cancel', callback_data: no, color: 'red' },
    ]]};
  },

  back(to) { return { inline_keyboard: [[{ text: '\u25c0\ufe0f Back', callback_data: to, color: 'dark' }]] }; },
  backMain() { return { inline_keyboard: [[{ text: '\ud83c\udfe0 Main Menu', callback_data: 'main_menu', color: 'dark' }]] }; },
};

module.exports = K;

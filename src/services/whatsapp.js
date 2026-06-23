const fs = require('fs');
const pino = require('pino');
const sharp = require('sharp');
const { getUserSessionDir, isSessionDirValid, cleanCorruptedSession, deleteDir } = require('../utils/storage');
const { Session } = require('../database/models');
const config = require('../config');
const logger = require('../utils/logger');
const { sleep } = require('../utils/helpers');

const active = new Map();

let _lib = null;
async function lib() {
  if (_lib) return _lib;
  _lib = require('@crysnovax/baileys');
  return _lib;
}

async function createWhatsAppSession(telegramId, whatsappNumber, { onCode, onQR, onConnected, onDisconnected } = {}) {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
  } = await lib();

  const dir = getUserSessionDir(telegramId, whatsappNumber);
  const isFreshPairing = (onCode || onQR);

  if (isFreshPairing) {
    deleteDir(dir);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    cleanCorruptedSession(dir);
  }

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  let { version } = await fetchLatestBaileysVersion();
  if (!version) version = [2, 3000, 1017531287];

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    logger: pino({ level: 'silent' }),
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 3,
    fireInitQueries: true,
    emitOwnEvents: false,
    transactionOpts: { maxCommitRetries: 3, delayBetweenTriesMs: 1000 },
    getMessage: async (key) => {
      return { conversation: '' };
    },
  });

  const key = `${telegramId}:${whatsappNumber}`;
  active.set(key, sock);
  sock.ev.on('creds.update', saveCreds);

  let pairingRequested = false;
  let pairingCodeSent = false;
  let pairingCodeSentAt = 0;
  let connectionResolved = false;
  const isPairing = !state.creds.registered;

  // For code-based pairing, request the code after a short delay (matching working bot pattern).
  // This avoids waiting for the QR event which can have timing issues.
  if (isPairing && onCode) {
    setTimeout(async () => {
      if (pairingRequested || connectionResolved) return;
      const cleanNumber = whatsappNumber.replace(/\D/g, '');
      let code;
      let lastErr;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          if (attempt > 1) await delay(3000 * attempt);
          code = await sock.requestPairingCode(cleanNumber, 'PAPPYBOT');
          if (code && typeof code === 'string') break;
        } catch (e) {
          lastErr = e;
          const sc = e?.output?.statusCode;
          logger.warn(`Pairing attempt ${attempt}/5: ${e.message} (${sc})`);
          if (sc === 401 || sc === 403 || sc === 404) break;
          if (attempt === 5) break;
        }
      }
      if (code) {
        pairingRequested = true;
        pairingCodeSent = true;
        pairingCodeSentAt = Date.now();
        logger.info(`Pairing code generated for ${whatsappNumber}: ${code}`);
        try { await onCode(code); } catch (e) { logger.warn(`onCode callback failed: ${e.message}`); }
      } else {
        logger.warn(`All pairing code attempts failed for ${whatsappNumber}`);
      }
    }, 1500);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // For QR-based pairing, pass the QR to the callback
    if (qr && isPairing && !pairingRequested && !connectionResolved && onQR) {
      await onQR(qr);
    }

    if (connection === 'open') {
      connectionResolved = true;
      logger.info(`WA connected: ${whatsappNumber}`);
      await Session.findOneAndUpdate(
        { telegramId: String(telegramId), whatsappNumber },
        {
          isActive: true, lastConnected: new Date(),
          failCount: 0, lastError: null,
        },
        { upsert: true }
      ).catch(() => {});
      if (onConnected) onConnected(sock);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.error;
      logger.info(`WA closed: ${whatsappNumber} (code=${statusCode}, reason=${reason})`);

      // During pairing, loggedOut before code is entered is normal WA behavior - ignore it
      if (isPairing && pairingCodeSent) {
        const timeSinceCode = Date.now() - pairingCodeSentAt;
        const keepAlive = 3 * 60 * 1000;
        if (timeSinceCode < keepAlive && (statusCode === DisconnectReason.loggedOut || statusCode === 428)) {
          logger.info(`Socket closed (${statusCode}) during pairing — normal, ignoring`);
          return;
        }
      }

      // Skip close during expected 401 when pairing code hasn't been requested yet
      if (isPairing && !pairingRequested && (statusCode === 401 || statusCode === DisconnectReason.badSession)) {
        logger.info(`Expected ${statusCode} during pairing for ${whatsappNumber}, waiting...`);
        return;
      }

      connectionResolved = true;
      active.delete(key);

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        && statusCode !== DisconnectReason.badSession
        && statusCode !== 401;

      await Session.findOneAndUpdate(
        { telegramId: String(telegramId), whatsappNumber },
        {
          isActive: false,
          lastError: reason || `code_${statusCode}`,
          $inc: { failCount: 1 },
        }
      ).catch(() => {});

      if (statusCode === DisconnectReason.badSession || statusCode === 401) {
        logger.warn(`Bad session for ${whatsappNumber}, cleaning up`);
        cleanCorruptedSession(dir);
      }

      if (onDisconnected) onDisconnected(shouldReconnect, statusCode);
    }
  });

  return sock;
}

function getSock(tid, num) { return active.get(`${tid}:${num}`); }

async function ensureSock(tid, num) {
  let s = getSock(tid, num);
  if (s) return s;

  s = await reconnect(tid, num);
  if (!s) throw new Error('WhatsApp not connected. Please re-pair.');
  return s;
}

async function reconnect(tid, num) {
  const session = await Session.findOne({ telegramId: String(tid), whatsappNumber: num });
  if (!session) return null;

  const dir = getUserSessionDir(tid, num);
  if (!isSessionDirValid(dir)) return null;

  if (session.failCount >= 5) {
    logger.warn(`Too many failures for ${num}, skipping reconnect`);
    return null;
  }

  return new Promise(res => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) { done = true; res(null); }
    }, config.limits.reconnectTimeoutMs);

    createWhatsAppSession(tid, num, {
      onConnected: sock => {
        if (!done) { done = true; clearTimeout(timeout); res(sock); }
      },
      onDisconnected: () => {
        if (!done) { done = true; clearTimeout(timeout); res(null); }
      },
    }).catch(() => {
      if (!done) { done = true; clearTimeout(timeout); res(null); }
    });
  });
}

async function toFullHDBuffer(imagePath) {
  const raw = fs.readFileSync(imagePath);
  return sharp(raw).jpeg({ quality: 100 }).toBuffer();
}

async function setFullHDProfilePicture(sock, jid, imagePath) {
  const raw = fs.readFileSync(imagePath);
  await sock.updateProfilePicture(jid, raw, { hd: true });
}

async function setProfilePicture(tid, num, imagePath) {
  const sock = await ensureSock(tid, num);
  await setFullHDProfilePicture(sock, sock.user.id, imagePath);
}

async function setGroupProfilePicture(sock, groupJid, imagePath) {
  await setFullHDProfilePicture(sock, groupJid, imagePath);
}

async function getProfilePicture(tid, num) {
  const sock = await ensureSock(tid, num);
  return sock.profilePictureUrl(sock.user.id, 'image');
}

async function deleteProfilePicture(tid, num) {
  const sock = await ensureSock(tid, num);
  await sock.removeProfilePicture(sock.user.id);
}

async function joinGroupViaInvite(sock, inviteCode) {
  return sock.groupAcceptInvite(inviteCode);
}

async function leaveGroup(sock, groupJid) {
  await sock.groupLeave(groupJid);
}

async function getGroupMetadata(sock, groupJid) {
  return sock.groupMetadata(groupJid);
}

async function isAdminInGroup(sock, groupJid) {
  const meta = await getGroupMetadata(sock, groupJid);
  const botJid = sock.user.id;
  const botId = botJid.split(':')[0] + '@s.whatsapp.net';
  const participant = meta.participants.find(p =>
    p.id === botJid || p.id === botId || p.id.split(':')[0] === botJid.split(':')[0]
  );
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

async function disconnect(tid, num) {
  const s = getSock(tid, num);
  if (s) {
    await s.logout().catch(() => {});
    active.delete(`${tid}:${num}`);
  }
}

function getActiveSessions() {
  return active;
}

module.exports = {
  createWhatsAppSession, setProfilePicture, setGroupProfilePicture,
  getProfilePicture, deleteProfilePicture,
  joinGroupViaInvite, leaveGroup, getGroupMetadata, isAdminInGroup,
  disconnect, reconnect, getSock, ensureSock, getActiveSessions,
};

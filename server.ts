import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_SESSIONS = 500;

interface SyncLauncherSettings {
  name: string;
  lat: number;
  lon: number;
  tz: string;
  method: string;
  league: string;
  adzan: '1' | '0';
  apps: string;
  soundNav: '1' | '0';
  dpadSpeed: 'slow' | 'normal' | 'fast';
  favoriteApps: string[];
  favoriteTvChannels: string[];
  liveWallpaper: '1' | '0';
  liveWallpaperTheme: 'clouds' | 'ocean' | 'aurora' | 'cosmos';
  liveWallpaperFilter: 'none' | 'monochrome' | 'sepia';
  themeMode: 'auto' | 'dawn' | 'day' | 'night';
  accentColor: 'theme' | 'neon-green' | 'royal-blue' | 'amber-gold' | 'crimson' | 'violet';
  screenSaver: '1' | '0';
  autoSilent: '1' | '0';
  autoSilentDurationMin: number;
  dashboardCards: Array<{ id: 'prayer' | 'schedule' | 'weather'; visible: boolean }>;
  quickShortcut: {
    action: 'clear-cache' | 'open-favorite' | 'toggle-dnd' | 'open-settings' | 'open-haramain';
    label: string;
    targetAppId?: string;
  };
  kidsMode: '1' | '0';
  kidsPin: string;
  kidsApps: string[];
}

interface SyncSession {
  code: string;
  tokenHash: Buffer;
  settings: SyncLauncherSettings;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  synced: boolean;
}

const sessions = new Map<string, SyncSession>();

function hashToken(token: string): Buffer {
  return crypto.createHash('sha256').update(token).digest();
}

function tokensMatch(expectedHash: Buffer, providedToken: string): boolean {
  if (!providedToken || providedToken.length > 256) return false;
  const actualHash = hashToken(providedToken);
  return crypto.timingSafeEqual(expectedHash, actualHash);
}

function sanitizeAppsText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const lines = raw
    .split('\n')
    .slice(0, 40)
    .map((line) => line.trim())
    .filter((line) => line.includes('|'));
  const safeLines: string[] = [];
  for (const line of lines) {
    const idx = line.indexOf('|');
    const name = line.slice(0, idx).trim().slice(0, 60);
    const url = line.slice(idx + 1).trim().slice(0, 300);
    if (!name || !url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeLines.push(`${name}|${parsed.toString()}`);
      }
    } catch {
      // ignore invalid or unsafe URLs
    }
  }
  return safeLines.join('\n');
}

function sanitizeSettings(raw: unknown): SyncLauncherSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const name =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim().slice(0, 80)
      : 'Jakarta';
  const lat = Number(obj.lat);
  const lon = Number(obj.lon);
  const safeLat = Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : -6.2146;
  const safeLon = Number.isFinite(lon) && lon >= -180 && lon <= 180 ? lon : 106.8451;
  const tz =
    typeof obj.tz === 'string' && obj.tz.trim()
      ? obj.tz.trim().slice(0, 64)
      : 'Asia/Jakarta';
  const method =
    typeof obj.method === 'string' && /^\d{1,3}$/.test(obj.method.trim())
      ? obj.method.trim()
      : '20';
  const league =
    typeof obj.league === 'string' && /^\d{1,8}$/.test(obj.league.trim())
      ? obj.league.trim()
      : '4328';
  const adzan: '1' | '0' = obj.adzan === '0' ? '0' : '1';
  const soundNav: '1' | '0' = obj.soundNav === '0' ? '0' : '1';
  const liveWallpaper: '1' | '0' = obj.liveWallpaper === '1' ? '1' : '0';
  const themeRaw = obj.liveWallpaperTheme;
  const liveWallpaperTheme: 'clouds' | 'ocean' | 'aurora' | 'cosmos' =
    themeRaw === 'ocean' || themeRaw === 'aurora' || themeRaw === 'cosmos'
      ? themeRaw
      : 'clouds';
  const filterRaw = obj.liveWallpaperFilter;
  const liveWallpaperFilter: 'none' | 'monochrome' | 'sepia' =
    filterRaw === 'monochrome' || filterRaw === 'sepia' ? filterRaw : 'none';
  const modeRaw = obj.themeMode;
  const themeMode: 'auto' | 'dawn' | 'day' | 'night' =
    modeRaw === 'dawn' || modeRaw === 'day' || modeRaw === 'night'
      ? modeRaw
      : 'auto';
  const accentRaw = obj.accentColor;
  const accentColor:
    | 'theme'
    | 'neon-green'
    | 'royal-blue'
    | 'amber-gold'
    | 'crimson'
    | 'violet' =
    accentRaw === 'neon-green' ||
    accentRaw === 'royal-blue' ||
    accentRaw === 'amber-gold' ||
    accentRaw === 'crimson' ||
    accentRaw === 'violet'
      ? accentRaw
      : 'theme';
  const speedRaw = obj.dpadSpeed;
  const dpadSpeed: 'slow' | 'normal' | 'fast' =
    speedRaw === 'slow' || speedRaw === 'fast' ? speedRaw : 'normal';
  const screenSaver: '1' | '0' = obj.screenSaver === '0' ? '0' : '1';
  const autoSilent: '1' | '0' = obj.autoSilent === '0' ? '0' : '1';
  const rawSilentDur = Number(obj.autoSilentDurationMin);
  const autoSilentDurationMin = [10, 15, 20, 30].includes(rawSilentDur)
    ? rawSilentDur
    : 15;

  const favoriteApps = Array.isArray(obj.favoriteApps)
    ? obj.favoriteApps
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 50)
        .map((x) => x.trim().slice(0, 200))
    : [];

  const favoriteTvChannels = Array.isArray(obj.favoriteTvChannels)
    ? obj.favoriteTvChannels
        .filter((x): x is string => typeof x === 'string' && /^[a-z0-9]{2,16}$/i.test(x.trim()))
        .slice(0, 20)
        .map((x) => x.trim().toLowerCase())
    : ['rcti', 'sctv', 'indosiar', 'trans7', 'transtv'];

  const validCardIds: Array<'prayer' | 'schedule' | 'weather'> = ['prayer', 'schedule', 'weather'];
  const dashboardCards: Array<{ id: 'prayer' | 'schedule' | 'weather'; visible: boolean }> = [];
  const seenCardIds = new Set<'prayer' | 'schedule' | 'weather'>();
  if (Array.isArray(obj.dashboardCards)) {
    for (const item of obj.dashboardCards) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as { id?: unknown; visible?: unknown };
      if (
        (rec.id === 'prayer' || rec.id === 'schedule' || rec.id === 'weather') &&
        !seenCardIds.has(rec.id)
      ) {
        seenCardIds.add(rec.id);
        dashboardCards.push({ id: rec.id, visible: rec.visible !== false });
      }
    }
  }
  for (const id of validCardIds) {
    if (!seenCardIds.has(id)) {
      dashboardCards.push({ id, visible: true });
    }
  }

  const validShortcutActions = new Set([
    'clear-cache',
    'open-favorite',
    'toggle-dnd',
    'open-settings',
    'open-haramain',
  ]);
  const rawQs =
    obj.quickShortcut && typeof obj.quickShortcut === 'object'
      ? (obj.quickShortcut as { action?: unknown; label?: unknown; targetAppId?: unknown })
      : {};
  const qsAction = validShortcutActions.has(String(rawQs.action))
    ? (String(rawQs.action) as SyncLauncherSettings['quickShortcut']['action'])
    : 'clear-cache';
  const qsLabel =
    typeof rawQs.label === 'string' && rawQs.label.trim()
      ? rawQs.label.trim().slice(0, 32)
      : 'Bersihkan Cache RAM';
  const qsTarget =
    typeof rawQs.targetAppId === 'string' && rawQs.targetAppId.trim()
      ? rawQs.targetAppId.trim().slice(0, 200)
      : undefined;

  const kidsMode: '1' | '0' = obj.kidsMode === '1' ? '1' : '0';
  const rawPin = typeof obj.kidsPin === 'string' ? obj.kidsPin.replace(/\D/g, '').slice(0, 4) : '';
  const kidsPin = rawPin.length === 4 ? rawPin : '1234';
  const kidsApps = Array.isArray(obj.kidsApps)
    ? obj.kidsApps
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 60)
        .map((x) => x.trim().slice(0, 200))
    : [];

  return {
    name,
    lat: safeLat,
    lon: safeLon,
    tz,
    method,
    league,
    adzan,
    apps: sanitizeAppsText(obj.apps),
    soundNav,
    dpadSpeed,
    favoriteApps,
    favoriteTvChannels,
    liveWallpaper,
    liveWallpaperTheme,
    liveWallpaperFilter,
    themeMode,
    accentColor,
    screenSaver,
    autoSilent,
    autoSilentDurationMin,
    dashboardCards,
    quickShortcut: {
      action: qsAction,
      label: qsLabel,
      ...(qsTarget ? { targetAppId: qsTarget } : {}),
    },
    kidsMode,
    kidsPin,
    kidsApps,
  };
}

function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(code);
    }
  }
  while (sessions.size >= MAX_SESSIONS) {
    const oldestKey = sessions.keys().next().value;
    if (!oldestKey) break;
    sessions.delete(oldestKey);
  }
}

function generatePairingCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiError(err: unknown): {
  status: number;
  message: string;
  requiresPaidKey: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const upper = raw.toUpperCase();
  if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
    return {
      status: 429,
      message:
        'Kuota API tercapai atau model ini memerlukan API key berbayar. Periksa paket API key Anda di panel Settings > Secrets.',
      requiresPaidKey: true,
    };
  }
  if (
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('API_KEY_INVALID') ||
    upper.includes('403') ||
    upper.includes('401')
  ) {
    return {
      status: 403,
      message:
        'API key Gemini tidak valid atau belum memiliki izin untuk model ini. Periksa panel Settings > Secrets.',
      requiresPaidKey: true,
    };
  }
  if (upper.includes('NOT_FOUND') || upper.includes('404')) {
    return {
      status: 404,
      message: 'Model Gemini yang diminta tidak ditemukan atau belum tersedia pada proyek ini.',
      requiresPaidKey: false,
    };
  }
  return {
    status: 500,
    message: raw || 'Terjadi kesalahan saat menghubungi layanan Gemini AI.',
    requiresPaidKey: false,
  };
}

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-neon',
  'gemini-4-carbon',
]);

const ALLOWED_MUSIC_MODELS = new Set([
  'lyria-3-clip-preview',
  'lyria-3-pro-preview',
]);

const INDONESIAN_TV_CHANNELS: Record<string, string> = {
  rcti: 'RCTI',
  sctv: 'SCTV',
  indosiar: 'Indosiar',
  trans7: 'Trans7',
  transtv: 'Trans TV',
  mnctv: 'MNCTV',
  gtv: 'GTV',
  antv: 'ANTV',
  kompastv: 'Kompas TV',
  metrotv: 'Metro TV',
  tvone: 'tvOne',
  inewstv: 'iNews',
  rtv: 'RTV',
  moji: 'Moji',
  nettv: 'NET.',
  tvri: 'TVRI',
  mdtv: 'MDTV',
};

interface CachedChannelPrograms {
  fetchedAt: number;
  programs: Array<{ time: string; timeLabel: string; title: string }>;
}

const TV_SCHEDULE_CACHE_TTL_MS = 15 * 60 * 1000;
const tvScheduleCache = new Map<string, CachedChannelPrograms>();

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&#8217;/g, '’')
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

async function fetchSingleChannelSchedule(
  channelId: string
): Promise<Array<{ time: string; timeLabel: string; title: string }>> {
  const cached = tvScheduleCache.get(channelId);
  if (cached && Date.now() - cached.fetchedAt < TV_SCHEDULE_CACHE_TTL_MS) {
    return cached.programs;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`https://www.jadwaltv.net/channel/${encodeURIComponent(channelId)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TVLauncherEPG/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const programs: Array<{ time: string; timeLabel: string; title: string }> = [];
    const seen = new Set<string>();
    const rowRegex =
      /<tr\b[^>]*>\s*<td[^>]*>\s*(\d{2}:\d{2}\s*(?:WIB|WITA|WIT)?)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;

    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const rawTime = match[1].replace(/\s+/g, ' ').trim();
      const rawTitleCell = match[2];
      if (/<a\b/i.test(rawTitleCell) || /jadwal tv selengkapnya/i.test(rawTitleCell)) {
        continue;
      }
      const cleanTitle = decodeHtmlEntities(rawTitleCell.replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleanTitle) continue;

      const timeMatch = rawTime.match(/(\d{2}:\d{2})/);
      if (!timeMatch) continue;
      const hhmm = timeMatch[1];
      const timeLabel = /\b(WIB|WITA|WIT)\b/i.test(rawTime)
        ? rawTime.replace(/(WIB|WITA|WIT)/i, ' $1').replace(/\s+/g, ' ').trim()
        : `${hhmm} WIB`;

      const dedupeKey = `${hhmm}|${cleanTitle}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      programs.push({
        time: hhmm,
        timeLabel,
        title: cleanTitle,
      });
    }

    if (programs.length > 0) {
      tvScheduleCache.set(channelId, {
        fetchedAt: Date.now(),
        programs,
      });
      return programs;
    }

    return cached?.programs || [];
  } catch {
    return cached?.programs || [];
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/ping', (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/tv-schedule', async (req, res) => {
    const rawChannels =
      typeof req.query.channels === 'string'
        ? req.query.channels
        : typeof req.query.channel === 'string'
        ? req.query.channel
        : 'rcti,sctv,indosiar,trans7,transtv';

    const requestedIds = Array.from(
      new Set(
        rawChannels
          .split(',')
          .map((c) => c.trim().toLowerCase())
          .filter((c) => c in INDONESIAN_TV_CHANNELS)
      )
    ).slice(0, 8);

    const channelIds =
      requestedIds.length > 0
        ? requestedIds
        : ['rcti', 'sctv', 'indosiar', 'trans7', 'transtv'];

    const channels = await Promise.all(
      channelIds.map(async (id) => ({
        id,
        name: INDONESIAN_TV_CHANNELS[id],
        programs: await fetchSingleChannelSchedule(id),
      }))
    );

    res.json({
      updatedAt: new Date().toISOString(),
      channels,
    });
  });

  app.post('/api/chat', async (req, res) => {
    const ai = getGenAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server (Settings > Secrets).',
      });
      return;
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
      return;
    }

    const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
    const model = ALLOWED_CHAT_MODELS.has(requestedModel)
      ? requestedModel
      : 'gemini-4-hydrogen';

    const systemInstruction =
      typeof req.body?.systemInstruction === 'string' && req.body.systemInstruction.trim()
        ? req.body.systemInstruction.trim().slice(0, 2000)
        : 'Anda adalah asisten pintar Android TV Launcher yang membantu pengguna dengan informasi harian, jadwal, dan hiburan secara ringkas dan jelas dalam bahasa Indonesia.';

    const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = rawHistory
      .filter(
        (item: unknown): item is { role: 'user' | 'model'; text: string } =>
          Boolean(item) &&
          typeof item === 'object' &&
          ((item as { role?: unknown }).role === 'user' ||
            (item as { role?: unknown }).role === 'model') &&
          typeof (item as { text?: unknown }).text === 'string' &&
          (item as { text: string }).text.trim().length > 0
      )
      .slice(-24)
      .map((item: { role: 'user' | 'model'; text: string }) => ({
        role: item.role,
        parts: [{ text: item.text.slice(0, 4000) }],
      }));

    try {
      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction,
        },
      });
      const response = await chat.sendMessage({ message: message.slice(0, 4000) });
      res.json({
        reply: response.text ?? '',
        model,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        requiresPaidKey: parsed.requiresPaidKey,
      });
    }
  });

  app.post('/api/emergency-broadcast', async (req, res) => {
    const ai = getGenAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server (Settings > Secrets).',
      });
      return;
    }

    const cityName =
      typeof req.body?.cityName === 'string' && req.body.cityName.trim()
        ? req.body.cityName.trim().slice(0, 80)
        : 'Jakarta';
    const warningTitle =
      typeof req.body?.warningTitle === 'string' && req.body.warningTitle.trim()
        ? req.body.warningTitle.trim().slice(0, 140)
        : 'Peringatan Cuaca Ekstrem';
    const warningDetail =
      typeof req.body?.warningDetail === 'string' && req.body.warningDetail.trim()
        ? req.body.warningDetail.trim().slice(0, 300)
        : warningTitle;
    const conditionLabel =
      typeof req.body?.conditionLabel === 'string' ? req.body.conditionLabel.trim().slice(0, 80) : '';
    const temperatureC = Number(req.body?.temperatureC);
    const windKmh = Number(req.body?.windKmh);
    const precipMm = Number(req.body?.precipMm);
    const isSimulated = Boolean(req.body?.isSimulated);

    const telemetryParts: string[] = [
      `Kota: ${cityName}`,
      `Peringatan: ${warningTitle}`,
      `Detail: ${warningDetail}`,
    ];
    if (conditionLabel) telemetryParts.push(`Kondisi: ${conditionLabel}`);
    if (Number.isFinite(temperatureC)) telemetryParts.push(`Suhu: ${Math.round(temperatureC)}°C`);
    if (Number.isFinite(windKmh) && windKmh > 0) telemetryParts.push(`Angin: ${Math.round(windKmh)} km/j`);
    if (Number.isFinite(precipMm) && precipMm > 0) telemetryParts.push(`Curah hujan: ${Math.round(precipMm)} mm`);

    const model = 'gemini-3.1-flash-lite';

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Susun pesan siaran darurat cuaca ekstrem untuk teks berjalan di layar TV berdasarkan data berikut:\n${telemetryParts.join('\n')}`,
        config: {
          systemInstruction:
            'Anda adalah Asisten AI Sistem Siaran Darurat TV Nasional. Tugas Anda menyusun pesan siaran peringatan cuaca ekstrem berbahasa Indonesia yang resmi, tenang, tegas, dan langsung dapat dibaca seluruh anggota keluarga di layar televisi. Jangan gunakan markdown, tanda bintang, atau emoji. Kembalikan JSON dengan headline singkat (maksimal 8 kata), tickerText (1-2 kalimat ringkas siap gulir untuk teks berjalan bagian bawah layar TV beserta langkah keselamatan utama), dan advice (1 paragraf singkat panduan keselamatan di rumah).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Judul singkat siaran darurat maksimal 8 kata tanpa emoji.',
              },
              tickerText: {
                type: Type.STRING,
                description:
                  'Teks berjalan darurat 1-2 kalimat singkat untuk bagian bawah layar TV dalam bahasa Indonesia.',
              },
              advice: {
                type: Type.STRING,
                description: 'Langkah mitigasi dan keselamatan singkat untuk keluarga di rumah.',
              },
            },
            required: ['headline', 'tickerText', 'advice'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsedJson = JSON.parse(rawText) as {
        headline?: string;
        tickerText?: string;
        advice?: string;
      };

      const headline = (parsedJson.headline || warningTitle).replace(/[*_#`]/g, '').trim();
      const tickerText = (parsedJson.tickerText || '').replace(/[*_#`]/g, '').trim();
      const advice = (parsedJson.advice || '').replace(/[*_#`]/g, '').trim();

      if (!tickerText) {
        res.status(502).json({
          error: 'Asisten AI tidak mengembalikan teks siaran darurat. Silakan coba lagi.',
        });
        return;
      }

      res.json({
        headline,
        tickerText,
        advice,
        model,
        cityName,
        warningTitle,
        generatedAt: new Date().toISOString(),
        isSimulated,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        requiresPaidKey: parsed.requiresPaidKey,
      });
    }
  });

  app.post('/api/maps/grounding', async (req, res) => {
    const ai = getGenAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server (Settings > Secrets).',
      });
      return;
    }

    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      res.status(400).json({ error: 'Kata kunci pencarian tempat tidak boleh kosong.' });
      return;
    }

    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const hasCoords =
      Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: query.slice(0, 500),
        config: {
          tools: [{ googleMaps: {} }],
          ...(hasCoords
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: {
                      latitude: lat,
                      longitude: lng,
                    },
                  },
                },
              }
            : {}),
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const places: Array<{
        title: string;
        uri: string;
        placeId?: string;
        reviewSnippets: Array<{ text: string; uri?: string }>;
      }> = [];

      for (const chunk of chunks) {
        const mapsData = (
          chunk as {
            maps?: {
              title?: string;
              uri?: string;
              placeId?: string;
              placeAnswerSources?: {
                reviewSnippets?: Array<{
                  content?: string;
                  googleMapsUri?: string;
                  uri?: string;
                }>;
              };
            };
          }
        )?.maps;
        if (!mapsData?.uri) continue;
        const snippets = (mapsData.placeAnswerSources?.reviewSnippets ?? [])
          .map((s) => ({
            text: typeof s.content === 'string' ? s.content : '',
            uri: s.googleMapsUri || s.uri || mapsData.uri,
          }))
          .filter((s) => s.text.length > 0);
        places.push({
          title: mapsData.title || 'Lokasi Google Maps',
          uri: mapsData.uri,
          placeId: mapsData.placeId,
          reviewSnippets: snippets,
        });
      }

      res.json({
        text: response.text ?? '',
        places,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        requiresPaidKey: parsed.requiresPaidKey,
      });
    }
  });

  app.post('/api/music/generate', async (req, res) => {
    const ai = getGenAiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server (Settings > Secrets).',
      });
      return;
    }

    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Deskripsi musik tidak boleh kosong.' });
      return;
    }

    const requestedModel = typeof req.body?.model === 'string' ? req.body.model.trim() : '';
    const model = ALLOWED_MUSIC_MODELS.has(requestedModel)
      ? requestedModel
      : 'lyria-3-clip-preview';

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt.slice(0, 1000),
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({
          error: 'Model tidak menghasilkan data audio. Coba ubah deskripsi musik Anda.',
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim(),
        mimeType,
        model,
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      res.status(parsed.status).json({
        error: parsed.message,
        requiresPaidKey: parsed.requiresPaidKey,
      });
    }
  });

  app.post('/api/sync-session', (req, res) => {
    pruneExpiredSessions();
    const initial = sanitizeSettings(req.body?.settings);
    if (!initial) {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    let code = generatePairingCode();
    while (sessions.has(code)) {
      code = generatePairingCode();
    }
    const token = crypto.randomBytes(24).toString('hex');
    const now = Date.now();

    sessions.set(code, {
      code,
      tokenHash: hashToken(token),
      settings: initial,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + SESSION_TTL_MS,
      synced: false,
    });

    res.json({
      code,
      token,
      expiresAt: now + SESSION_TTL_MS,
    });
  });

  app.get('/api/sync-session/:code', (req, res) => {
    pruneExpiredSessions();
    const code = String(req.params.code || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    const token = String(req.header('x-sync-token') || req.query.t || '');
    if (!tokensMatch(session.tokenHash, token)) {
      res.status(401).json({ error: 'Unauthorized sync session' });
      return;
    }

    res.json({
      code: session.code,
      settings: session.settings,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      synced: session.synced,
    });
  });

  app.post('/api/sync-session/:code', (req, res) => {
    pruneExpiredSessions();
    const code = String(req.params.code || '').toUpperCase().trim();
    const session = sessions.get(code);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    const token = String(
      req.header('x-sync-token') || req.body?.token || req.query.t || ''
    );
    if (!tokensMatch(session.tokenHash, token)) {
      res.status(401).json({ error: 'Unauthorized sync session' });
      return;
    }

    const nextSettings = sanitizeSettings(req.body?.settings);
    if (!nextSettings) {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    session.settings = nextSettings;
    session.updatedAt = Date.now();
    session.synced = true;

    res.json({
      ok: true,
      updatedAt: session.updatedAt,
      settings: session.settings,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    if (hmrDisabled) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript');
        res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document
      .querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]')
      .forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay {}
`);
      });
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(hmrDisabled ? { hmr: false, ws: false } : {}),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TV Launcher server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  liveWallpaper: '1' | '0';
  liveWallpaperTheme: 'clouds' | 'ocean' | 'aurora' | 'cosmos';
  themeMode: 'auto' | 'dawn' | 'day' | 'night';
  screenSaver: '1' | '0';
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
  const modeRaw = obj.themeMode;
  const themeMode: 'auto' | 'dawn' | 'day' | 'night' =
    modeRaw === 'dawn' || modeRaw === 'day' || modeRaw === 'night'
      ? modeRaw
      : 'auto';
  const speedRaw = obj.dpadSpeed;
  const dpadSpeed: 'slow' | 'normal' | 'fast' =
    speedRaw === 'slow' || speedRaw === 'fast' ? speedRaw : 'normal';
  const screenSaver: '1' | '0' = obj.screenSaver === '0' ? '0' : '1';

  const favoriteApps = Array.isArray(obj.favoriteApps)
    ? obj.favoriteApps
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .slice(0, 50)
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
    liveWallpaper,
    liveWallpaperTheme,
    themeMode,
    screenSaver,
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

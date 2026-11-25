import type {
  DailyPrayerEntry,
  DayWeatherWarning,
  DpadSpeed,
  FootballMatch,
  GeoCityResult,
  HijriDateInfo,
  LauncherSettings,
  LiveWallpaperItem,
  LiveWallpaperTheme,
  NewsCategory,
  NewsHeadline,
  PrayerScheduleResult,
  PrayerTimings,
  ScreenSaverPhoto,
  TimeThemeMode,
  TimeThemePhase,
  WeatherData,
  WeatherWarning,
} from '../types/launcher';

export const DEFAULT_SETTINGS: LauncherSettings = {
  name: 'Jakarta',
  lat: -6.2146,
  lon: 106.8451,
  tz: 'Asia/Jakarta',
  method: '20',
  league: '4328',
  adzan: '1',
  soundNav: '1',
  dpadSpeed: 'normal',
  favoriteApps: [],
  liveWallpaper: '0',
  liveWallpaperTheme: 'clouds',
  themeMode: 'auto',
  screenSaver: '1',
  apps: [
    'YouTube TV|https://www.youtube.com/tv',
    'Netflix|https://www.netflix.com',
    'Vidio|https://www.vidio.com',
    'Spotify|https://open.spotify.com',
    'Google|https://www.google.com',
  ].join('\n'),
};

export const PRAYER_LABELS: Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string> = {
  Fajr: 'Subuh',
  Dhuhr: 'Dzuhur',
  Asr: 'Ashar',
  Maghrib: 'Maghrib',
  Isha: 'Isya',
};

export const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export const PRAYER_METHODS = [
  { value: '20', label: 'Kemenag RI (Indonesia)' },
  { value: '3', label: 'Muslim World League' },
  { value: '4', label: 'Umm al-Qura (Makkah)' },
  { value: '2', label: 'ISNA (Amerika Utara)' },
  { value: '11', label: 'Singapura (MUIS)' },
  { value: '17', label: 'Malaysia (JAKIM)' },
];

export const FOOTBALL_LEAGUES = [
  { value: '4328', label: 'Premier League' },
  { value: '4335', label: 'La Liga' },
  { value: '4332', label: 'Serie A' },
  { value: '4331', label: 'Bundesliga' },
  { value: '4334', label: 'Ligue 1' },
  { value: '4790', label: 'Super League Indonesia (Liga 1)' },
  { value: '4480', label: 'UEFA Champions League' },
];

export const LIVE_WALLPAPER_THEMES: Array<{
  value: LiveWallpaperTheme;
  label: string;
}> = [
  { value: 'clouds', label: 'Langit & Awan Minimalis (Wikimedia Commons)' },
  { value: 'ocean', label: 'Ombak & Laut Tenang (Wikimedia Commons)' },
  { value: 'aurora', label: 'Aurora & Langit Malam (Wikimedia Commons)' },
  { value: 'cosmos', label: 'Bumi dari Orbit (NASA Open Video)' },
];

export const THEME_MODE_OPTIONS: Array<{
  value: TimeThemeMode;
  label: string;
}> = [
  { value: 'auto', label: 'Otomatis (Fajar · Siang · Malam)' },
  { value: 'dawn', label: 'Fajar (Soft Orange)' },
  { value: 'day', label: 'Siang (Bright Blue)' },
  { value: 'night', label: 'Malam (Deep Purple / Midnight)' },
];

export const DPAD_SPEED_OPTIONS: Array<{
  value: DpadSpeed;
  label: string;
}> = [
  { value: 'slow', label: 'Lambat (Presisi 260ms)' },
  { value: 'normal', label: 'Normal (Seimbang 140ms)' },
  { value: 'fast', label: 'Cepat (Scroll Kilat 65ms)' },
];

export const DPAD_REPEAT_INTERVAL_MS: Record<DpadSpeed, number> = {
  slow: 260,
  normal: 140,
  fast: 65,
};

export interface TimeThemePalette {
  phase: TimeThemePhase;
  label: string;
  bgGradient: string;
  scrimClass: string;
  cardClass: string;
  accentTextClass: string;
  activeTabClass: string;
  primaryButtonClass: string;
  nextPrayerClass: string;
  tileClass: string;
}

export const TIME_THEME_PALETTES: Record<TimeThemePhase, TimeThemePalette> = {
  dawn: {
    phase: 'dawn',
    label: 'Fajar',
    bgGradient:
      'radial-gradient(circle at 18% 15%, rgba(251, 146, 60, 0.34), #22120b 52%, #0e0806 100%)',
    scrimClass: 'from-[#1f1009]/52 via-[#150b07]/64 to-[#0b0604]/86',
    cardClass: 'border-orange-300/20 bg-[#1c110c]/82',
    accentTextClass: 'text-orange-300',
    activeTabClass: 'border-orange-400 bg-orange-500/25 text-orange-100',
    primaryButtonClass:
      'border-orange-400/50 bg-orange-500/20 text-orange-100 hover:bg-orange-500/30',
    nextPrayerClass: 'bg-amber-600 font-semibold text-white',
    tileClass: 'border-orange-300/25 bg-[#20140e]/85 text-slate-100 hover:bg-[#2b1a12]',
  },
  day: {
    phase: 'day',
    label: 'Siang',
    bgGradient:
      'radial-gradient(circle at 18% 15%, rgba(56, 189, 248, 0.42), #0b254a 52%, #071326 100%)',
    scrimClass: 'from-[#081a36]/46 via-[#071429]/60 to-[#060f1f]/82',
    cardClass: 'border-sky-300/25 bg-[#0c1e38]/80',
    accentTextClass: 'text-sky-300',
    activeTabClass: 'border-sky-400 bg-sky-500/25 text-sky-100',
    primaryButtonClass:
      'border-sky-400/50 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30',
    nextPrayerClass: 'bg-sky-600 font-semibold text-white',
    tileClass: 'border-sky-300/25 bg-[#0e2240]/85 text-slate-100 hover:bg-[#132d54]',
  },
  night: {
    phase: 'night',
    label: 'Malam',
    bgGradient:
      'radial-gradient(circle at 18% 15%, rgba(139, 92, 246, 0.36), #140b2e 52%, #070514 100%)',
    scrimClass: 'from-[#110926]/54 via-[#0b061b]/66 to-[#050312]/88',
    cardClass: 'border-violet-300/20 bg-[#130d29]/82',
    accentTextClass: 'text-violet-300',
    activeTabClass: 'border-violet-400 bg-violet-500/25 text-violet-100',
    primaryButtonClass:
      'border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30',
    nextPrayerClass: 'bg-violet-600 font-semibold text-white',
    tileClass: 'border-violet-300/25 bg-[#181033]/85 text-slate-100 hover:bg-[#221747]',
  },
};

export function resolveTimeTheme(
  hour: number,
  mode: TimeThemeMode = 'auto'
): TimeThemePhase {
  if (mode === 'dawn' || mode === 'day' || mode === 'night') {
    return mode;
  }
  if (hour >= 4 && hour < 10) return 'dawn';
  if (hour >= 10 && hour < 18) return 'day';
  return 'night';
}

export function loadSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem('tvl');
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      favoriteApps: Array.isArray(parsed?.favoriteApps) ? parsed.favoriteApps : [],
      liveWallpaper: parsed?.liveWallpaper === '1' ? '1' : '0',
      liveWallpaperTheme: ['clouds', 'ocean', 'aurora', 'cosmos'].includes(
        parsed?.liveWallpaperTheme
      )
        ? parsed.liveWallpaperTheme
        : DEFAULT_SETTINGS.liveWallpaperTheme,
      themeMode: ['auto', 'dawn', 'day', 'night'].includes(parsed?.themeMode)
        ? parsed.themeMode
        : DEFAULT_SETTINGS.themeMode,
      dpadSpeed: ['slow', 'normal', 'fast'].includes(parsed?.dpadSpeed)
        ? parsed.dpadSpeed
        : DEFAULT_SETTINGS.dpadSpeed,
      screenSaver: parsed?.screenSaver === '0' ? '0' : '1',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: LauncherSettings): void {
  try {
    localStorage.setItem('tvl', JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export interface TimeParts {
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: string;
  second: string;
}

export function getTimeParts(tz: string, date = new Date()): TimeParts {
  const parts: Record<string, string> = {};
  try {
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .forEach((p) => {
        parts[p.type] = p.value;
      });
  } catch {
    const h = date.getHours();
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
      hour: h % 24,
      minute: String(date.getMinutes()).padStart(2, '0'),
      second: String(date.getSeconds()).padStart(2, '0'),
    };
  }
  return {
    year: parts.year || '2026',
    month: parts.month || '01',
    day: parts.day || '01',
    hour: Number(parts.hour || 0) % 24,
    minute: parts.minute || '00',
    second: parts.second || '00',
  };
}

export const HIJRI_MONTHS_ID: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: 'Rabiul Awal',
  4: 'Rabiul Akhir',
  5: 'Jumadil Awal',
  6: 'Jumadil Akhir',
  7: 'Rajab',
  8: 'Syaban',
  9: 'Ramadan',
  10: 'Syawal',
  11: 'Zulkaidah',
  12: 'Zulhijah',
};

function parseAladhanHijri(hijriRaw: {
  day?: string;
  month?: { number?: number; en?: string };
  year?: string;
} | undefined): HijriDateInfo | null {
  if (!hijriRaw?.day || !hijriRaw?.year) return null;
  const monthNum = Number(hijriRaw.month?.number || 1);
  const monthName = HIJRI_MONTHS_ID[monthNum] || hijriRaw.month?.en || '';
  const day = String(Number(hijriRaw.day));
  return {
    day,
    monthNumber: monthNum,
    monthName,
    year: hijriRaw.year,
    formatted: `${day} ${monthName} ${hijriRaw.year} H`,
  };
}

export function getFallbackHijriDate(tz: string, date = new Date()): HijriDateInfo {
  try {
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: tz,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
      .formatToParts(date)
      .forEach((p) => {
        parts[p.type] = p.value;
      });
    const day = parts.day || '1';
    const monthNumber = Number(parts.month || 1);
    const year = (parts.year || '1448').replace(/\D/g, '') || '1448';
    const monthName = HIJRI_MONTHS_ID[monthNumber] || 'Muharram';
    return {
      day,
      monthNumber,
      monthName,
      year,
      formatted: `${day} ${monthName} ${year} H`,
    };
  } catch {
    return {
      day: '1',
      monthNumber: 1,
      monthName: 'Muharram',
      year: '1448',
      formatted: '1 Muharram 1448 H',
    };
  }
}

interface AladhanDayItem {
  timings: PrayerTimings;
  date: {
    gregorian: { date: string }; // DD-MM-YYYY
    hijri: {
      day: string;
      month: { number: number; en: string };
      year: string;
    };
  };
}

async function fetchAladhanMonth(
  year: number,
  month: number,
  settings: LauncherSettings
): Promise<AladhanDayItem[] | null> {
  const cacheKey = `praycal-${settings.lat}-${settings.lon}-${settings.method}-${year}-${String(month).padStart(2, '0')}`;
  const cached = readCache<AladhanDayItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${settings.lat}&longitude=${settings.lon}&method=${settings.method}&timezonestring=${encodeURIComponent(settings.tz)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Aladhan calendar error');
    const json = await res.json();
    const list = json?.data as AladhanDayItem[] | undefined;
    if (Array.isArray(list) && list.length > 0) {
      writeCache(cacheKey, list);
      return list;
    }
  } catch {
    // network error
  }
  return cached;
}

export async function fetchPrayerTimes(settings: LauncherSettings): Promise<PrayerTimings | null> {
  const p = getTimeParts(settings.tz);
  const key = `pray-${settings.lat}-${settings.lon}-${settings.method}-${p.year}${p.month}${p.day}`;
  const cached = readCache<PrayerTimings>(key);
  if (cached) return cached;

  try {
    const url = `https://api.aladhan.com/v1/timings/${p.day}-${p.month}-${p.year}?latitude=${settings.lat}&longitude=${settings.lon}&method=${settings.method}&timezonestring=${encodeURIComponent(settings.tz)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Aladhan error');
    const json = await res.json();
    const timings = json?.data?.timings as PrayerTimings | undefined;
    if (timings) {
      writeCache(key, timings);
      return timings;
    }
  } catch {
    // network error
  }
  return cached;
}

export async function fetchPrayerSchedule(
  settings: LauncherSettings
): Promise<PrayerScheduleResult> {
  const p = getTimeParts(settings.tz);
  const baseYear = Number(p.year);
  const baseMonth = Number(p.month);
  const baseDay = Number(p.day);

  // Build next 7 Gregorian calendar dates relative to the user's selected timezone
  const targetDates: { ddMmYyyy: string; iso: string; dayLabel: string; fullDateLabel: string }[] = [];
  const monthPairs = new Set<string>([`${baseYear}-${baseMonth}`]);

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + offset));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const dayNum = d.getUTCDate();
    monthPairs.add(`${y}-${m}`);

    const dd = String(dayNum).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const dayLabel =
      offset === 0
        ? 'Hari ini'
        : new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(d);
    const fullDateLabel = new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(d);

    targetDates.push({
      ddMmYyyy: `${dd}-${mm}-${y}`,
      iso: `${y}-${mm}-${dd}`,
      dayLabel,
      fullDateLabel,
    });
  }

  const monthLists = await Promise.all(
    Array.from(monthPairs).map((pair) => {
      const [y, m] = pair.split('-').map(Number);
      return fetchAladhanMonth(y, m, settings);
    })
  );

  const byGregorianDate = new Map<string, AladhanDayItem>();
  for (const list of monthLists) {
    if (!list) continue;
    for (const item of list) {
      const key = item?.date?.gregorian?.date;
      if (key) byGregorianDate.set(key, item);
    }
  }

  const weekly: DailyPrayerEntry[] = [];
  let todayTimings: PrayerTimings | null = null;
  let todayHijri: HijriDateInfo | null = null;

  targetDates.forEach((td, idx) => {
    const item = byGregorianDate.get(td.ddMmYyyy);
    if (!item?.timings) return;
    const hijri = parseAladhanHijri(item.date?.hijri);
    if (idx === 0) {
      todayTimings = item.timings;
      todayHijri = hijri;
    }
    weekly.push({
      dateKey: td.iso,
      dayLabel: td.dayLabel,
      fullDateLabel: td.fullDateLabel,
      hijriLabel: hijri?.formatted || '',
      timings: item.timings,
    });
  });

  if (!todayTimings) {
    todayTimings = await fetchPrayerTimes(settings);
  }
  if (!todayHijri) {
    todayHijri = getFallbackHijriDate(settings.tz);
  }

  return {
    todayTimings,
    todayHijri,
    weekly,
  };
}

export async function fetchWeather(settings: LauncherSettings): Promise<WeatherData | null> {
  const key = `wx2-${settings.lat}-${settings.lon}`;
  const cached = readCache<WeatherData>(key);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${settings.lat}&longitude=${settings.lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone=${encodeURIComponent(settings.tz)}&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Open-Meteo error');
    const data = (await res.json()) as WeatherData;
    writeCache(key, data);
    return data;
  } catch {
    return cached;
  }
}

export async function fetchFootballMatches(leagueId: string): Promise<FootballMatch[]> {
  const key = `mt-${leagueId}`;
  const cached = readCache<{ events?: FootballMatch[] }>(key);
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${encodeURIComponent(leagueId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('TheSportsDB error');
    const json = (await res.json()) as { events?: FootballMatch[] };
    writeCache(key, json);
    return json.events || [];
  } catch {
    return cached?.events || [];
  }
}

export async function searchCities(query: string): Promise<GeoCityResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=id`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const json = await res.json();
  return (json.results || []) as GeoCityResult[];
}

export async function fetchTrendingHeadlines(category: NewsCategory): Promise<NewsHeadline[]> {
  const cacheKey = `news-${category}`;
  const cached = readCache<NewsHeadline[]>(cacheKey);

  try {
    if (category === 'tech') {
      try {
        const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        if (!topRes.ok) throw new Error('HN failed');
        const ids = (await topRes.json()) as number[];
        const slice = (ids || []).slice(0, 8);
        const items = await Promise.all(
          slice.map(async (id) => {
            const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (!r.ok) return null;
            return r.json();
          })
        );
        const headlines: NewsHeadline[] = items
          .filter((item) => item && item.title)
          .slice(0, 5)
          .map((item) => {
            let source = 'Hacker News';
            if (item.url) {
              try {
                source = new URL(item.url).hostname.replace(/^www\./, '');
              } catch {
                // keep default
              }
            }
            return {
              id: String(item.id),
              title: String(item.title),
              source,
              url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            };
          });
        if (headlines.length > 0) {
          writeCache(cacheKey, headlines);
          return headlines;
        }
      } catch {
        const devRes = await fetch('https://dev.to/api/articles?top=1&per_page=5');
        if (devRes.ok) {
          const articles = (await devRes.json()) as Array<{
            id: number;
            title: string;
            url: string;
          }>;
          const headlines = (articles || []).slice(0, 5).map((a) => ({
            id: String(a.id),
            title: a.title,
            source: 'DEV Community',
            url: a.url,
          }));
          if (headlines.length > 0) {
            writeCache(cacheKey, headlines);
            return headlines;
          }
        }
      }
    } else {
      const urls = [
        'https://site.api.espn.com/apis/site/v2/sports/news?limit=5',
        'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=5',
      ];
      for (const url of urls) {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = (await res.json()) as {
          articles?: Array<{
            id?: number | string;
            headline?: string;
            links?: { web?: { href?: string } };
          }>;
        };
        const list = (json.articles || [])
          .filter((a) => a.headline)
          .slice(0, 5)
          .map((a, idx) => ({
            id: String(a.id || idx),
            title: String(a.headline),
            source: 'ESPN',
            url: a.links?.web?.href || 'https://www.espn.com',
          }));
        if (list.length > 0) {
          writeCache(cacheKey, list);
          return list;
        }
      }
    }
  } catch {
    // network error
  }

  return cached || [];
}

const WIKIMEDIA_THEME_QUERIES: Record<Exclude<LiveWallpaperTheme, 'cosmos'>, string> = {
  clouds: 'clouds timelapse sky webm',
  ocean: 'ocean waves sea calm webm',
  aurora: 'aurora borealis timelapse webm',
};

async function fetchWikimediaAmbientVideos(
  theme: Exclude<LiveWallpaperTheme, 'cosmos'>
): Promise<LiveWallpaperItem[]> {
  const srsearch = WIKIMEDIA_THEME_QUERIES[theme];
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(srsearch)}&srnamespace=6&srlimit=12&format=json&origin=*`;
  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error('Wikimedia search failed');
  const searchJson = (await res.json()) as {
    query?: { search?: Array<{ pageid: number; title: string }> };
  };
  const titles = (searchJson.query?.search || [])
    .map((item) => item.title)
    .filter((t) => /\.(webm|ogv)$/i.test(t))
    .slice(0, 8);

  if (titles.length === 0) return [];

  const detailUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    titles.join('|')
  )}&prop=imageinfo&iiprop=url|mime|size|thumburl&iiurlwidth=1280&format=json&origin=*`;
  const detailRes = await fetch(detailUrl);
  if (!detailRes.ok) throw new Error('Wikimedia imageinfo failed');
  const detailJson = (await detailRes.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageid: number;
          title?: string;
          imageinfo?: Array<{
            url?: string;
            mime?: string;
            size?: number;
            thumburl?: string;
          }>;
        }
      >;
    };
  };

  const pages = Object.values(detailJson.query?.pages || {});
  const items: LiveWallpaperItem[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const isVideoMime =
      info.mime?.startsWith('video/') || /\.(webm|mp4|ogv)$/i.test(info.url);
    // Skip very large (>85 MB) files so TV Box streams smoothly
    const isReasonableSize = !info.size || info.size <= 85 * 1024 * 1024;
    if (!isVideoMime || !isReasonableSize) continue;

    const cleanTitle = (page.title || 'Ambient Loop')
      .replace(/^File:/i, '')
      .replace(/\.(webm|mp4|ogv)$/i, '')
      .replace(/_/g, ' ');

    items.push({
      id: `wm-${page.pageid}`,
      title: cleanTitle,
      videoUrl: info.url,
      posterUrl: info.thumburl,
      source: 'Wikimedia Commons',
    });
  }
  return items;
}

async function fetchNasaAmbientVideos(): Promise<LiveWallpaperItem[]> {
  const searchUrl =
    'https://images-api.nasa.gov/search?q=earth%20horizon%20timelapse&media_type=video&page_size=8';
  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error('NASA search failed');
  const json = (await res.json()) as {
    collection?: {
      items?: Array<{
        href?: string;
        data?: Array<{ nasa_id?: string; title?: string }>;
        links?: Array<{ href?: string; rel?: string }>;
      }>;
    };
  };

  const candidates = (json.collection?.items || []).slice(0, 6);
  const resolved = await Promise.all(
    candidates.map(async (item, idx): Promise<LiveWallpaperItem | null> => {
      if (!item.href) return null;
      try {
        const assetRes = await fetch(item.href.replace(/^http:/, 'https:'));
        if (!assetRes.ok) return null;
        const files = (await assetRes.json()) as string[];
        if (!Array.isArray(files)) return null;
        const mp4Url =
          files.find((f) => /~medium\.mp4$/i.test(f)) ||
          files.find((f) => /~small\.mp4$/i.test(f)) ||
          files.find((f) => /~mobile\.mp4$/i.test(f)) ||
          files.find((f) => /\.mp4$/i.test(f));
        if (!mp4Url) return null;
        const meta = item.data?.[0];
        const thumb = item.links?.find((l) => l.rel === 'preview')?.href;
        return {
          id: `nasa-${meta?.nasa_id || idx}`,
          title: meta?.title || 'Earth Orbital Timelapse',
          videoUrl: mp4Url.replace(/^http:/, 'https:'),
          posterUrl: thumb?.replace(/^http:/, 'https:'),
          source: 'NASA Open Library',
        };
      } catch {
        return null;
      }
    })
  );

  return resolved.filter((x): x is LiveWallpaperItem => x !== null);
}

export async function fetchAmbientVideoLoops(
  theme: LiveWallpaperTheme = 'clouds'
): Promise<LiveWallpaperItem[]> {
  const cacheKey = `livewp-${theme}`;
  const cached = readCache<LiveWallpaperItem[]>(cacheKey);

  try {
    let list: LiveWallpaperItem[] = [];
    if (theme === 'cosmos') {
      list = await fetchNasaAmbientVideos();
    } else {
      list = await fetchWikimediaAmbientVideos(theme);
      if (list.length === 0) {
        list = await fetchNasaAmbientVideos();
      }
    }
    if (list.length > 0) {
      writeCache(cacheKey, list);
      return list;
    }
  } catch {
    // fallback to cache or empty
  }

  return cached || [];
}

export const SCREEN_SAVER_IDLE_MS = 5 * 60 * 1000;

const LANDSCAPE_PHOTO_QUERIES = [
  'mountain lake sunset landscape',
  'alpine valley sunrise clouds',
  'ocean coastline cliffs golden hour',
  'waterfall forest nature scenery',
  'fjord aurora night sky landscape',
  'tropical island turquoise sea aerial',
];

function stripHtmlTags(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function shufflePhotos<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

async function fetchWikimediaLandscapePhotos(): Promise<ScreenSaverPhoto[]> {
  const query =
    LANDSCAPE_PHOTO_QUERIES[Math.floor(Math.random() * LANDSCAPE_PHOTO_QUERIES.length)];
  const offset = Math.floor(Math.random() * 20);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrnamespace=6&gsrlimit=18&gsroffset=${offset}&prop=imageinfo&iiprop=url|mime|dimensions|extmetadata&iiurlwidth=1920&format=json&origin=*`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Wikimedia landscape search failed');

  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageid: number;
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            mime?: string;
            width?: number;
            height?: number;
            extmetadata?: {
              ObjectName?: { value?: string };
              Artist?: { value?: string };
            };
          }>;
        }
      >;
    };
  };

  const pages = Object.values(json.query?.pages || {});
  const items: ScreenSaverPhoto[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const imageUrl = info?.thumburl || info?.url;
    if (!imageUrl) continue;

    const mime = info?.mime || '';
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) continue;

    const width = info?.width || 0;
    const height = info?.height || 0;
    // Prefer widescreen landscape photography for 16:9 TV screens
    if (width < 1000 || height < 500 || width / height < 1.25) continue;

    const rawTitle =
      stripHtmlTags(info?.extmetadata?.ObjectName?.value) ||
      (page.title || 'Pemandangan Alam')
        .replace(/^File:/i, '')
        .replace(/\.(jpe?g|png|webp)$/i, '')
        .replace(/_/g, ' ');

    const artist = stripHtmlTags(info?.extmetadata?.Artist?.value);
    const cleanArtist =
      artist && artist.length <= 60 ? artist : undefined;

    items.push({
      id: `wm-ss-${page.pageid}`,
      title: rawTitle.slice(0, 90),
      imageUrl,
      photographer: cleanArtist,
      source: 'Wikimedia Commons',
    });
  }

  return shufflePhotos(items);
}

async function fetchNasaLandscapePhotos(): Promise<ScreenSaverPhoto[]> {
  const url =
    'https://images-api.nasa.gov/search?q=earth%20aurora%20ocean%20clouds&media_type=image&page_size=16';
  const res = await fetch(url);
  if (!res.ok) throw new Error('NASA landscape search failed');

  const json = (await res.json()) as {
    collection?: {
      items?: Array<{
        data?: Array<{ nasa_id?: string; title?: string; photographer?: string }>;
        links?: Array<{ href?: string; rel?: string }>;
      }>;
    };
  };

  const items: ScreenSaverPhoto[] = [];
  for (const [idx, item] of (json.collection?.items || []).entries()) {
    const href = item.links?.find((l) => l.rel === 'preview')?.href;
    if (!href) continue;
    const meta = item.data?.[0];
    items.push({
      id: `nasa-ss-${meta?.nasa_id || idx}`,
      title: (meta?.title || 'Bumi dari Orbit').slice(0, 90),
      imageUrl: href.replace(/^http:/, 'https:'),
      photographer: meta?.photographer,
      source: 'NASA Open Library',
    });
  }

  return shufflePhotos(items);
}

export async function fetchScreenSaverPhotos(): Promise<ScreenSaverPhoto[]> {
  const cacheKey = 'ssaver-photos';
  const cached = readCache<ScreenSaverPhoto[]>(cacheKey);

  try {
    let list = await fetchWikimediaLandscapePhotos();
    if (list.length < 3) {
      const nasaList = await fetchNasaLandscapePhotos();
      list = shufflePhotos([...list, ...nasaList]);
    }
    if (list.length > 0) {
      writeCache(cacheKey, list.slice(0, 18));
      return list;
    }
  } catch {
    // fallback to cache
  }

  return cached ? shufflePhotos(cached) : [];
}

export function getWeatherDescription(code: number): { label: string; kind: 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm' } {
  if (code === 0) return { label: 'Cerah', kind: 'sun' };
  if (code < 3) return { label: 'Cerah berawan', kind: 'partly' };
  if (code === 3) return { label: 'Berawan', kind: 'cloud' };
  if (code < 50) return { label: 'Berkabut', kind: 'fog' };
  if (code < 60) return { label: 'Gerimis', kind: 'drizzle' };
  if (code < 70) return { label: 'Hujan', kind: 'rain' };
  if (code < 80) return { label: 'Salju', kind: 'snow' };
  if (code < 90) return { label: 'Hujan deras', kind: 'rain' };
  return { label: 'Badai petir', kind: 'storm' };
}

function classifyConditionWarning(params: {
  code: number;
  precipSum?: number;
  rainProb?: number;
  windMax?: number;
  gustMax?: number;
  tempMax?: number;
  tempMin?: number;
}): DayWeatherWarning | null {
  const {
    code,
    precipSum = 0,
    rainProb = 0,
    windMax = 0,
    gustMax = 0,
    tempMax,
    tempMin,
  } = params;

  if (code >= 95) {
    return {
      level: 'extreme',
      label: code >= 96 ? 'Badai petir & hujan es' : 'Cuaca ekstrem: Badai petir',
    };
  }
  if (code === 65 || code === 67 || code === 82 || code === 75 || code === 86) {
    return {
      level: 'extreme',
      label: code === 75 || code === 86 ? 'Cuaca ekstrem: Badai salju' : 'Peringatan hujan lebat',
    };
  }
  if (gustMax >= 60 || windMax >= 45) {
    return {
      level: 'extreme',
      label: `Cuaca ekstrem: Angin kencang ${Math.round(Math.max(gustMax, windMax))} km/j`,
    };
  }
  if (precipSum >= 50) {
    return {
      level: 'extreme',
      label: `Peringatan hujan sangat lebat (${Math.round(precipSum)} mm)`,
    };
  }
  if (typeof tempMax === 'number' && tempMax >= 39) {
    return {
      level: 'extreme',
      label: `Cuaca ekstrem: Suhu sangat panas ${Math.round(tempMax)}°C`,
    };
  }
  if (typeof tempMin === 'number' && tempMin <= 0) {
    return {
      level: 'warning',
      label: `Peringatan suhu beku ${Math.round(tempMin)}°C`,
    };
  }
  if (code === 63 || code === 66 || code === 81 || code === 57) {
    return {
      level: 'warning',
      label: 'Waspada hujan deras',
    };
  }
  if (precipSum >= 25) {
    return {
      level: 'warning',
      label: `Waspada hujan lebat (${Math.round(precipSum)} mm)`,
    };
  }
  if (gustMax >= 42 || windMax >= 34) {
    return {
      level: 'warning',
      label: `Waspada hembusan angin ${Math.round(Math.max(gustMax, windMax))} km/j`,
    };
  }
  if (rainProb >= 80 && code >= 61) {
    return {
      level: 'warning',
      label: `Potensi hujan tinggi (${Math.round(rainProb)}%)`,
    };
  }
  return null;
}

export function getDayWeatherWarning(
  weather: WeatherData,
  index: number
): DayWeatherWarning | null {
  if (!weather?.daily?.time?.[index]) return null;
  return classifyConditionWarning({
    code: weather.daily.weather_code[index] ?? 0,
    precipSum: weather.daily.precipitation_sum?.[index] ?? 0,
    rainProb: weather.daily.precipitation_probability_max?.[index] ?? 0,
    windMax: weather.daily.wind_speed_10m_max?.[index] ?? 0,
    gustMax: weather.daily.wind_gusts_10m_max?.[index] ?? 0,
    tempMax: weather.daily.temperature_2m_max?.[index],
    tempMin: weather.daily.temperature_2m_min?.[index],
  });
}

export function evaluateWeatherWarning(weather: WeatherData): WeatherWarning | null {
  if (!weather?.current) return null;
  const currentWarn = classifyConditionWarning({
    code: weather.current.weather_code ?? 0,
    precipSum: (weather.current.precipitation ?? 0) * 6,
    windMax: weather.current.wind_speed_10m ?? 0,
    gustMax: weather.current.wind_gusts_10m ?? 0,
    tempMax: weather.current.temperature_2m,
    tempMin: weather.current.temperature_2m,
  });

  const affectedDays: number[] = [];
  let strongestDayWarn: { index: number; warn: DayWeatherWarning } | null = null;
  const days = weather.daily?.time || [];

  for (let idx = 0; idx < days.length; idx++) {
    const dayWarn = getDayWeatherWarning(weather, idx);
    if (!dayWarn) continue;
    affectedDays.push(idx);
    if (
      !strongestDayWarn ||
      (dayWarn.level === 'extreme' && strongestDayWarn.warn.level !== 'extreme')
    ) {
      strongestDayWarn = { index: idx, warn: dayWarn };
    }
  }

  if (!currentWarn && !strongestDayWarn) return null;

  const isExtreme =
    currentWarn?.level === 'extreme' || strongestDayWarn?.warn.level === 'extreme';
  const primaryLabel = currentWarn?.label || strongestDayWarn!.warn.label;

  const dayLabel = (() => {
    if (currentWarn) return 'Saat ini';
    const idx = strongestDayWarn!.index;
    if (idx === 0) return 'Hari ini';
    const dateStr = weather.daily.time[idx];
    try {
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        timeZone: 'UTC',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  })();

  const detailParts: string[] = [`${dayLabel}: ${primaryLabel}`];
  const gustNow = Math.max(
    weather.current.wind_gusts_10m ?? 0,
    weather.daily.wind_gusts_10m_max?.[strongestDayWarn?.index ?? 0] ?? 0
  );
  if (gustNow >= 35) {
    detailParts.push(`Angin maks ${Math.round(gustNow)} km/j`);
  }
  const precipDay = weather.daily.precipitation_sum?.[strongestDayWarn?.index ?? 0] ?? 0;
  if (precipDay >= 15) {
    detailParts.push(`Curah hujan ${Math.round(precipDay)} mm`);
  }

  return {
    level: isExtreme ? 'extreme' : 'warning',
    title: primaryLabel,
    detail: detailParts.join(' · '),
    isCurrentHazard: Boolean(currentWarn) || affectedDays.includes(0),
    affectedDays,
  };
}

/* IndexedDB Audio Storage for Adzan */
function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tvl', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('f')) {
        req.result.createObjectStore('f');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAdzanAudio(file: File): Promise<void> {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('f', 'readwrite');
    tx.objectStore('f').put(file, 'adzan');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAdzanAudio(): Promise<Blob | null> {
  try {
    const db = await openAudioDb();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction('f', 'readonly');
      const req = tx.objectStore('f').get('adzan');
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export type AudioVisualizerKind = 'idle' | 'nav' | 'adzan';

export interface AudioVisualizerSnapshot {
  kind: AudioVisualizerKind;
  active: boolean;
}

let sharedAudioCtx: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let freqDataBuffer: Uint8Array<ArrayBuffer> | null = null;
let activeAdzanAudio: HTMLAudioElement | null = null;
let activeAdzanObjectUrl: string | null = null;
let navDecayTimer: number | null = null;
let beepDecayTimer: number | null = null;
let currentVizState: AudioVisualizerSnapshot = { kind: 'idle', active: false };
let adzanStartedAt = 0;
let navPulseStartedAt = 0;
let adzanSyntheticFallback = false;

const vizListeners = new Set<(state: AudioVisualizerSnapshot) => void>();

function emitVizState(next: AudioVisualizerSnapshot): void {
  if (currentVizState.kind === next.kind && currentVizState.active === next.active) {
    return;
  }
  currentVizState = next;
  vizListeners.forEach((cb) => cb(currentVizState));
}

function getSharedAudioGraph(): { ctx: AudioContext; analyser: AnalyserNode } | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
      sharedAnalyser = sharedAudioCtx.createAnalyser();
      sharedAnalyser.fftSize = 64;
      sharedAnalyser.smoothingTimeConstant = 0.72;
      sharedAnalyser.connect(sharedAudioCtx.destination);
      freqDataBuffer = new Uint8Array(new ArrayBuffer(sharedAnalyser.frequencyBinCount));
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {
        // ignore autoplay policy errors until next user interaction
      });
    }
    return sharedAnalyser ? { ctx: sharedAudioCtx, analyser: sharedAnalyser } : null;
  } catch {
    return null;
  }
}

export function subscribeAudioVisualizer(
  listener: (state: AudioVisualizerSnapshot) => void
): () => void {
  vizListeners.add(listener);
  listener(currentVizState);
  return () => {
    vizListeners.delete(listener);
  };
}

export function sampleAudioVisualizerBands(barCount = 5): number[] {
  const resting = Array.from({ length: barCount }, () => 0.16);
  if (!currentVizState.active) return resting;

  let hasLiveFftEnergy = false;
  const fftBands: number[] = [];

  if (sharedAnalyser && freqDataBuffer && sharedAudioCtx?.state === 'running') {
    sharedAnalyser.getByteFrequencyData(freqDataBuffer);
    const binCount = freqDataBuffer.length;
    for (let i = 0; i < barCount; i++) {
      const start = Math.floor((i * Math.min(binCount, 20)) / barCount);
      const end = Math.max(start + 1, Math.floor(((i + 1) * Math.min(binCount, 20)) / barCount));
      let sum = 0;
      for (let b = start; b < end; b++) {
        sum += freqDataBuffer[b] || 0;
      }
      const norm = sum / ((end - start) * 255);
      if (norm > 0.03) hasLiveFftEnergy = true;
      fftBands.push(Math.min(1, 0.18 + norm * 1.15));
    }
  }

  if (hasLiveFftEnergy) {
    return fftBands;
  }

  // Rhythmic fallback synced to active playback window when audio context is muted/blocked
  const now = performance.now();
  if (currentVizState.kind === 'nav') {
    const elapsed = Math.max(0, now - navPulseStartedAt);
    const decay = Math.max(0, 1 - elapsed / 200);
    return Array.from({ length: barCount }, (_, i) => {
      const centerBoost = 1 - Math.abs(i - (barCount - 1) / 2) * 0.22;
      return Math.max(0.16, Math.min(1, 0.16 + decay * 0.78 * centerBoost));
    });
  }

  if (currentVizState.kind === 'adzan' && (adzanSyntheticFallback || activeAdzanAudio)) {
    const t = (now - adzanStartedAt) / 1000;
    return Array.from({ length: barCount }, (_, i) => {
      const wave =
        0.5 +
        0.35 * Math.sin(t * 7.5 + i * 0.95) +
        0.15 * Math.cos(t * 12.2 - i * 1.3);
      return Math.max(0.2, Math.min(1, 0.2 + wave * 0.75));
    });
  }

  return resting;
}

export function stopAdzanSound(): void {
  if (beepDecayTimer !== null) {
    window.clearTimeout(beepDecayTimer);
    beepDecayTimer = null;
  }
  if (activeAdzanAudio) {
    activeAdzanAudio.pause();
    activeAdzanAudio.currentTime = 0;
    activeAdzanAudio = null;
  }
  if (activeAdzanObjectUrl) {
    URL.revokeObjectURL(activeAdzanObjectUrl);
    activeAdzanObjectUrl = null;
  }
  adzanSyntheticFallback = false;
  emitVizState({ kind: 'idle', active: false });
}

export function playBeep(): void {
  adzanStartedAt = performance.now();
  adzanSyntheticFallback = true;
  if (beepDecayTimer !== null) {
    window.clearTimeout(beepDecayTimer);
  }
  emitVizState({ kind: 'adzan', active: true });
  beepDecayTimer = window.setTimeout(() => {
    beepDecayTimer = null;
    adzanSyntheticFallback = false;
    if (!activeAdzanAudio) {
      emitVizState({ kind: 'idle', active: false });
    }
  }, 1650);

  try {
    const graph = getSharedAudioGraph();
    if (!graph) return;
    const { ctx, analyser } = graph;
    [0, 0.55, 1.1].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.42);
      osc.connect(gain);
      gain.connect(analyser);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.45);
    });
  } catch {
    // ignore audio block
  }
}

export async function playAdzanSound(): Promise<void> {
  stopAdzanSound();
  try {
    const blob = await getAdzanAudio();
    const objectUrl = blob ? URL.createObjectURL(blob) : null;
    const audio = new Audio(objectUrl || 'adzan.mp3');
    activeAdzanAudio = audio;
    activeAdzanObjectUrl = objectUrl;
    adzanStartedAt = performance.now();

    const graph = getSharedAudioGraph();
    if (graph) {
      try {
        const mediaSrc = graph.ctx.createMediaElementSource(audio);
        mediaSrc.connect(graph.analyser);
        adzanSyntheticFallback = false;
      } catch {
        adzanSyntheticFallback = true;
      }
    } else {
      adzanSyntheticFallback = true;
    }

    const cleanup = () => {
      if (activeAdzanAudio !== audio) return;
      activeAdzanAudio = null;
      if (activeAdzanObjectUrl) {
        URL.revokeObjectURL(activeAdzanObjectUrl);
        activeAdzanObjectUrl = null;
      }
      adzanSyntheticFallback = false;
      emitVizState({ kind: 'idle', active: false });
    };

    audio.addEventListener('playing', () => {
      if (activeAdzanAudio === audio) {
        emitVizState({ kind: 'adzan', active: true });
      }
    });
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('pause', cleanup);
    audio.addEventListener('error', cleanup);

    await audio.play();
    emitVizState({ kind: 'adzan', active: true });
    return;
  } catch {
    activeAdzanAudio = null;
    if (activeAdzanObjectUrl) {
      URL.revokeObjectURL(activeAdzanObjectUrl);
      activeAdzanObjectUrl = null;
    }
    playBeep();
  }
}

export function playNavTick(): void {
  navPulseStartedAt = performance.now();
  if (currentVizState.kind !== 'adzan') {
    emitVizState({ kind: 'nav', active: true });
    if (navDecayTimer !== null) {
      window.clearTimeout(navDecayTimer);
    }
    navDecayTimer = window.setTimeout(() => {
      navDecayTimer = null;
      if (currentVizState.kind === 'nav') {
        emitVizState({ kind: 'idle', active: false });
      }
    }, 190);
  }

  try {
    const graph = getSharedAudioGraph();
    if (!graph) return;
    const { ctx, analyser } = graph;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(analyser);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // ignore
  }
}

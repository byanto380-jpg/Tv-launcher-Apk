import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Maximize2,
  Monitor,
  Moon,
  Package,
  Power,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Snowflake,
  Star,
  Sun,
  Trophy,
  Tv,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import { ApkBuilderModal } from './components/ApkBuilderModal';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MobileSyncView } from './components/MobileSyncView';
import { NewsTicker } from './components/NewsTicker';
import { PowerMenuModal } from './components/PowerMenuModal';
import { QrSyncModal } from './components/QrSyncModal';
import { ScreenSaverOverlay } from './components/ScreenSaverOverlay';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyPrayerChart, type PrayerChartFilter } from './components/WeeklyPrayerChart';
import { WeeklyPrayerModal } from './components/WeeklyPrayerModal';
import { useDpadNavigation } from './hooks/useDpadNavigation';
import {
  FOOTBALL_LEAGUES,
  PRAYER_KEYS,
  PRAYER_LABELS,
  SCREEN_SAVER_IDLE_MS,
  TIME_THEME_PALETTES,
  evaluateWeatherWarning,
  fetchAmbientVideoLoops,
  fetchFootballMatches,
  fetchPrayerSchedule,
  fetchWeather,
  getDayWeatherWarning,
  getFallbackHijriDate,
  getTimeParts,
  getWeatherDescription,
  loadSettings,
  playAdzanSound,
  resolveTimeTheme,
  saveSettings,
} from './services/launcherApis';
import type {
  AndroidAppItem,
  DailyPrayerEntry,
  FootballMatch,
  HijriDateInfo,
  LauncherSettings,
  LiveWallpaperItem,
  PowerAction,
  PrayerTimings,
  WeatherData,
} from './types/launcher';

function WeatherIcon({
  kind,
  className = 'h-5 w-5',
}: {
  kind: ReturnType<typeof getWeatherDescription>['kind'];
  className?: string;
}) {
  switch (kind) {
    case 'sun':
      return <Sun className={`${className} text-amber-300`} />;
    case 'partly':
      return <CloudSun className={`${className} text-amber-200`} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-300`} />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-sky-300`} />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-400`} />;
    case 'snow':
      return <Snowflake className={`${className} text-cyan-200`} />;
    case 'storm':
      return <CloudLightning className={`${className} text-amber-400`} />;
  }
}

interface BrowserShortcut {
  name: string;
  url: string;
}

export default function App() {
  const [settings, setSettings] = useState<LauncherSettings>(() => loadSettings());
  const [wallpaper, setWallpaper] = useState<string | null>(() => {
    try {
      return localStorage.getItem('tvwp');
    } catch {
      return null;
    }
  });

  const [now, setNow] = useState<Date>(() => new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(null);
  const [weeklyPrayers, setWeeklyPrayers] = useState<DailyPrayerEntry[]>([]);
  const [hijriDate, setHijriDate] = useState<HijriDateInfo>(() =>
    getFallbackHijriDate(settings.tz)
  );
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [prayerViewMode, setPrayerViewMode] = useState<'today' | 'chart'>('today');
  const [prayerChartFilter, setPrayerChartFilter] = useState<PrayerChartFilter>('Fajr');

  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [androidApps, setAndroidApps] = useState<AndroidAppItem[]>([]);
  const [isAndroidEnv, setIsAndroidEnv] = useState<boolean>(() => Boolean(window.Android));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState(false);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const [qrSyncOpen, setQrSyncOpen] = useState(false);
  const [mobileSyncSession, setMobileSyncSession] = useState<{
    code: string;
    token: string;
    isPreview: boolean;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sync')?.trim();
    const token = params.get('t')?.trim();
    if (code && token) {
      return { code, token, isPreview: false };
    }
    return null;
  });
  const [powerState, setPowerState] = useState<
    'awake' | 'sleeping' | 'restarting' | 'shutting_down' | 'off'
  >('awake');
  const [favoriteEditMode, setFavoriteEditMode] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [liveVideos, setLiveVideos] = useState<LiveWallpaperItem[]>([]);
  const [liveVideoIdx, setLiveVideoIdx] = useState(0);
  const [liveVideoReady, setLiveVideoReady] = useState(false);
  const [launcherFadeIn, setLauncherFadeIn] = useState(false);
  const [screenSaverActive, setScreenSaverActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastAdzanRef = React.useRef<string>('');
  const powerTimerRef = React.useRef<number | null>(null);
  const liveVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const fadeTimerRef = React.useRef<number | null>(null);
  const prevThemePhaseRef = React.useRef<string | null>(null);
  const prevAnyModalOpenRef = React.useRef<boolean>(false);
  const lastWeatherAlertRef = React.useRef<string>('');
  const idleTimerRef = React.useRef<number | null>(null);
  const screenSaverOpenedAtRef = React.useRef<number>(0);
  const lastPointerPosRef = React.useRef<{ x: number; y: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refreshWallpaper = useCallback(() => {
    try {
      setWallpaper(localStorage.getItem('tvwp'));
    } catch {
      setWallpaper(null);
    }
  }, []);

  const loadAndroidApps = useCallback(() => {
    if (window.Android) {
      setIsAndroidEnv(true);
      try {
        const parsed = JSON.parse(window.Android.getApps()) as AndroidAppItem[];
        setAndroidApps(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAndroidApps([]);
      }
    } else {
      setIsAndroidEnv(false);
      setAndroidApps([]);
    }
  }, []);

  const loadAllData = useCallback(async (cfg: LauncherSettings) => {
    setPrayerLoading(true);
    setMatchesLoading(true);
    setWeatherLoading(true);

    const [prayRes, matchRes, wxRes] = await Promise.all([
      fetchPrayerSchedule(cfg),
      fetchFootballMatches(cfg.league),
      fetchWeather(cfg),
    ]);

    setPrayerTimes(prayRes.todayTimings);
    setWeeklyPrayers(prayRes.weekly);
    setHijriDate(prayRes.todayHijri || getFallbackHijriDate(cfg.tz));
    setPrayerLoading(false);

    setMatches(matchRes);
    setMatchesLoading(false);

    setWeather(wxRes);
    setWeatherLoading(false);
  }, []);

  useEffect(() => {
    loadAndroidApps();
    loadAllData(settings);
    const dataTimer = window.setInterval(() => loadAllData(settings), 30 * 60 * 1000);
    return () => window.clearInterval(dataTimer);
  }, [settings, loadAllData, loadAndroidApps]);

  useEffect(() => {
    if (settings.liveWallpaper !== '1') {
      setLiveVideos([]);
      setLiveVideoReady(false);
      return;
    }
    let cancelled = false;
    setLiveVideoReady(false);
    fetchAmbientVideoLoops(settings.liveWallpaperTheme).then((items) => {
      if (cancelled) return;
      setLiveVideos(items);
      setLiveVideoIdx(0);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.liveWallpaper, settings.liveWallpaperTheme]);

  useEffect(() => {
    const vid = liveVideoRef.current;
    if (!vid) return;
    if (powerState === 'awake' && !screenSaverActive && settings.liveWallpaper === '1') {
      vid.play().catch(() => {
        // autoplay may need user gesture on strict browsers
      });
    } else {
      vid.pause();
    }
  }, [powerState, screenSaverActive, settings.liveWallpaper, liveVideoIdx, liveVideos]);

  // Clock + Adzan trigger every second
  useEffect(() => {
    const tickTimer = window.setInterval(() => {
      const current = new Date();
      setNow(current);
      if (prayerTimes && settings.adzan !== '0') {
        const p = getTimeParts(settings.tz, current);
        const hm = `${String(p.hour).padStart(2, '0')}:${p.minute}`;
        for (const key of PRAYER_KEYS) {
          const adzanId = `${p.day}-${key}`;
          if (prayerTimes[key]?.slice(0, 5) === hm && lastAdzanRef.current !== adzanId) {
            lastAdzanRef.current = adzanId;
            playAdzanSound();
            showToast(`Waktu Sholat ${PRAYER_LABELS[key]} telah tiba`);
          }
        }
      }
    }, 1000);
    return () => window.clearInterval(tickTimer);
  }, [prayerTimes, settings.adzan, settings.tz, showToast]);

  // Native Android bridge hooks
  useEffect(() => {
    window.__tvBack = () => {
      if (screenSaverActive) {
        setScreenSaverActive(false);
        return true;
      }
      if (qrSyncOpen) {
        setQrSyncOpen(false);
        return true;
      }
      if (powerMenuOpen) {
        setPowerMenuOpen(false);
        return true;
      }
      if (weeklyModalOpen) {
        setWeeklyModalOpen(false);
        return true;
      }
      if (apkModalOpen) {
        setApkModalOpen(false);
        return true;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (appSearchQuery) {
        setAppSearchQuery('');
        return true;
      }
      return false;
    };
    window.__tvMenu = () => {
      setScreenSaverActive(false);
      setQrSyncOpen(false);
      setPowerMenuOpen(false);
      setWeeklyModalOpen(false);
      setApkModalOpen(false);
      setSettingsOpen(true);
    };
    window.__tvPowerMenu = () => {
      setScreenSaverActive(false);
      if (powerState !== 'awake') {
        setPowerState('awake');
      }
      setQrSyncOpen(false);
      setSettingsOpen(false);
      setApkModalOpen(false);
      setWeeklyModalOpen(false);
      setPowerMenuOpen(true);
    };
    window.__tvRefreshApps = () => {
      loadAndroidApps();
    };
    return () => {
      delete window.__tvBack;
      delete window.__tvMenu;
      delete window.__tvPowerMenu;
      delete window.__tvRefreshApps;
    };
  }, [
    screenSaverActive,
    qrSyncOpen,
    powerMenuOpen,
    powerState,
    weeklyModalOpen,
    apkModalOpen,
    settingsOpen,
    appSearchQuery,
    loadAndroidApps,
  ]);

  // Wake from Sleep standby on any remote/keyboard press
  useEffect(() => {
    if (powerState !== 'sleeping') return;
    const wake = (e: KeyboardEvent) => {
      e.preventDefault();
      setPowerState('awake');
    };
    window.addEventListener('keydown', wake);
    return () => window.removeEventListener('keydown', wake);
  }, [powerState]);

  useEffect(() => {
    return () => {
      if (powerTimerRef.current !== null) {
        window.clearTimeout(powerTimerRef.current);
      }
    };
  }, []);

  // 5-Minute Inactivity Screen Saver Timer & Wake Handling
  useEffect(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (mobileSyncSession || powerState !== 'awake' || settings.screenSaver !== '1') {
      setScreenSaverActive(false);
      return;
    }

    const scheduleIdle = () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        screenSaverOpenedAtRef.current = Date.now();
        lastPointerPosRef.current = null;
        setScreenSaverActive(true);
      }, SCREEN_SAVER_IDLE_MS);
    };

    if (!screenSaverActive) {
      scheduleIdle();
    }

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      if (screenSaverActive) {
        e.preventDefault();
        e.stopPropagation();
        setScreenSaverActive(false);
        return;
      }
      scheduleIdle();
    };

    const onPointerAction = () => {
      if (screenSaverActive) {
        if (Date.now() - screenSaverOpenedAtRef.current < 350) return;
        setScreenSaverActive(false);
        return;
      }
      scheduleIdle();
    };

    const onMouseMove = (e: MouseEvent) => {
      const prev = lastPointerPosRef.current;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      if (screenSaverActive) {
        if (Date.now() - screenSaverOpenedAtRef.current < 450) return;
        if (prev && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 10) return;
        setScreenSaverActive(false);
        return;
      }
      scheduleIdle();
    };

    window.addEventListener('keydown', onKeyDownCapture, true);
    window.addEventListener('mousedown', onPointerAction, true);
    window.addEventListener('touchstart', onPointerAction, { passive: true });
    window.addEventListener('wheel', onPointerAction, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      window.removeEventListener('keydown', onKeyDownCapture, true);
      window.removeEventListener('mousedown', onPointerAction, true);
      window.removeEventListener('touchstart', onPointerAction);
      window.removeEventListener('wheel', onPointerAction);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [mobileSyncSession, powerState, settings.screenSaver, screenSaverActive]);

  // Main TV launcher 2D D-pad spatial navigation
  useDpadNavigation({
    scopeSelector: '#tv-launcher-root',
    enabled:
      !mobileSyncSession &&
      !screenSaverActive &&
      !settingsOpen &&
      !apkModalOpen &&
      !weeklyModalOpen &&
      !powerMenuOpen &&
      !qrSyncOpen &&
      powerState === 'awake',
    soundEnabled: settings.soundNav === '1',
    dpadSpeed: settings.dpadSpeed,
    onBack: () => {
      if (appSearchQuery) {
        setAppSearchQuery('');
      } else if (favoriteEditMode) {
        setFavoriteEditMode(false);
      }
    },
    onMenu: () => setSettingsOpen(true),
    onMenuHold: () => setPowerMenuOpen(true),
  });

  const timeParts = useMemo(() => getTimeParts(settings.tz, now), [settings.tz, now]);
  const activeThemePhase = resolveTimeTheme(timeParts.hour, settings.themeMode);
  const themePalette = TIME_THEME_PALETTES[activeThemePhase];
  const anyModalOpen =
    settingsOpen || apkModalOpen || weeklyModalOpen || powerMenuOpen || qrSyncOpen;

  const triggerLauncherFadeIn = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    setLauncherFadeIn(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setLauncherFadeIn(true);
        fadeTimerRef.current = window.setTimeout(() => {
          setLauncherFadeIn(false);
          fadeTimerRef.current = null;
        }, 360);
      });
    });
  }, []);

  useEffect(() => {
    if (prevThemePhaseRef.current === null) {
      prevThemePhaseRef.current = activeThemePhase;
      return;
    }
    if (prevThemePhaseRef.current !== activeThemePhase) {
      prevThemePhaseRef.current = activeThemePhase;
      triggerLauncherFadeIn();
    }
  }, [activeThemePhase, triggerLauncherFadeIn]);

  useEffect(() => {
    if (prevAnyModalOpenRef.current && !anyModalOpen) {
      triggerLauncherFadeIn();
    }
    prevAnyModalOpenRef.current = anyModalOpen;
  }, [anyModalOpen, triggerLauncherFadeIn]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);
  const formattedClock = `${String(timeParts.hour).padStart(2, '0')}:${timeParts.minute}`;
  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: settings.tz,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
    } catch {
      return now.toLocaleDateString('id-ID');
    }
  }, [settings.tz, now]);

  const nextPrayerInfo = useMemo(() => {
    if (!prayerTimes) return null;
    const nowMinutes = timeParts.hour * 60 + Number(timeParts.minute);
    const nowSeconds = nowMinutes * 60 + Number(timeParts.second);

    for (const k of PRAYER_KEYS) {
      const [h, m] = (prayerTimes[k] || '00:00').split(':').map(Number);
      const targetMin = h * 60 + m;
      if (targetMin > nowMinutes) {
        const diff = targetMin * 60 - nowSeconds;
        return { key: k, diff };
      }
    }

    const [fh, fm] = (prayerTimes.Fajr || '04:30').split(':').map(Number);
    const diff = (24 * 60 + fh * 60 + fm) * 60 - nowSeconds;
    return { key: 'Fajr' as const, diff };
  }, [prayerTimes, timeParts]);

  const countdownLabel = useMemo(() => {
    if (!nextPrayerInfo) return '';
    const hours = Math.floor(nextPrayerInfo.diff / 3600);
    const mins = Math.floor((nextPrayerInfo.diff % 3600) / 60);
    return `${PRAYER_LABELS[nextPrayerInfo.key]} dalam ${hours > 0 ? `${hours} jam ` : ''}${mins} menit`;
  }, [nextPrayerInfo]);

  const browserShortcuts = useMemo<BrowserShortcut[]>(() => {
    return settings.apps
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('|'))
      .map((line) => {
        const idx = line.indexOf('|');
        return {
          name: line.slice(0, idx).trim(),
          url: line.slice(idx + 1).trim(),
        };
      })
      .filter((item) => item.name && item.url);
  }, [settings.apps]);

  const favoriteSet = useMemo(
    () => new Set(settings.favoriteApps || []),
    [settings.favoriteApps]
  );

  const sortedAndroidApps = useMemo(() => {
    const favOrder = settings.favoriteApps || [];
    return [...androidApps].sort((a, b) => {
      const ia = favOrder.indexOf(a.p);
      const ib = favOrder.indexOf(b.p);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.n.localeCompare(b.n);
    });
  }, [androidApps, settings.favoriteApps]);

  const sortedBrowserShortcuts = useMemo(() => {
    const favOrder = settings.favoriteApps || [];
    return [...browserShortcuts].sort((a, b) => {
      const ia = favOrder.indexOf(a.url);
      const ib = favOrder.indexOf(b.url);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });
  }, [browserShortcuts, settings.favoriteApps]);

  const normalizedAppQuery = appSearchQuery.trim().toLowerCase();

  const filteredAndroidApps = useMemo(() => {
    if (!normalizedAppQuery) return sortedAndroidApps;
    return sortedAndroidApps.filter(
      (app) =>
        app.n.toLowerCase().includes(normalizedAppQuery) ||
        app.p.toLowerCase().includes(normalizedAppQuery)
    );
  }, [sortedAndroidApps, normalizedAppQuery]);

  const filteredBrowserShortcuts = useMemo(() => {
    if (!normalizedAppQuery) return sortedBrowserShortcuts;
    return sortedBrowserShortcuts.filter((item) =>
      item.name.toLowerCase().includes(normalizedAppQuery)
    );
  }, [sortedBrowserShortcuts, normalizedAppQuery]);

  const toggleFavoriteApp = useCallback(
    (id: string, label: string) => {
      setSettings((prev) => {
        const current = prev.favoriteApps || [];
        const exists = current.includes(id);
        const nextFavorites = exists
          ? current.filter((x) => x !== id)
          : [...current, id];
        const next = { ...prev, favoriteApps: nextFavorites };
        saveSettings(next);
        showToast(
          exists
            ? `${label} dihapus dari Aplikasi Favorit`
            : `${label} ditandai sebagai Aplikasi Favorit`
        );
        return next;
      });
    },
    [showToast]
  );

  useEffect(() => {
    if (
      mobileSyncSession ||
      settingsOpen ||
      apkModalOpen ||
      weeklyModalOpen ||
      powerMenuOpen ||
      qrSyncOpen ||
      powerState !== 'awake'
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      const active = document.activeElement as HTMLElement | null;
      const favId = active?.dataset.favId;
      const favLabel = active?.dataset.favLabel;
      if (favId && favLabel) {
        e.preventDefault();
        toggleFavoriteApp(favId, favLabel);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mobileSyncSession,
    settingsOpen,
    apkModalOpen,
    weeklyModalOpen,
    powerMenuOpen,
    qrSyncOpen,
    powerState,
    toggleFavoriteApp,
  ]);

  const activeLeagueName = useMemo(() => {
    return FOOTBALL_LEAGUES.find((l) => l.value === settings.league)?.label || 'Liga Sepak Bola';
  }, [settings.league]);

  const handleCycleLeague = () => {
    const idx = FOOTBALL_LEAGUES.findIndex((l) => l.value === settings.league);
    const nextLeague = FOOTBALL_LEAGUES[(idx + 1) % FOOTBALL_LEAGUES.length];
    const updated = { ...settings, league: nextLeague.value };
    setSettings(updated);
    saveSettings(updated);
    showToast(`Liga diganti ke ${nextLeague.label}`);
  };

  const handleSaveSettings = (next: LauncherSettings) => {
    setSettings(next);
    saveSettings(next);
    showToast('Pengaturan disimpan');
  };

  const handlePowerAction = useCallback(
    (action: PowerAction) => {
      setPowerMenuOpen(false);
      if (powerTimerRef.current !== null) {
        window.clearTimeout(powerTimerRef.current);
        powerTimerRef.current = null;
      }

      try {
        window.Android?.powerAction?.(action);
      } catch {
        // ignore if bridge method unavailable
      }

      if (action === 'sleep') {
        setPowerState('sleeping');
        return;
      }

      if (action === 'restart') {
        setPowerState('restarting');
        powerTimerRef.current = window.setTimeout(() => {
          window.location.reload();
        }, 1200);
        return;
      }

      if (action === 'shutdown') {
        setPowerState('shutting_down');
        powerTimerRef.current = window.setTimeout(() => {
          setPowerState('off');
        }, 1000);
      }
    },
    []
  );

  const handleNextLiveWallpaper = useCallback(() => {
    if (liveVideos.length <= 1) {
      showToast('Tidak ada klip ambient lain dalam tema ini');
      return;
    }
    setLiveVideoReady(false);
    setLiveVideoIdx((prev) => {
      const next = (prev + 1) % liveVideos.length;
      const item = liveVideos[next];
      if (item) {
        showToast(`Live Wallpaper: ${item.title}`);
      }
      return next;
    });
  }, [liveVideos, showToast]);

  const activeLiveVideo =
    settings.liveWallpaper === '1' && liveVideos.length > 0
      ? liveVideos[liveVideoIdx % liveVideos.length]
      : null;

  const handleQrSyncReceived = useCallback(
    (synced: LauncherSettings) => {
      setSettings(synced);
      saveSettings(synced);
      showToast('Pengaturan berhasil disinkronkan dari HP');
    },
    [showToast]
  );

  const currentWxDesc = weather
    ? getWeatherDescription(weather.current.weather_code)
    : null;
  const weatherWarning = useMemo(
    () => (weather ? evaluateWeatherWarning(weather) : null),
    [weather]
  );

  useEffect(() => {
    if (!weatherWarning?.isCurrentHazard) return;
    const alertKey = `${settings.name}|${weatherWarning.title}`;
    if (lastWeatherAlertRef.current === alertKey) return;
    lastWeatherAlertRef.current = alertKey;
    showToast(`Peringatan Cuaca (${settings.name}): ${weatherWarning.detail}`);
  }, [weatherWarning, settings.name, showToast]);

  if (mobileSyncSession) {
    return (
      <MobileSyncView
        code={mobileSyncSession.code}
        token={mobileSyncSession.token}
        onExitPreview={() => {
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          setMobileSyncSession(null);
        }}
      />
    );
  }

  return (
    <div
      id="tv-launcher-root"
      data-tv-theme={activeThemePhase}
      className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#070d19] text-slate-100 transition-colors duration-700 lg:h-screen lg:overflow-hidden"
      style={
        wallpaper
          ? {
              backgroundImage: `url(${wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Cross-fading Time-of-Day Theme Gradient Layers */}
      {!wallpaper &&
        (['dawn', 'day', 'night'] as const).map((phase) => (
          <div
            key={phase}
            aria-hidden="true"
            className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ease-out ${
              activeThemePhase === phase ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: TIME_THEME_PALETTES[phase].bgGradient }}
          />
        ))}

      {/* Dynamic Live Wallpaper Ambient Video Layer */}
      {activeLiveVideo && (
        <video
          ref={liveVideoRef}
          key={activeLiveVideo.id}
          src={activeLiveVideo.videoUrl}
          poster={activeLiveVideo.posterUrl}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setLiveVideoReady(true)}
          onError={() => {
            setLiveVideoReady(false);
            if (liveVideos.length > 1) {
              setLiveVideoIdx((prev) => (prev + 1) % liveVideos.length);
            }
          }}
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            liveVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 bg-gradient-to-b transition-colors duration-700 ${themePalette.scrimClass}`}
      />

      {/* Safe-Zone 10-Foot TV Container */}
      <div
        className={`relative z-10 flex flex-1 flex-col gap-5 px-6 py-5 md:px-10 md:py-7 lg:min-h-0 ${
          launcherFadeIn ? 'tv-fade-in-reveal' : ''
        }`}
      >
        {/* Top Bar: Clock / Date / Current Weather + Primary TV Actions */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono-tabular text-5xl font-light tracking-tight text-white md:text-7xl lg:text-[5.25rem] lg:leading-none">
                {formattedClock}
              </span>
              <span className="font-mono-tabular text-xl font-normal text-slate-400 md:text-2xl">
                {timeParts.second}
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-300 md:text-base">
              <span>{formattedDate}</span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-emerald-300">{hijriDate.formatted}</span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className={themePalette.accentTextClass}>{settings.name}</span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-400">Tema {themePalette.label}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {weather && currentWxDesc && (
              <div className="flex items-center gap-3 text-right">
                <WeatherIcon kind={currentWxDesc.kind} className="h-9 w-9 md:h-11 md:w-11" />
                <div>
                  <div className="flex items-center justify-end gap-1.5 font-mono-tabular text-3xl font-normal leading-none text-white md:text-4xl">
                    {weatherWarning?.isCurrentHazard && (
                      <AlertTriangle
                        aria-label={weatherWarning.title}
                        className={`h-5 w-5 shrink-0 ${
                          weatherWarning.level === 'extreme' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      />
                    )}
                    <span>{Math.round(weather.current.temperature_2m)}°</span>
                  </div>
                  <div
                    className={`mt-1 text-xs font-medium md:text-sm ${
                      weatherWarning?.isCurrentHazard
                        ? weatherWarning.level === 'extreme'
                          ? 'text-rose-300'
                          : 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {currentWxDesc.label}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400"
                />
                <input
                  type="text"
                  data-focusable="true"
                  data-dpad-row="top"
                  aria-label="Filter aplikasi terpasang"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const firstApp = document.querySelector<HTMLElement>(
                        '#tv-apps-rail [data-fav-id]'
                      );
                      firstApp?.focus();
                    }
                  }}
                  placeholder="Cari aplikasi…"
                  className={`w-44 rounded-xl border py-2.5 pr-9 pl-9 text-sm placeholder-slate-400 md:w-56 ${themePalette.tileClass}`}
                />
                {appSearchQuery && (
                  <button
                    type="button"
                    data-focusable="true"
                    data-dpad-row="top"
                    aria-label="Hapus pencarian aplikasi"
                    onClick={() => setAppSearchQuery('')}
                    className="absolute right-2 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                data-focusable="true"
                data-dpad-row="top"
                onClick={() => setSettingsOpen(true)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 ${themePalette.tileClass}`}
              >
                <Settings className="h-4 w-4 text-slate-300" />
                <span>Pengaturan</span>
              </button>

              <button
                type="button"
                data-focusable="true"
                data-dpad-row="top"
                onClick={() => setApkModalOpen(true)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 ${themePalette.primaryButtonClass}`}
              >
                <Package className={`h-4 w-4 ${themePalette.accentTextClass}`} />
                <span>Bangun APK TV</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main 3-Column TV Info Grid */}
        <main className="grid flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-12 lg:gap-5">
          {/* Card 1: Waktu Sholat + Hijriyah + Grafik Mingguan */}
          <section className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm transition-colors duration-700 lg:col-span-4 lg:min-h-0 ${themePalette.cardClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                  Waktu Sholat
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{hijriDate.formatted}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => setPrayerViewMode('today')}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    prayerViewMode === 'today'
                      ? themePalette.activeTabClass
                      : 'border-slate-700/80 bg-slate-800/85 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => setPrayerViewMode('chart')}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    prayerViewMode === 'chart'
                      ? themePalette.activeTabClass
                      : 'border-slate-700/80 bg-slate-800/85 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Grafik</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pb-2">
              <div className={`min-w-0 truncate text-xs font-medium md:text-sm ${themePalette.accentTextClass}`}>
                {prayerViewMode === 'today' && countdownLabel
                  ? countdownLabel
                  : 'Jadwal & pengingat Adzan'}
              </div>
              <AudioVisualizer
                accentClass={
                  activeThemePhase === 'dawn'
                    ? 'bg-orange-400'
                    : activeThemePhase === 'night'
                    ? 'bg-violet-400'
                    : 'bg-sky-400'
                }
              />
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
              {prayerLoading ? (
                <div className="space-y-2 py-2">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="h-10 animate-pulse rounded-xl bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : prayerViewMode === 'chart' ? (
                <WeeklyPrayerChart
                  weekly={weeklyPrayers}
                  filter={prayerChartFilter}
                  onFilterChange={setPrayerChartFilter}
                  height={195}
                  compact
                  dpadRow="cards"
                />
              ) : !prayerTimes ? (
                <div className="py-6 text-sm text-slate-400">
                  Tidak dapat memuat jadwal sholat. Periksa koneksi internet.
                </div>
              ) : (
                <>
                  {PRAYER_KEYS.map((key) => {
                    const isNext = nextPrayerInfo?.key === key;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-base transition-colors duration-700 md:text-lg ${
                          isNext
                            ? themePalette.nextPrayerClass
                            : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span>{PRAYER_LABELS[key]}</span>
                          {isNext && (
                            <span className="text-xs font-medium text-white/85">
                              Berikutnya
                            </span>
                          )}
                        </div>
                        <span className="font-mono-tabular">
                          {prayerTimes[key]?.slice(0, 5)}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-3">
              <span className="font-mono-tabular text-xs text-slate-400 md:text-sm">
                Terbit: {prayerTimes?.Sunrise ? prayerTimes.Sunrise.slice(0, 5) : '--:--'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => setWeeklyModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <Maximize2 className={`h-3.5 w-3.5 ${themePalette.accentTextClass}`} />
                  <span>Grafik Mingguan</span>
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    playAdzanSound();
                    showToast('Memutar suara pengingat Adzan');
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <Volume2 className={`h-3.5 w-3.5 ${themePalette.accentTextClass}`} />
                  <span>Tes Adzan</span>
                </button>
              </div>
            </div>
          </section>

          {/* Card 2: Jadwal Pertandingan */}
          <section className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm transition-colors duration-700 lg:col-span-4 lg:min-h-0 ${themePalette.cardClass}`}>
            <div className="flex items-center justify-between gap-2 pb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                  Jadwal Pertandingan
                </h2>
                <p className="text-xs text-slate-400">{activeLeagueName}</p>
              </div>
              <button
                type="button"
                data-focusable="true"
                data-dpad-row="cards"
                onClick={handleCycleLeague}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-300" />
                <span>Ganti Liga</span>
              </button>
            </div>

            <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto no-scrollbar pr-1">
              {matchesLoading ? (
                <div className="space-y-2.5 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="h-14 animate-pulse rounded-xl bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <div className="py-6 text-sm text-slate-400">
                  Belum ada jadwal pertandingan tersedia untuk liga ini.
                </div>
              ) : (
                matches.slice(0, 6).map((m, idx) => {
                  const dateIso = `${m.dateEvent}T${m.strTime || '00:00:00'}${
                    m.strTime ? 'Z' : ''
                  }`;
                  const d = new Date(dateIso);
                  let kickoff = m.dateEvent;
                  try {
                    kickoff = new Intl.DateTimeFormat('id-ID', {
                      timeZone: settings.tz,
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(d);
                  } catch {
                    // keep fallback
                  }

                  return (
                    <button
                      key={m.idEvent || `${m.strHomeTeam}-${idx}`}
                      type="button"
                      data-focusable="true"
                      data-dpad-row="cards"
                      onClick={() =>
                        showToast(`${m.strHomeTeam} vs ${m.strAwayTeam} · ${kickoff}`)
                      }
                      className="flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left hover:bg-slate-800/60"
                    >
                      <span className="text-sm font-medium text-slate-100 md:text-base">
                        {m.strHomeTeam} vs {m.strAwayTeam}
                      </span>
                      <span className="mt-0.5 font-mono-tabular text-xs text-slate-400">
                        {kickoff}
                        {m.strTime ? '' : ' (jam belum pasti)'}
                        {m.strLeague ? ` · ${m.strLeague}` : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Card 3: Prakiraan Cuaca */}
          <section className={`flex flex-col rounded-2xl border p-5 backdrop-blur-sm transition-colors duration-700 lg:col-span-4 lg:min-h-0 ${themePalette.cardClass}`}>
            <div className="flex items-center justify-between gap-2 pb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-300">
                  Prakiraan Cuaca
                </h2>
                <p className="text-xs text-slate-400">5 hari ke depan · {settings.name}</p>
              </div>
              <button
                type="button"
                data-focusable="true"
                data-dpad-row="cards"
                onClick={() => {
                  loadAllData(settings);
                  showToast('Memperbarui data cuaca, sholat & bola');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${themePalette.accentTextClass}`} />
                <span>Perbarui</span>
              </button>
            </div>

            {weatherWarning && (
              <button
                type="button"
                data-focusable="true"
                data-dpad-row="cards"
                onClick={() => showToast(weatherWarning.detail)}
                aria-label={`Peringatan cuaca: ${weatherWarning.detail}`}
                className={`mb-2 flex w-full items-center gap-2.5 border-y px-2 py-2 text-left transition-colors ${
                  weatherWarning.level === 'extreme'
                    ? 'border-rose-400/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20'
                    : 'border-amber-400/35 bg-amber-500/12 text-amber-100 hover:bg-amber-500/20'
                }`}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 ${
                    weatherWarning.level === 'extreme' ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">
                    {weatherWarning.title}
                  </div>
                  <div className="truncate text-[11px] opacity-85">
                    {weatherWarning.detail}
                  </div>
                </div>
              </button>
            )}

            <div className="flex-1 divide-y divide-slate-800/70 overflow-y-auto no-scrollbar">
              {weatherLoading ? (
                <div className="space-y-2.5 py-2">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="h-11 animate-pulse rounded-xl bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : !weather ? (
                <div className="py-6 text-sm text-slate-400">
                  Tidak dapat memuat prakiraan cuaca.
                </div>
              ) : (
                weather.daily.time.map((dateStr, idx) => {
                  const desc = getWeatherDescription(weather.daily.weather_code[idx]);
                  const dayWarn = getDayWeatherWarning(weather, idx);
                  const dayName =
                    idx === 0
                      ? 'Hari ini'
                      : new Intl.DateTimeFormat('id-ID', {
                          weekday: 'short',
                          timeZone: 'UTC',
                        }).format(new Date(dateStr));
                  const rainProb = weather.daily.precipitation_probability_max[idx] ?? 0;
                  const maxTemp = Math.round(weather.daily.temperature_2m_max[idx]);
                  const minTemp = Math.round(weather.daily.temperature_2m_min[idx]);

                  return (
                    <div
                      key={dateStr}
                      title={dayWarn?.label}
                      className="flex items-center justify-between py-3 text-sm md:text-base"
                    >
                      <span className="flex w-24 items-center gap-1.5 font-medium text-slate-200">
                        <span>{dayName}</span>
                        {dayWarn && (
                          <AlertTriangle
                            aria-label={dayWarn.label}
                            className={`h-3.5 w-3.5 shrink-0 ${
                              dayWarn.level === 'extreme' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          />
                        )}
                      </span>
                      <div className="flex items-center gap-2 text-slate-300">
                        <WeatherIcon kind={desc.kind} className="h-5 w-5" />
                        <span className={`font-mono-tabular text-xs md:text-sm ${themePalette.accentTextClass}`}>
                          {rainProb}%
                        </span>
                      </div>
                      <span className="font-mono-tabular font-medium text-slate-100">
                        {maxTemp}° / <span className="text-slate-400">{minTemp}°</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </main>

        {/* Bottom Apps & System Rail (D-Pad Scrollable) */}
        <footer className="space-y-2">
          <div
            id="tv-apps-rail"
            aria-label="Deretan Aplikasi TV"
            className="flex items-center gap-3 overflow-x-auto px-1 py-2 no-scrollbar"
          >
            {isAndroidEnv ? (
              <>
                {filteredAndroidApps.length === 0 && normalizedAppQuery ? (
                  <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                    <span>Tidak ada aplikasi cocok dengan &ldquo;{appSearchQuery}&rdquo;</span>
                    <button
                      type="button"
                      data-focusable="true"
                      data-dpad-row="apps"
                      onClick={() => setAppSearchQuery('')}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-sky-300 hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  filteredAndroidApps.map((app, index) => {
                    const isFav = favoriteSet.has(app.p);
                    return (
                      <button
                        key={app.p}
                        type="button"
                        data-focusable="true"
                        data-dpad-row="apps"
                        data-dpad-default={index === 0 ? 'true' : undefined}
                        data-fav-id={app.p}
                        data-fav-label={app.n}
                        onClick={() => {
                          if (favoriteEditMode) {
                            toggleFavoriteApp(app.p, app.n);
                          } else {
                            window.Android?.launch(app.p);
                          }
                        }}
                        className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium whitespace-nowrap md:text-base ${
                          isFav
                            ? 'border-amber-400/55 bg-slate-900/95 text-slate-50'
                            : themePalette.tileClass
                        }`}
                      >
                        {app.i ? (
                          <img
                            src={`data:image/png;base64,${app.i}`}
                            alt={app.n}
                            className="h-8 w-8 rounded-lg object-contain"
                          />
                        ) : (
                          <Tv className={`h-6 w-6 ${themePalette.accentTextClass}`} />
                        )}
                        <span>{app.n}</span>
                        {(isFav || favoriteEditMode) && (
                          <Star
                            aria-label={isFav ? 'Aplikasi favorit' : 'Tandai sebagai favorit'}
                            className={`h-4 w-4 shrink-0 ${
                              isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })
                )}

                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="apps"
                  onClick={() => window.Android?.openSys('wifi')}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
                >
                  <Wifi className={`h-5 w-5 ${themePalette.accentTextClass}`} />
                  <span>WiFi</span>
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="apps"
                  onClick={() => window.Android?.openSys('display')}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
                >
                  <Monitor className={`h-5 w-5 ${themePalette.accentTextClass}`} />
                  <span>Layar &amp; HDMI</span>
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="apps"
                  onClick={() => window.Android?.openSys('sound')}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
                >
                  <Volume2 className={`h-5 w-5 ${themePalette.accentTextClass}`} />
                  <span>Suara</span>
                </button>
              </>
            ) : filteredBrowserShortcuts.length === 0 && normalizedAppQuery ? (
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                <span>Tidak ada aplikasi cocok dengan &ldquo;{appSearchQuery}&rdquo;</span>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="apps"
                  onClick={() => setAppSearchQuery('')}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-sky-300 hover:bg-slate-700"
                >
                  Reset
                </button>
              </div>
            ) : (
              filteredBrowserShortcuts.map((item, index) => {
                const isFav = favoriteSet.has(item.url);
                if (favoriteEditMode) {
                  return (
                    <button
                      key={`${item.name}-${item.url}`}
                      type="button"
                      data-focusable="true"
                      data-dpad-row="apps"
                      data-dpad-default={index === 0 ? 'true' : undefined}
                      data-fav-id={item.url}
                      data-fav-label={item.name}
                      onClick={() => toggleFavoriteApp(item.url, item.name)}
                      className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${
                        isFav
                          ? 'border-amber-400/55 bg-amber-500/15 text-amber-100'
                          : themePalette.tileClass
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-bold ${themePalette.accentTextClass}`}>
                        {item.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span>{item.name}</span>
                      <Star
                        aria-label={isFav ? 'Aplikasi favorit' : 'Tandai sebagai favorit'}
                        className={`h-4 w-4 shrink-0 ${
                          isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  );
                }

                return (
                  <a
                    key={`${item.name}-${item.url}`}
                    href={item.url}
                    data-focusable="true"
                    data-dpad-row="apps"
                    data-dpad-default={index === 0 ? 'true' : undefined}
                    data-fav-id={item.url}
                    data-fav-label={item.name}
                    className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${
                      isFav
                        ? 'border-amber-400/55 bg-slate-900/95 text-slate-50'
                        : themePalette.tileClass
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-bold ${themePalette.accentTextClass}`}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{item.name}</span>
                    {isFav && (
                      <Star
                        aria-label="Aplikasi favorit"
                        className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400"
                      />
                    )}
                  </a>
                );
              })
            )}

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => {
                setFavoriteEditMode((prev) => {
                  const next = !prev;
                  showToast(
                    next
                      ? 'Mode Favorit aktif: tekan OK pada aplikasi untuk menyematkan di depan'
                      : 'Mode Favorit selesai'
                  );
                  return next;
                });
              }}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${
                favoriteEditMode
                  ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                  : themePalette.tileClass
              }`}
            >
              <Star
                className={`h-4 w-4 ${
                  favoriteEditMode ? 'fill-amber-400 text-amber-300' : 'text-amber-300'
                }`}
              />
              <span>{favoriteEditMode ? 'Selesai Favorit' : 'Atur Favorit'}</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => setQrSyncOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <QrCode className={`h-5 w-5 ${themePalette.accentTextClass}`} />
              <span>Sinkron HP (QR)</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              data-dpad-default={!isAndroidEnv && browserShortcuts.length === 0 ? 'true' : undefined}
              onClick={() => setSettingsOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <Settings className="h-5 w-5 text-slate-300" />
              <span>Pengaturan</span>
            </button>
          </div>

          <NewsTicker
            cardClass={themePalette.cardClass}
            accentTextClass={themePalette.accentTextClass}
          />

          {/* Quiet TV Remote Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
            <span>
              Navigasi Remote: Panah Arah · OK/Enter Pilih · F Favorit · Back Kembali · M Menu · Tahan M Power Menu
            </span>
            <span>
              {isAndroidEnv
                ? `Android TV Box Bridge · ${androidApps.length} aplikasi terpasang`
                : 'Mode Pratinjau Browser · Gunakan "Bangun APK TV" untuk menginstal di Android TV Box'}
            </span>
          </div>
        </footer>
      </div>

      {/* Inline TV Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-sky-400/40 bg-slate-900/95 px-5 py-3 text-sm font-medium text-slate-100 shadow-2xl"
        >
          {toast}
        </div>
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        androidApps={sortedAndroidApps}
        isAndroidEnv={isAndroidEnv}
        liveWallpaperTitle={activeLiveVideo?.title}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
        onWallpaperChanged={refreshWallpaper}
        onNextLiveWallpaper={handleNextLiveWallpaper}
        onOpenQrSync={() => {
          setSettingsOpen(false);
          setQrSyncOpen(true);
        }}
        onPreviewScreenSaver={() => {
          setSettingsOpen(false);
          screenSaverOpenedAtRef.current = Date.now();
          lastPointerPosRef.current = null;
          setScreenSaverActive(true);
        }}
        onToast={showToast}
      />

      <ApkBuilderModal
        isOpen={apkModalOpen}
        settings={settings}
        onClose={() => setApkModalOpen(false)}
        onToast={showToast}
      />

      <WeeklyPrayerModal
        isOpen={weeklyModalOpen}
        cityName={settings.name}
        hijriDate={hijriDate}
        weekly={weeklyPrayers}
        filter={prayerChartFilter}
        soundNav={settings.soundNav === '1'}
        dpadSpeed={settings.dpadSpeed}
        onFilterChange={setPrayerChartFilter}
        onClose={() => setWeeklyModalOpen(false)}
      />

      <PowerMenuModal
        isOpen={powerMenuOpen}
        soundNav={settings.soundNav === '1'}
        dpadSpeed={settings.dpadSpeed}
        onAction={handlePowerAction}
        onClose={() => setPowerMenuOpen(false)}
      />

      <QrSyncModal
        isOpen={qrSyncOpen}
        settings={settings}
        soundNav={settings.soundNav === '1'}
        onSyncReceived={handleQrSyncReceived}
        onOpenMobilePreview={(code, token) => {
          setQrSyncOpen(false);
          setMobileSyncSession({ code, token, isPreview: true });
        }}
        onClose={() => setQrSyncOpen(false)}
        onToast={showToast}
      />

      <ScreenSaverOverlay
        isOpen={screenSaverActive && powerState === 'awake'}
        clock={formattedClock}
        dateLabel={formattedDate}
        cityName={settings.name}
        temperatureLabel={
          weather && currentWxDesc
            ? `${Math.round(weather.current.temperature_2m)}° ${currentWxDesc.label}`
            : undefined
        }
        onDismiss={() => setScreenSaverActive(false)}
      />

      {/* Power State Overlays (Sleep / Restart / Shutdown) */}
      {powerState === 'sleeping' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mode Siaga TV"
          onClick={() => setPowerState('awake')}
          className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-black/96 px-6 text-center"
        >
          <Moon className="mb-4 h-10 w-10 text-sky-400/80" />
          <div className="font-mono-tabular text-6xl font-light tracking-tight text-slate-200 md:text-8xl">
            {formattedClock}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Mode Sleep aktif · Tekan tombol remote mana saja atau klik layar untuk menyalakan
          </p>
        </div>
      )}

      {(powerState === 'restarting' || powerState === 'shutting_down') && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/98 px-6 text-center"
        >
          {powerState === 'restarting' ? (
            <RotateCcw className="mb-4 h-11 w-11 animate-spin text-amber-400" />
          ) : (
            <Power className="mb-4 h-11 w-11 text-rose-400" />
          )}
          <div className="text-xl font-semibold text-white">
            {powerState === 'restarting' ? 'Memulai ulang sistem…' : 'Mematikan perangkat…'}
          </div>
          <p className="mt-1.5 text-sm text-slate-400">
            {powerState === 'restarting'
              ? 'TV Launcher akan segera dimuat kembali'
              : 'Menyimpan sesi sebelum daya dimatikan'}
          </p>
        </div>
      )}

      {powerState === 'off' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Perangkat Dimatikan"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black px-6 text-center"
        >
          <button
            type="button"
            autoFocus
            onClick={() => setPowerState('awake')}
            className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-8 py-6 text-slate-200 hover:border-sky-400/60 hover:bg-slate-900 focus:outline-2 focus:outline-sky-400"
          >
            <Power className="h-10 w-10 text-slate-300" />
            <div>
              <div className="text-base font-semibold text-white">TV Dimatikan</div>
              <div className="mt-1 text-xs text-slate-400">
                Tekan OK atau klik untuk menyalakan kembali
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

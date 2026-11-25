import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  AlertTriangle,
  Baby,
  BarChart3,
  BellOff,
  Bot,
  Calendar,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Gamepad2,
  History,
  LayoutGrid,
  Lock,
  MapPin,
  Maximize2,
  Monitor,
  Moon,
  Music,
  Package,
  Power,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Star,
  Sun,
  Trophy,
  Tv,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { ApkBuilderModal } from './components/ApkBuilderModal';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ConnectionStatusBadge } from './components/ConnectionStatusBadge';
import { EmergencyBroadcastTicker } from './components/EmergencyBroadcastTicker';
import { GeminiChatModal } from './components/GeminiChatModal';
import { HaramainLiveModal } from './components/HaramainLiveModal';
import { KidsUnlockModal } from './components/KidsUnlockModal';
import { MapsModal } from './components/MapsModal';
import { MobileSyncView } from './components/MobileSyncView';
import { MusicStudioModal } from './components/MusicStudioModal';
import { NewsTicker } from './components/NewsTicker';
import { OrbitSentinelGame } from './components/OrbitSentinelGame';
import { PowerMenuModal } from './components/PowerMenuModal';
import { QrSyncModal } from './components/QrSyncModal';
import { RemoteBatteryBadge } from './components/RemoteBatteryBadge';
import { ScreenSaverOverlay } from './components/ScreenSaverOverlay';
import { SettingsModal } from './components/SettingsModal';
import { WeeklyPrayerChart, type PrayerChartFilter } from './components/WeeklyPrayerChart';
import { WeeklyPrayerModal } from './components/WeeklyPrayerModal';
import { useDpadNavigation } from './hooks/useDpadNavigation';
import {
  FOOTBALL_LEAGUES,
  INDONESIAN_TV_CHANNELS,
  PRAYER_KEYS,
  PRAYER_LABELS,
  SCREEN_SAVER_IDLE_MS,
  TIME_THEME_PALETTES,
  clearLauncherRamCache,
  evaluateWeatherWarning,
  fetchAmbientVideoLoops,
  fetchEmergencyBroadcast,
  fetchFootballMatches,
  fetchPrayerSchedule,
  fetchRecentFootballResults,
  fetchTvSchedules,
  fetchWeather,
  getDayWeatherWarning,
  getFallbackHijriDate,
  getTimeParts,
  getWeatherDescription,
  loadSettings,
  normalizeDashboardCards,
  normalizeQuickShortcut,
  playAdzanSound,
  resolveEffectivePalette,
  resolveTimeTheme,
  saveSettings,
} from './services/launcherApis';
import type {
  AndroidAppItem,
  DailyPrayerEntry,
  DashboardCardId,
  EmergencyBroadcast,
  FootballMatch,
  HaramainCityId,
  HijriDateInfo,
  LauncherSettings,
  LiveWallpaperItem,
  PowerAction,
  PrayerTimings,
  TvChannelSchedule,
  WeatherData,
  WeatherWarning,
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
  const [recentMatchResults, setRecentMatchResults] = useState<FootballMatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [card2Tab, setCard2Tab] = useState<'matches' | 'history' | 'tv'>('matches');
  const [tvChannels, setTvChannels] = useState<TvChannelSchedule[]>([]);
  const [tvLoading, setTvLoading] = useState(true);
  const [selectedTvChannelId, setSelectedTvChannelId] = useState<string>('all');
  const [tvChannelPickerOpen, setTvChannelPickerOpen] = useState(false);
  const tvListScrollRef = useRef<HTMLDivElement | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<DashboardCardId | null>(null);
  const [quickShortcutBusy, setQuickShortcutBusy] = useState(false);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRevision, setWeatherRevision] = useState(0);
  const [simulatedExtremeActive, setSimulatedExtremeActive] = useState(false);
  const [emergencyBroadcast, setEmergencyBroadcast] = useState<EmergencyBroadcast | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastDismissedKey, setBroadcastDismissedKey] = useState<string | null>(null);
  const [customChatBroadcast, setCustomChatBroadcast] = useState<EmergencyBroadcast | null>(null);
  const broadcastCacheRef = React.useRef<Map<string, EmergencyBroadcast>>(new Map());

  const [androidApps, setAndroidApps] = useState<AndroidAppItem[]>([]);
  const [isAndroidEnv, setIsAndroidEnv] = useState<boolean>(() => Boolean(window.Android));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apkModalOpen, setApkModalOpen] = useState(false);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const [qrSyncOpen, setQrSyncOpen] = useState(false);
  const [mapsOpen, setMapsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [haramainOpen, setHaramainOpen] = useState(false);
  const [haramainInitialCity, setHaramainInitialCity] = useState<HaramainCityId>('makkah');
  const [kidsUnlockOpen, setKidsUnlockOpen] = useState(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
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
  const [initialCardsStaggerDone, setInitialCardsStaggerDone] = useState(false);
  const [screenSaverActive, setScreenSaverActive] = useState(false);
  const [dndSession, setDndSession] = useState<{
    silentId: string;
    prayerLabel: string;
    endsAtMs: number;
    isTest?: boolean;
  } | null>(null);
  const [dndBridgeGranted, setDndBridgeGranted] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastAdzanRef = React.useRef<string>('');
  const lastSilentRef = React.useRef<string>('');
  const dismissedSilentIdRef = React.useRef<string>('');
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

  const refreshDndPermission = useCallback(() => {
    if (window.Android?.hasDndAccess) {
      try {
        setDndBridgeGranted(Boolean(window.Android.hasDndAccess()));
      } catch {
        setDndBridgeGranted(null);
      }
    } else {
      setDndBridgeGranted(null);
    }
  }, []);

  const activateDndSession = useCallback(
    (
      silentId: string,
      prayerLabel: string,
      durationMs: number,
      isTest = false
    ) => {
      const endsAtMs = Date.now() + Math.max(1000, durationMs);
      setDndSession({ silentId, prayerLabel, endsAtMs, isTest });

      let nativeApplied = false;
      let missingPermission = false;
      if (window.Android?.setDnd) {
        try {
          const hasAccess = window.Android.hasDndAccess
            ? window.Android.hasDndAccess()
            : true;
          setDndBridgeGranted(hasAccess);
          if (hasAccess) {
            nativeApplied = Boolean(window.Android.setDnd(true));
          } else {
            missingPermission = true;
          }
        } catch {
          // ignore native bridge error
        }
      }

      const mins = Math.max(1, Math.round(durationMs / 60000));
      if (missingPermission) {
        showToast(
          `Auto-Silent aktif di launcher (${prayerLabel}). Beri izin DND Android TV agar notifikasi sistem ikut hening.`
        );
      } else if (nativeApplied) {
        showToast(
          `Mode Hening (DND) Android TV aktif ${mins} menit untuk waktu ${prayerLabel}`
        );
      } else {
        showToast(`Auto-Silent aktif ${mins} menit (${prayerLabel})`);
      }
    },
    [showToast]
  );

  const deactivateDndSession = useCallback(
    (options?: { markDismissed?: boolean; toastMessage?: string }) => {
      setDndSession((prev) => {
        if (options?.markDismissed && prev && !prev.isTest) {
          dismissedSilentIdRef.current = prev.silentId;
        }
        return null;
      });
      if (window.Android?.setDnd) {
        try {
          window.Android.setDnd(false);
        } catch {
          // ignore
        }
      }
      if (options?.toastMessage) {
        showToast(options.toastMessage);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handleGmpQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleGmpQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleGmpQuota);
  }, []);

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
      refreshDndPermission();
      try {
        const parsed = JSON.parse(window.Android.getApps()) as AndroidAppItem[];
        setAndroidApps(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAndroidApps([]);
      }
    } else {
      setIsAndroidEnv(false);
      setDndBridgeGranted(null);
      setAndroidApps([]);
    }
  }, [refreshDndPermission]);

  const loadAllData = useCallback(async (cfg: LauncherSettings) => {
    setPrayerLoading(true);
    setMatchesLoading(true);
    setHistoryLoading(true);
    setWeatherLoading(true);
    setTvLoading(true);

    const favChannels =
      cfg.favoriteTvChannels && cfg.favoriteTvChannels.length > 0
        ? cfg.favoriteTvChannels
        : ['rcti', 'sctv', 'indosiar', 'trans7', 'transtv'];

    const [prayRes, matchRes, pastRes, wxRes, tvRes] = await Promise.all([
      fetchPrayerSchedule(cfg),
      fetchFootballMatches(cfg.league),
      fetchRecentFootballResults(cfg.league),
      fetchWeather(cfg),
      fetchTvSchedules(favChannels),
    ]);

    setPrayerTimes(prayRes.todayTimings);
    setWeeklyPrayers(prayRes.weekly);
    setHijriDate(prayRes.todayHijri || getFallbackHijriDate(cfg.tz));
    setPrayerLoading(false);

    setMatches(matchRes);
    setMatchesLoading(false);

    setRecentMatchResults(pastRes);
    setHistoryLoading(false);

    setWeather(wxRes);
    setWeatherRevision((prev) => prev + 1);
    setWeatherLoading(false);

    setTvChannels(tvRes.channels || []);
    setTvLoading(false);
  }, []);

  const toggleFavoriteTvChannel = useCallback(
    (channelId: string, channelName: string) => {
      setSettings((prev) => {
        const current = prev.favoriteTvChannels || [];
        const exists = current.includes(channelId);
        if (exists && current.length <= 1) {
          showToast('Minimal 1 channel favorit harus dipilih');
          return prev;
        }
        const nextFavs = exists
          ? current.filter((c) => c !== channelId)
          : [...current, channelId];
        const next = { ...prev, favoriteTvChannels: nextFavs };
        saveSettings(next);
        if (exists && selectedTvChannelId === channelId) {
          setSelectedTvChannelId('all');
        }
        showToast(
          exists
            ? `${channelName} dihapus dari Channel Favorit`
            : `${channelName} ditambahkan ke Channel Favorit`
        );
        return next;
      });
    },
    [selectedTvChannelId, showToast]
  );

  const displayedTvPrograms = useMemo(() => {
    const wibParts = getTimeParts('Asia/Jakarta', now);
    const nowMin = wibParts.hour * 60 + Number(wibParts.minute);

    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };

    if (selectedTvChannelId !== 'all') {
      const ch = tvChannels.find((c) => c.id === selectedTvChannelId);
      if (!ch || ch.programs.length === 0) return [];
      const annotated = ch.programs.map((prog, idx) => {
        const startMin = toMinutes(prog.time);
        const nextProg = ch.programs[idx + 1];
        const endMin = nextProg ? toMinutes(nextProg.time) : 24 * 60;
        const isLive = startMin <= nowMin && nowMin < endMin;
        const isUpcoming = startMin > nowMin;
        return {
          ...prog,
          channelId: ch.id,
          channelName: ch.name,
          startMin,
          isLive,
          isUpcoming,
        };
      });
      const currentAndNext = annotated.filter((p) => p.isLive || p.isUpcoming);
      return (currentAndNext.length > 0 ? currentAndNext : annotated).slice(0, 10);
    }

    // Combined "Semua Favorit" view: highlight live + next show per favorite channel
    const combined: Array<{
      channelId: string;
      channelName: string;
      time: string;
      timeLabel: string;
      title: string;
      startMin: number;
      isLive: boolean;
      isUpcoming: boolean;
    }> = [];

    for (const ch of tvChannels) {
      if (!ch.programs || ch.programs.length === 0) continue;
      let liveIdx = -1;
      for (let i = 0; i < ch.programs.length; i++) {
        const start = toMinutes(ch.programs[i].time);
        const nextStart = ch.programs[i + 1] ? toMinutes(ch.programs[i + 1].time) : 24 * 60;
        if (start <= nowMin && nowMin < nextStart) {
          liveIdx = i;
          break;
        }
      }
      if (liveIdx !== -1) {
        const liveProg = ch.programs[liveIdx];
        combined.push({
          ...liveProg,
          channelId: ch.id,
          channelName: ch.name,
          startMin: toMinutes(liveProg.time),
          isLive: true,
          isUpcoming: false,
        });
        const nextProg = ch.programs[liveIdx + 1];
        if (nextProg) {
          combined.push({
            ...nextProg,
            channelId: ch.id,
            channelName: ch.name,
            startMin: toMinutes(nextProg.time),
            isLive: false,
            isUpcoming: true,
          });
        }
      } else {
        const firstUpcoming = ch.programs.find((p) => toMinutes(p.time) > nowMin) || ch.programs[0];
        if (firstUpcoming) {
          combined.push({
            ...firstUpcoming,
            channelId: ch.id,
            channelName: ch.name,
            startMin: toMinutes(firstUpcoming.time),
            isLive: false,
            isUpcoming: toMinutes(firstUpcoming.time) > nowMin,
          });
        }
      }
    }

    combined.sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return a.startMin - b.startMin;
    });
    return combined;
  }, [tvChannels, selectedTvChannelId, now]);

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

  useEffect(() => {
    if (!isAndroidEnv) return;
    const onFocus = () => refreshDndPermission();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAndroidEnv, refreshDndPermission]);

  useEffect(() => {
    if (settings.autoSilent === '0' && dndSession && !dndSession.isTest) {
      deactivateDndSession({ toastMessage: 'Auto-Silent dinonaktifkan' });
    }
  }, [settings.autoSilent, dndSession, deactivateDndSession]);

  // Clock + Adzan + Auto-Silent DND scheduler every second
  useEffect(() => {
    const tickTimer = window.setInterval(() => {
      const current = new Date();
      setNow(current);

      if (dndSession && current.getTime() >= dndSession.endsAtMs) {
        deactivateDndSession({
          toastMessage: `Mode Hening (${dndSession.prayerLabel}) selesai · Perangkat kembali normal`,
        });
      }

      if (prayerTimes) {
        const p = getTimeParts(settings.tz, current);
        const hm = `${String(p.hour).padStart(2, '0')}:${p.minute}`;
        const nowSeconds = (p.hour * 60 + Number(p.minute)) * 60 + Number(p.second);
        const silentDurationMin = settings.autoSilentDurationMin || 15;

        for (const key of PRAYER_KEYS) {
          const timeStr = prayerTimes[key]?.slice(0, 5);
          if (!timeStr) continue;

          const adzanId = `${p.day}-${key}`;
          if (settings.adzan !== '0' && timeStr === hm && lastAdzanRef.current !== adzanId) {
            lastAdzanRef.current = adzanId;
            playAdzanSound();
            showToast(`Waktu Sholat ${PRAYER_LABELS[key]} telah tiba`);
          }

          if (settings.autoSilent === '1') {
            const [th, tm] = timeStr.split(':').map(Number);
            if (Number.isFinite(th) && Number.isFinite(tm)) {
              const startSec = (th * 60 + tm) * 60;
              const endSec = startSec + silentDurationMin * 60;
              const silentId = `${p.year}-${p.month}-${p.day}-${key}`;
              if (
                nowSeconds >= startSec &&
                nowSeconds < endSec &&
                dismissedSilentIdRef.current !== silentId &&
                lastSilentRef.current !== silentId
              ) {
                lastSilentRef.current = silentId;
                activateDndSession(
                  silentId,
                  PRAYER_LABELS[key],
                  (endSec - nowSeconds) * 1000,
                  false
                );
              }
            }
          }
        }
      }
    }, 1000);
    return () => window.clearInterval(tickTimer);
  }, [
    prayerTimes,
    settings.adzan,
    settings.autoSilent,
    settings.autoSilentDurationMin,
    settings.tz,
    dndSession,
    activateDndSession,
    deactivateDndSession,
    showToast,
  ]);

  const isKidsMode = settings.kidsMode === '1';

  useEffect(() => {
    if (!isKidsMode) return;
    setSettingsOpen(false);
    setApkModalOpen(false);
    setWeeklyModalOpen(false);
    setPowerMenuOpen(false);
    setQrSyncOpen(false);
    setMapsOpen(false);
    setChatOpen(false);
    setMusicOpen(false);
    setGameOpen(false);
    setHaramainOpen(false);
    setFavoriteEditMode(false);
    setAppSearchQuery('');
    setSimulatedExtremeActive(false);
  }, [isKidsMode]);

  // Native Android bridge hooks
  useEffect(() => {
    window.__tvBack = () => {
      if (screenSaverActive) {
        setScreenSaverActive(false);
        return true;
      }
      if (kidsUnlockOpen) {
        setKidsUnlockOpen(false);
        return true;
      }
      if (isKidsMode) {
        return false;
      }
      if (haramainOpen) {
        setHaramainOpen(false);
        return true;
      }
      if (gameOpen) {
        setGameOpen(false);
        return true;
      }
      if (mapsOpen) {
        setMapsOpen(false);
        return true;
      }
      if (chatOpen) {
        setChatOpen(false);
        return true;
      }
      if (musicOpen) {
        setMusicOpen(false);
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
      if (isKidsMode) {
        setKidsUnlockOpen(true);
        showToast('Mode Anak aktif · Masukkan PIN orang tua untuk membuka Pengaturan');
        return;
      }
      setHaramainOpen(false);
      setGameOpen(false);
      setMapsOpen(false);
      setChatOpen(false);
      setMusicOpen(false);
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
      if (isKidsMode) {
        setKidsUnlockOpen(true);
        showToast('Mode Anak aktif · Akses Power Menu dinonaktifkan');
        return;
      }
      setHaramainOpen(false);
      setGameOpen(false);
      setMapsOpen(false);
      setChatOpen(false);
      setMusicOpen(false);
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
    isKidsMode,
    kidsUnlockOpen,
    screenSaverActive,
    haramainOpen,
    gameOpen,
    mapsOpen,
    chatOpen,
    musicOpen,
    qrSyncOpen,
    powerMenuOpen,
    powerState,
    weeklyModalOpen,
    apkModalOpen,
    settingsOpen,
    appSearchQuery,
    loadAndroidApps,
    showToast,
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

    if (
      mobileSyncSession ||
      gameOpen ||
      powerState !== 'awake' ||
      settings.screenSaver !== '1'
    ) {
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
  }, [mobileSyncSession, gameOpen, powerState, settings.screenSaver, screenSaverActive]);

  // Main TV launcher 2D D-pad spatial navigation
  useDpadNavigation({
    scopeSelector: '#tv-launcher-root',
    enabled:
      !mobileSyncSession &&
      !screenSaverActive &&
      !kidsUnlockOpen &&
      !settingsOpen &&
      !apkModalOpen &&
      !weeklyModalOpen &&
      !powerMenuOpen &&
      !qrSyncOpen &&
      !mapsOpen &&
      !chatOpen &&
      !musicOpen &&
      !gameOpen &&
      !haramainOpen &&
      powerState === 'awake',
    soundEnabled: settings.soundNav === '1' && !dndSession,
    dpadSpeed: settings.dpadSpeed,
    onBack: () => {
      if (isKidsMode) return;
      if (appSearchQuery) {
        setAppSearchQuery('');
      } else if (favoriteEditMode) {
        setFavoriteEditMode(false);
      }
    },
    onMenu: () => {
      if (isKidsMode) {
        setKidsUnlockOpen(true);
        showToast('Mode Anak aktif · Masukkan PIN orang tua untuk Pengaturan');
      } else {
        setSettingsOpen(true);
      }
    },
    onMenuHold: () => {
      if (isKidsMode) {
        setKidsUnlockOpen(true);
        showToast('Mode Anak aktif · Akses Power Menu dinonaktifkan');
      } else {
        setPowerMenuOpen(true);
      }
    },
  });

  const timeParts = useMemo(() => getTimeParts(settings.tz, now), [settings.tz, now]);
  const activeThemePhase = resolveTimeTheme(timeParts.hour, settings.themeMode);
  const themePalette = useMemo(
    () => resolveEffectivePalette(activeThemePhase, settings.accentColor),
    [activeThemePhase, settings.accentColor]
  );
  const quickShortcut = useMemo(
    () => normalizeQuickShortcut(settings.quickShortcut),
    [settings.quickShortcut]
  );
  const anyModalOpen =
    kidsUnlockOpen ||
    settingsOpen ||
    apkModalOpen ||
    weeklyModalOpen ||
    powerMenuOpen ||
    qrSyncOpen ||
    mapsOpen ||
    chatOpen ||
    musicOpen ||
    gameOpen ||
    haramainOpen;

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
    const timer = window.setTimeout(() => {
      setInitialCardsStaggerDone(true);
    }, 900);
    return () => {
      window.clearTimeout(timer);
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

  const visibleDashboardCards = useMemo(
    () => normalizeDashboardCards(settings.dashboardCards).filter((c) => c.visible),
    [settings.dashboardCards]
  );

  const dashboardCardSpanClass =
    visibleDashboardCards.length === 1
      ? 'lg:col-span-12'
      : visibleDashboardCards.length === 2
      ? 'lg:col-span-6'
      : 'lg:col-span-4';

  const countdownLabel = useMemo(() => {
    if (!nextPrayerInfo) return '';
    const hours = Math.floor(nextPrayerInfo.diff / 3600);
    const mins = Math.floor((nextPrayerInfo.diff % 3600) / 60);
    return `${PRAYER_LABELS[nextPrayerInfo.key]} dalam ${hours > 0 ? `${hours} jam ` : ''}${mins} menit`;
  }, [nextPrayerInfo]);

  const dndRemainingLabel = useMemo(() => {
    if (!dndSession) return '';
    const remSec = Math.max(0, Math.ceil((dndSession.endsAtMs - now.getTime()) / 1000));
    const mm = String(Math.floor(remSec / 60)).padStart(2, '0');
    const ss = String(remSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [dndSession, now]);

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

  const kidsAppSet = useMemo(
    () => new Set(settings.kidsApps || []),
    [settings.kidsApps]
  );

  const kidsAndroidApps = useMemo(
    () => sortedAndroidApps.filter((app) => kidsAppSet.has(app.p)),
    [sortedAndroidApps, kidsAppSet]
  );

  const kidsBrowserShortcuts = useMemo(
    () => sortedBrowserShortcuts.filter((item) => kidsAppSet.has(item.url)),
    [sortedBrowserShortcuts, kidsAppSet]
  );

  useEffect(() => {
    if (
      mobileSyncSession ||
      isKidsMode ||
      kidsUnlockOpen ||
      settingsOpen ||
      apkModalOpen ||
      weeklyModalOpen ||
      powerMenuOpen ||
      qrSyncOpen ||
      mapsOpen ||
      chatOpen ||
      musicOpen ||
      gameOpen ||
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
    isKidsMode,
    kidsUnlockOpen,
    settingsOpen,
    apkModalOpen,
    weeklyModalOpen,
    powerMenuOpen,
    qrSyncOpen,
    mapsOpen,
    chatOpen,
    musicOpen,
    gameOpen,
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

  const handleQuickShortcut = useCallback(async () => {
    const action = quickShortcut.action;
    if (action === 'clear-cache') {
      if (quickShortcutBusy) return;
      setQuickShortcutBusy(true);
      try {
        const res = await clearLauncherRamCache();
        showToast(`Cache RAM dibersihkan (${res.freedLabel})`);
      } finally {
        setQuickShortcutBusy(false);
      }
      return;
    }

    if (action === 'open-settings') {
      setSettingsOpen(true);
      return;
    }

    if (action === 'open-haramain') {
      setHaramainInitialCity('makkah');
      setHaramainOpen(true);
      return;
    }

    if (action === 'toggle-dnd') {
      if (dndSession) {
        deactivateDndSession({
          markDismissed: true,
          toastMessage: 'Mode Hening dimatikan via Pintasan Cepat',
        });
      } else {
        activateDndSession(
          `quick-${Date.now()}`,
          'Pintasan Cepat',
          (settings.autoSilentDurationMin || 15) * 60 * 1000,
          true
        );
      }
      return;
    }

    if (action === 'open-favorite') {
      const targetId = quickShortcut.targetAppId || settings.favoriteApps?.[0];
      if (isAndroidEnv) {
        const targetApp =
          sortedAndroidApps.find((a) => a.p === targetId) || sortedAndroidApps[0];
        if (targetApp) {
          showToast(`Membuka ${targetApp.n}…`);
          window.Android?.launch(targetApp.p);
        } else {
          showToast('Belum ada aplikasi terpasang untuk dibuka');
        }
        return;
      }

      const targetShortcut =
        sortedBrowserShortcuts.find((b) => b.url === targetId) || sortedBrowserShortcuts[0];
      if (targetShortcut) {
        showToast(`Membuka ${targetShortcut.name}…`);
        window.location.assign(targetShortcut.url);
      } else {
        showToast('Atur aplikasi favorit di Pengaturan terlebih dahulu');
      }
    }
  }, [
    quickShortcut,
    quickShortcutBusy,
    dndSession,
    deactivateDndSession,
    activateDndSession,
    settings.autoSilentDurationMin,
    settings.favoriteApps,
    isAndroidEnv,
    sortedAndroidApps,
    sortedBrowserShortcuts,
    showToast,
  ]);

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

  const liveWallpaperFilterClass =
    settings.liveWallpaperFilter === 'monochrome'
      ? 'grayscale contrast-110'
      : settings.liveWallpaperFilter === 'sepia'
      ? 'sepia contrast-105 brightness-95'
      : '';

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

  const effectiveExtremeHazard = useMemo(() => {
    if (weatherWarning?.level === 'extreme') {
      const windGust = Math.max(
        weather?.current.wind_gusts_10m ?? 0,
        weather?.current.wind_speed_10m ?? 0,
        weather?.daily.wind_gusts_10m_max?.[0] ?? 0
      );
      const precip = Math.max(
        weather?.current.precipitation ?? 0,
        weather?.daily.precipitation_sum?.[0] ?? 0
      );
      return {
        key: `live|${settings.name}|${weatherWarning.title}`,
        warning: weatherWarning,
        conditionLabel: currentWxDesc?.label,
        temperatureC: weather?.current.temperature_2m,
        windKmh: windGust > 0 ? windGust : undefined,
        precipMm: precip > 0 ? precip : undefined,
        isSimulated: false,
      };
    }

    if (simulatedExtremeActive) {
      const simWarning: WeatherWarning = {
        level: 'extreme',
        title: 'Cuaca ekstrem: Badai petir & angin kencang',
        detail: `Simulasi peringatan cuaca ekstrem di ${settings.name}: Hujan lebat disertai petir & hembusan angin 65 km/j`,
        isCurrentHazard: true,
        affectedDays: [0],
      };
      return {
        key: `sim|${settings.name}`,
        warning: simWarning,
        conditionLabel: 'Badai petir (Simulasi)',
        temperatureC: weather?.current.temperature_2m,
        windKmh: 65,
        precipMm: 58,
        isSimulated: true,
      };
    }

    return null;
  }, [weatherWarning, simulatedExtremeActive, settings.name, weather, currentWxDesc?.label]);

  const requestEmergencyBroadcast = useCallback(
    async (forceRefresh = false) => {
      if (!effectiveExtremeHazard) return;
      const { key, warning, conditionLabel, temperatureC, windKmh, precipMm, isSimulated } =
        effectiveExtremeHazard;

      if (!forceRefresh) {
        const cached = broadcastCacheRef.current.get(key);
        if (cached) {
          setEmergencyBroadcast(cached);
          setBroadcastError(null);
          return;
        }
      }

      setBroadcastLoading(true);
      setBroadcastError(null);
      try {
        const result = await fetchEmergencyBroadcast({
          cityName: settings.name,
          warningTitle: warning.title,
          warningDetail: warning.detail,
          conditionLabel,
          temperatureC,
          windKmh,
          precipMm,
          isSimulated,
        });
        broadcastCacheRef.current.set(key, result);
        setEmergencyBroadcast(result);
      } catch (err) {
        setBroadcastError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat Pesan Siaran darurat dari asisten AI.'
        );
      } finally {
        setBroadcastLoading(false);
      }
    },
    [effectiveExtremeHazard, settings.name]
  );

  useEffect(() => {
    if (!effectiveExtremeHazard) {
      setEmergencyBroadcast(null);
      setBroadcastError(null);
      setBroadcastLoading(false);
      return;
    }
    if (broadcastDismissedKey === effectiveExtremeHazard.key) {
      return;
    }
    requestEmergencyBroadcast(false);
  }, [effectiveExtremeHazard, broadcastDismissedKey, requestEmergencyBroadcast]);

  const activeBottomBroadcast = customChatBroadcast || emergencyBroadcast;
  const isEmergencyTickerVisible =
    !isKidsMode &&
    !mobileSyncSession &&
    powerState === 'awake' &&
    (Boolean(customChatBroadcast) ||
      (Boolean(effectiveExtremeHazard) &&
        broadcastDismissedKey !== effectiveExtremeHazard?.key));

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
      style={{
        ...(themePalette.focusHex
          ? ({
              '--tv-focus-hex': themePalette.focusHex,
              '--tv-focus-rgb': themePalette.focusRgb,
              '--tv-focus-input-bg': themePalette.focusInputBg,
            } as React.CSSProperties)
          : {}),
        ...(wallpaper
          ? {
              backgroundImage: `url(${wallpaper})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
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
          className={`pointer-events-none fixed inset-0 h-full w-full object-cover transition-[opacity,filter] duration-700 ${liveWallpaperFilterClass} ${
            liveVideoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 bg-gradient-to-b transition-colors duration-700 ${themePalette.scrimClass}`}
      />

      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-[65] shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Safe-Zone 10-Foot TV Container */}
      {isKidsMode ? (
        <div
          className={`relative z-10 flex flex-1 flex-col justify-between gap-6 px-6 py-6 md:px-12 md:py-9 lg:min-h-0 ${
            launcherFadeIn ? 'tv-fade-in-reveal' : ''
          }`}
        >
          {/* Kid-Safe Header */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono-tabular text-5xl font-light tracking-tight text-white md:text-7xl lg:leading-none">
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
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <Baby className="h-4 w-4" />
                  <span>Mode Anak Aktif</span>
                </span>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-400">Akses sistem &amp; pengaturan terkunci</span>
              </p>
            </div>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="top"
              onClick={() => setKidsUnlockOpen(true)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 ${themePalette.tileClass}`}
            >
              <Lock className={`h-4 w-4 ${themePalette.accentTextClass}`} />
              <span>Keluar Mode Anak</span>
            </button>
          </header>

          {/* Locked Kids Apps Grid */}
          <main className="flex flex-1 flex-col justify-center overflow-y-auto py-2 no-scrollbar">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                  Aplikasi Anak
                </h1>
              </div>
              <span className="font-mono-tabular text-xs font-medium text-slate-400 md:text-sm">
                {(isAndroidEnv ? kidsAndroidApps.length : kidsBrowserShortcuts.length)} aplikasi tersedia
              </span>
            </div>

            {(isAndroidEnv ? kidsAndroidApps.length === 0 : kidsBrowserShortcuts.length === 0) ? (
              <div
                className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center backdrop-blur-sm ${themePalette.cardClass}`}
              >
                <Baby className="h-10 w-10 text-emerald-300" />
                <div className="max-w-lg space-y-1.5">
                  <h2 className="text-lg font-semibold text-white">
                    Belum Ada Aplikasi Anak yang Dipilih
                  </h2>
                  <p className="text-sm text-slate-300">
                    Buka kunci dengan PIN orang tua untuk menandai aplikasi yang boleh diakses anak melalui menu Pengaturan.
                  </p>
                </div>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="apps"
                  data-dpad-default="true"
                  onClick={() => setKidsUnlockOpen(true)}
                  className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold ${themePalette.primaryButtonClass}`}
                >
                  <Lock className="h-4 w-4" />
                  <span>Buka Kunci Orang Tua (PIN)</span>
                </button>
              </div>
            ) : (
              <div
                id="tv-kids-apps-grid"
                aria-label="Daftar Aplikasi Anak"
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              >
                {isAndroidEnv
                  ? kidsAndroidApps.map((app, index) => (
                      <button
                        key={app.p}
                        type="button"
                        data-focusable="true"
                        data-dpad-row="apps"
                        data-dpad-default={index === 0 ? 'true' : undefined}
                        onClick={() => window.Android?.launch(app.p)}
                        className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-transform ${themePalette.tileClass}`}
                      >
                        {app.i ? (
                          <img
                            src={`data:image/png;base64,${app.i}`}
                            alt={app.n}
                            className="h-12 w-12 shrink-0 rounded-xl object-contain"
                          />
                        ) : (
                          <Tv className={`h-10 w-10 shrink-0 ${themePalette.accentTextClass}`} />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white md:text-lg">
                            {app.n}
                          </div>
                          <div className="text-xs text-emerald-300/90">Aplikasi Anak</div>
                        </div>
                      </button>
                    ))
                  : kidsBrowserShortcuts.map((item, index) => (
                      <a
                        key={`${item.name}-${item.url}`}
                        href={item.url}
                        data-focusable="true"
                        data-dpad-row="apps"
                        data-dpad-default={index === 0 ? 'true' : undefined}
                        className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-transform ${themePalette.tileClass}`}
                      >
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-base font-bold ${themePalette.accentTextClass}`}
                        >
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white md:text-lg">
                            {item.name}
                          </div>
                          <div className="text-xs text-emerald-300/90">Aplikasi Anak</div>
                        </div>
                      </a>
                    ))}
              </div>
            )}
          </main>

          {/* Quiet Kids Mode Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-400">
            <span>
              Mode Anak Terkunci · Panah Arah pilih aplikasi · OK/Enter buka aplikasi
            </span>
            <span>Orang tua: klik &ldquo;Keluar Mode Anak&rdquo; atau tekan M untuk masukkan PIN</span>
          </footer>
        </div>
      ) : (
      <div
        className={`relative z-10 flex flex-1 flex-col gap-5 px-6 py-5 md:px-10 md:py-7 lg:min-h-0 ${
          isEmergencyTickerVisible ? 'pb-16 lg:pb-14' : ''
        } ${launcherFadeIn ? 'tv-fade-in-reveal' : ''}`}
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

              <ConnectionStatusBadge
                tileClass={themePalette.tileClass}
                isAndroidEnv={isAndroidEnv}
                onToast={showToast}
              />

              <RemoteBatteryBadge
                tileClass={themePalette.tileClass}
                accentTextClass={themePalette.accentTextClass}
                onToast={showToast}
              />
            </div>
          </div>
        </header>

        {/* Main Dynamic TV Info Grid */}
        <MotionConfig reducedMotion="user">
          <main className="grid flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-12 lg:gap-5">
            <AnimatePresence mode="popLayout">
              {visibleDashboardCards.length === 0 ? (
                <motion.div
                  key="dashboard-empty"
                  initial={{ opacity: 0, y: 16, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className={`lg:col-span-12 flex flex-col items-center justify-center gap-3 rounded-2xl border p-8 text-center backdrop-blur-sm ${themePalette.cardClass}`}
                >
                  <LayoutGrid className={`h-8 w-8 ${themePalette.accentTextClass}`} />
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-100">
                      Semua Kartu Dashboard Disembunyikan
                    </h2>
                    <p className="text-xs text-slate-400 md:text-sm">
                      Buka Pengaturan untuk menampilkan kembali atau mengatur ulang posisi kartu Sholat, Jadwal, dan Cuaca.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-focusable="true"
                    data-dpad-row="cards"
                    onClick={() => setSettingsOpen(true)}
                    className={`mt-1 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${themePalette.primaryButtonClass}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>Atur Kartu di Pengaturan</span>
                  </button>
                </motion.div>
              ) : (
                visibleDashboardCards.map((card, cardIdx) => {
                  const enterDelay = !initialCardsStaggerDone ? cardIdx * 0.12 : 0.04;
                  const cardTransition = {
                    opacity: { duration: 0.44, delay: enterDelay, ease: [0.16, 1, 0.3, 1] as const },
                    y: { duration: 0.46, delay: enterDelay, ease: [0.16, 1, 0.3, 1] as const },
                    scale: { duration: 0.44, delay: enterDelay, ease: [0.16, 1, 0.3, 1] as const },
                    layout: { duration: 0.46, delay: 0.06, ease: [0.16, 1, 0.3, 1] as const },
                  };

                  if (card.id === 'prayer') {
                    return (
                      <motion.section
                        key="prayer"
                        layout="position"
                        initial={{ opacity: 0, y: 20, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97 }}
                        transition={cardTransition}
                        onFocusCapture={() => setFocusedCardId('prayer')}
                        onBlurCapture={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setFocusedCardId((prev) => (prev === 'prayer' ? null : prev));
                          }
                        }}
                        className={`tv-dashboard-card flex flex-col rounded-2xl border p-5 backdrop-blur-sm ${dashboardCardSpanClass} lg:min-h-0 ${themePalette.cardClass}`}
                      >
                        {focusedCardId === 'prayer' && (
                          <motion.span
                            layoutId="tv-card-focus-spring"
                            aria-hidden="true"
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 24,
                              mass: 0.75,
                            }}
                            className="pointer-events-none absolute -inset-[1px] rounded-2xl border-2"
                            style={{
                              borderColor: 'var(--tv-focus-hex)',
                              boxShadow: '0 0 24px -4px rgba(var(--tv-focus-rgb), 0.45)',
                            }}
                          />
                        )}
            <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5">
              <div>
                <h2 className="tv-card-title flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-300 transition-colors">
                  <span aria-hidden="true" className="tv-card-focus-dot h-2 w-2 rounded-full" />
                  <span>Waktu Sholat</span>
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
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    setHaramainInitialCity('makkah');
                    setHaramainOpen(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 whitespace-nowrap shrink-0"
                >
                  <Radio className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Haramain</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pb-2">
              <div className={`min-w-0 truncate text-xs font-medium md:text-sm ${themePalette.accentTextClass}`}>
                {prayerViewMode === 'today' && countdownLabel
                  ? countdownLabel
                  : 'Jadwal & pengingat Adzan'}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    dndSession
                      ? 'text-violet-300'
                      : settings.autoSilent === '1'
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                  title="Auto-Silent (Do Not Disturb) saat waktu sholat"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  <span>
                    {dndSession
                      ? `Hening ${dndRemainingLabel}`
                      : settings.autoSilent === '1'
                      ? `DND ${settings.autoSilentDurationMin}m`
                      : 'DND Off'}
                  </span>
                </span>
                <AudioVisualizer accentClass={themePalette.vizBarClass} />
              </div>
            </div>

            {dndSession && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-violet-400/45 bg-violet-500/15 px-3 py-2 text-xs text-violet-100">
                <div className="flex min-w-0 items-center gap-2">
                  <BellOff className="h-4 w-4 shrink-0 text-violet-300" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      Mode Hening (DND) · {dndSession.prayerLabel}
                    </div>
                    <div className="font-mono-tabular text-[11px] text-violet-200/85">
                      Otomatis berakhir dalam {dndRemainingLabel}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() =>
                    deactivateDndSession({
                      markDismissed: true,
                      toastMessage: 'Mode Hening diakhiri manual',
                    })
                  }
                  className="rounded-lg border border-violet-300/40 bg-violet-500/25 px-2.5 py-1 text-[11px] font-semibold text-violet-50 hover:bg-violet-500/40 whitespace-nowrap shrink-0"
                >
                  Akhiri
                </button>
              </div>
            )}

            {isAndroidEnv && settings.autoSilent === '1' && dndBridgeGranted === false && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/45 bg-amber-500/12 px-3 py-1.5 text-[11px] text-amber-100">
                <span className="truncate">
                  Perlu izin Jangan Ganggu agar TV Box hening otomatis
                </span>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    window.Android?.requestDndPermission?.();
                    showToast('Membuka pengaturan izin DND Android TV');
                  }}
                  className="rounded-lg border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 font-semibold text-amber-50 hover:bg-amber-500/35 whitespace-nowrap shrink-0"
                >
                  Izinkan
                </button>
              </div>
            )}

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
                    if (dndSession) {
                      deactivateDndSession({
                        markDismissed: true,
                        toastMessage: 'Mode Hening dimatikan',
                      });
                    } else {
                      activateDndSession(
                        `test-${Date.now()}`,
                        'Uji Hening',
                        (settings.autoSilentDurationMin || 15) * 60 * 1000,
                        true
                      );
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    dndSession
                      ? 'border-violet-400/60 bg-violet-500/25 text-violet-100 hover:bg-violet-500/35'
                      : 'border-slate-700/80 bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <BellOff
                    className={`h-3.5 w-3.5 ${
                      dndSession ? 'text-violet-300' : themePalette.accentTextClass
                    }`}
                  />
                  <span>{dndSession ? 'Stop DND' : 'Tes DND'}</span>
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
          </motion.section>
                );
              }

              if (card.id === 'schedule') {
                return (
                  <motion.section
                    key="schedule"
                    layout="position"
                    initial={{ opacity: 0, y: 20, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.97 }}
                    transition={cardTransition}
                    onFocusCapture={() => setFocusedCardId('schedule')}
                    onBlurCapture={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setFocusedCardId((prev) => (prev === 'schedule' ? null : prev));
                      }
                    }}
                    className={`tv-dashboard-card flex flex-col rounded-2xl border p-5 backdrop-blur-sm ${dashboardCardSpanClass} lg:min-h-0 ${themePalette.cardClass}`}
                  >
                    {focusedCardId === 'schedule' && (
                      <motion.span
                        layoutId="tv-card-focus-spring"
                        aria-hidden="true"
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 24,
                          mass: 0.75,
                        }}
                        className="pointer-events-none absolute -inset-[1px] rounded-2xl border-2"
                        style={{
                          borderColor: 'var(--tv-focus-hex)',
                          boxShadow: '0 0 24px -4px rgba(var(--tv-focus-rgb), 0.45)',
                        }}
                      />
                    )}
            <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5">
              <div>
                <h2 className="tv-card-title flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-300 transition-colors">
                  <span aria-hidden="true" className="tv-card-focus-dot h-2 w-2 rounded-full" />
                  <span>
                    {card2Tab === 'matches'
                      ? 'Jadwal Pertandingan'
                      : card2Tab === 'history'
                      ? 'Riwayat Pertandingan'
                      : 'Jadwal TV Nasional'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {card2Tab === 'matches'
                    ? activeLeagueName
                    : card2Tab === 'history'
                    ? `${activeLeagueName} · Skor akhir 24 jam terakhir`
                    : selectedTvChannelId === 'all'
                    ? `${(settings.favoriteTvChannels || []).length} channel favorit · WIB`
                    : `${
                        INDONESIAN_TV_CHANNELS.find((c) => c.id === selectedTvChannelId)?.name ||
                        selectedTvChannelId.toUpperCase()
                      } · Acara hari ini`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    setCard2Tab('matches');
                    setTvChannelPickerOpen(false);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    card2Tab === 'matches'
                      ? themePalette.activeTabClass
                      : 'border-slate-700/80 bg-slate-800/85 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Bola
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    setCard2Tab('history');
                    setTvChannelPickerOpen(false);
                  }}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    card2Tab === 'history'
                      ? themePalette.activeTabClass
                      : 'border-slate-700/80 bg-slate-800/85 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Riwayat</span>
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => setCard2Tab('tv')}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                    card2Tab === 'tv'
                      ? themePalette.activeTabClass
                      : 'border-slate-700/80 bg-slate-800/85 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5" />
                  <span>Jadwal TV</span>
                </button>
              </div>
            </div>

            {card2Tab === 'matches' ? (
              <>
                <div className="flex items-center justify-end pb-2">
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

                <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto px-1 py-1 no-scrollbar">
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
              </>
            ) : card2Tab === 'history' ? (
              <>
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="text-xs text-slate-400">
                    Hasil akhir 24 jam terakhir
                  </span>
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

                <div className="flex-1 divide-y divide-slate-800/80 overflow-y-auto px-1 py-1 no-scrollbar">
                  {historyLoading ? (
                    <div className="space-y-2.5 py-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className="h-14 animate-pulse rounded-xl bg-slate-800/70"
                        />
                      ))}
                    </div>
                  ) : recentMatchResults.length === 0 ? (
                    <div className="py-6 text-sm text-slate-400">
                      Belum ada pertandingan yang selesai dalam 24 jam terakhir.
                    </div>
                  ) : (
                    recentMatchResults.slice(0, 8).map((m, idx) => {
                      const dateIso =
                        m.strTimestamp ||
                        `${m.dateEvent}T${m.strTime || '12:00:00'}${m.strTime ? 'Z' : 'Z'}`;
                      const d = new Date(dateIso);
                      let finishedAt = m.dateEvent;
                      try {
                        finishedAt = new Intl.DateTimeFormat('id-ID', {
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
                      const scoreLabel = `${m.intHomeScore ?? '-'} - ${m.intAwayScore ?? '-'}`;

                      return (
                        <button
                          key={m.idEvent || `past-${m.strHomeTeam}-${idx}`}
                          type="button"
                          data-focusable="true"
                          data-dpad-row="cards"
                          onClick={() =>
                            showToast(
                              `Skor Akhir: ${m.strHomeTeam} ${scoreLabel} ${m.strAwayTeam}${
                                m.strLeague ? ` · ${m.strLeague}` : ''
                              }`
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-800/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-100 md:text-base">
                              {m.strHomeTeam} vs {m.strAwayTeam}
                            </div>
                            <div className="mt-0.5 truncate font-mono-tabular text-xs text-slate-400">
                              {finishedAt}
                              {m.strLeague ? ` · ${m.strLeague}` : ''}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end">
                            <span
                              className={`font-mono-tabular rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1 text-sm font-bold ${themePalette.accentTextClass}`}
                            >
                              {scoreLabel}
                            </span>
                            <span className="mt-0.5 text-[10px] font-semibold text-emerald-300">
                              {m.strStatus || 'FT'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Favorite TV Channel Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto px-1 py-1.5 no-scrollbar">
                  <button
                    type="button"
                    data-focusable="true"
                    data-dpad-row="cards"
                    onClick={() => {
                      setTvChannelPickerOpen(false);
                      setSelectedTvChannelId('all');
                      if (tvListScrollRef.current) tvListScrollRef.current.scrollTop = 0;
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                      selectedTvChannelId === 'all'
                        ? themePalette.activeTabClass
                        : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Semua
                  </button>

                  {(settings.favoriteTvChannels || []).map((chId) => {
                    const chInfo = INDONESIAN_TV_CHANNELS.find((c) => c.id === chId);
                    const chLabel = chInfo?.name || chId.toUpperCase();
                    const active = selectedTvChannelId === chId;
                    return (
                      <button
                        key={chId}
                        type="button"
                        data-focusable="true"
                        data-dpad-row="cards"
                        onClick={() => {
                          setTvChannelPickerOpen(false);
                          setSelectedTvChannelId(chId);
                          if (tvListScrollRef.current) tvListScrollRef.current.scrollTop = 0;
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                          active
                            ? themePalette.activeTabClass
                            : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {chLabel}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    data-focusable="true"
                    data-dpad-row="cards"
                    onClick={() => setTvChannelPickerOpen((prev) => !prev)}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                      tvChannelPickerOpen
                        ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                        : 'border-slate-700/80 bg-slate-800/80 text-amber-300 hover:bg-slate-800'
                    }`}
                  >
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{tvChannelPickerOpen ? 'Tutup' : 'Favorit'}</span>
                  </button>
                </div>

                {tvChannelPickerOpen ? (
                  <div className="flex-1 overflow-y-auto px-1 py-2 no-scrollbar">
                    <div className="mb-2 text-xs text-slate-400">
                      Pilih channel TV nasional favorit Anda (maks. 8 disarankan):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {INDONESIAN_TV_CHANNELS.map((ch) => {
                        const isFav = (settings.favoriteTvChannels || []).includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            data-focusable="true"
                            data-dpad-row="cards"
                            onClick={() => toggleFavoriteTvChannel(ch.id, ch.name)}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                              isFav
                                ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                                : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Star
                              className={`h-3 w-3 ${
                                isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                              }`}
                            />
                            <span>{ch.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    ref={tvListScrollRef}
                    className="flex-1 overflow-y-auto px-1 py-1 no-scrollbar"
                  >
                    <MotionConfig reducedMotion="user">
                      <AnimatePresence mode="wait" initial={false}>
                        {tvLoading && displayedTvPrograms.length === 0 ? (
                          <motion.div
                            key="tv-loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="space-y-2.5 py-2"
                          >
                            {[0, 1, 2, 3].map((idx) => (
                              <div
                                key={idx}
                                className="h-12 animate-pulse rounded-xl bg-slate-800/70"
                              />
                            ))}
                          </motion.div>
                        ) : displayedTvPrograms.length === 0 ? (
                          <motion.div
                            key={`tv-empty-${selectedTvChannelId}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            className="py-6 text-sm text-slate-400"
                          >
                            Jadwal siaran TV belum tersedia. Periksa koneksi internet Anda.
                          </motion.div>
                        ) : (
                          <motion.div
                            key={selectedTvChannelId}
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.045,
                                  delayChildren: 0.02,
                                },
                              },
                              exit: {
                                opacity: 0,
                                transition: { duration: 0.14 },
                              },
                            }}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className="divide-y divide-slate-800/80"
                          >
                            {displayedTvPrograms.map((prog, idx) => (
                              <motion.button
                                key={`${prog.channelId}-${prog.time}-${idx}`}
                                variants={{
                                  hidden: { opacity: 0, y: 10, scale: 0.985 },
                                  show: {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                      duration: 0.24,
                                      ease: [0.16, 1, 0.3, 1],
                                    },
                                  },
                                }}
                                type="button"
                                data-focusable="true"
                                data-dpad-row="cards"
                                onClick={() =>
                                  showToast(`${prog.channelName} · ${prog.timeLabel} — ${prog.title}`)
                                }
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                                  prog.isLive
                                    ? 'bg-sky-500/12 hover:bg-sky-500/20'
                                    : 'hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={`font-semibold ${themePalette.accentTextClass}`}>
                                      {prog.channelName}
                                    </span>
                                    <span className="font-mono-tabular text-slate-400">
                                      {prog.timeLabel}
                                    </span>
                                    {prog.isLive && (
                                      <span className="font-semibold text-emerald-300">
                                        · Sedang Tayang
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 truncate text-sm font-medium text-slate-100">
                                    {prog.title}
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </MotionConfig>
                  </div>
                )}
              </>
            )}
          </motion.section>
                );
              }

              return (
                <motion.section
                  key="weather"
                  layout="position"
                  initial={{ opacity: 0, y: 20, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.97 }}
                  transition={cardTransition}
                  onFocusCapture={() => setFocusedCardId('weather')}
                  onBlurCapture={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setFocusedCardId((prev) => (prev === 'weather' ? null : prev));
                    }
                  }}
                  className={`tv-dashboard-card flex flex-col rounded-2xl border p-5 backdrop-blur-sm ${dashboardCardSpanClass} lg:min-h-0 ${themePalette.cardClass}`}
                >
                  {focusedCardId === 'weather' && (
                    <motion.span
                      layoutId="tv-card-focus-spring"
                      aria-hidden="true"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 24,
                        mass: 0.75,
                      }}
                      className="pointer-events-none absolute -inset-[1px] rounded-2xl border-2"
                      style={{
                        borderColor: 'var(--tv-focus-hex)',
                        boxShadow: '0 0 24px -4px rgba(var(--tv-focus-rgb), 0.45)',
                      }}
                    />
                  )}
            <div className="flex items-center justify-between gap-2 pb-3">
              <div>
                <h2 className="tv-card-title flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-300 transition-colors">
                  <span aria-hidden="true" className="tv-card-focus-dot h-2 w-2 rounded-full" />
                  <span>Prakiraan Cuaca</span>
                </h2>
                <p className="text-xs text-slate-400">5 hari ke depan · {settings.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="cards"
                  onClick={() => {
                    if (weatherWarning?.level === 'extreme') {
                      setBroadcastDismissedKey(null);
                      setCustomChatBroadcast(null);
                      requestEmergencyBroadcast(true);
                      showToast('Memperbarui Pesan Siaran darurat dari Asisten AI');
                    } else if (simulatedExtremeActive) {
                      setSimulatedExtremeActive(false);
                      setBroadcastDismissedKey(null);
                      showToast('Simulasi Pesan Siaran darurat dihentikan');
                    } else {
                      setBroadcastDismissedKey(null);
                      setCustomChatBroadcast(null);
                      setSimulatedExtremeActive(true);
                      showToast('Mengaktifkan simulasi Pesan Siaran darurat AI');
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    weatherWarning?.level === 'extreme' || simulatedExtremeActive
                      ? 'border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                      : 'border-slate-700/80 bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Radio
                    className={`h-3.5 w-3.5 ${
                      weatherWarning?.level === 'extreme' || simulatedExtremeActive
                        ? 'text-rose-300'
                        : themePalette.accentTextClass
                    }`}
                  />
                  <span>
                    {weatherWarning?.level === 'extreme'
                      ? 'Siaran AI'
                      : simulatedExtremeActive
                      ? 'Stop Siaran'
                      : 'Uji Siaran'}
                  </span>
                </button>
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
                  <RefreshCw
                    className={`h-3.5 w-3.5 transition-transform duration-500 ${themePalette.accentTextClass} ${
                      weatherLoading ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{weatherLoading ? 'Memperbarui…' : 'Perbarui'}</span>
                </button>
              </div>
            </div>

            {weatherWarning && (
              <button
                type="button"
                data-focusable="true"
                data-dpad-row="cards"
                onClick={() => {
                  if (weatherWarning.level === 'extreme') {
                    setBroadcastDismissedKey(null);
                    setCustomChatBroadcast(null);
                    requestEmergencyBroadcast(false);
                  }
                  showToast(weatherWarning.detail);
                }}
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

            <div className="flex-1 divide-y divide-slate-800/70 overflow-y-auto px-1 py-1 no-scrollbar">
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
                    <button
                      key={dateStr}
                      type="button"
                      data-focusable="true"
                      data-dpad-row="cards"
                      title={dayWarn?.label}
                      onClick={() =>
                        showToast(
                          `${dayName} (${settings.name}): ${desc.label} · Hujan ${rainProb}% · ${minTemp}°–${maxTemp}°C`
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-left text-sm hover:bg-slate-800/60 md:text-base"
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
                        <span
                          key={`${weatherRevision}-${dateStr}-${desc.kind}`}
                          className={`inline-flex items-center justify-center tv-weather-icon-enter tv-weather-stagger-${Math.min(
                            idx,
                            4
                          )}`}
                        >
                          <WeatherIcon
                            kind={desc.kind}
                            className="h-5 w-5 transition-transform duration-300 ease-out"
                          />
                        </span>
                        <span className={`font-mono-tabular text-xs md:text-sm ${themePalette.accentTextClass}`}>
                          {rainProb}%
                        </span>
                      </div>
                      <span className="font-mono-tabular font-medium text-slate-100">
                        {maxTemp}° / <span className="text-slate-400">{minTemp}°</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.section>
              );
            })
          )}
            </AnimatePresence>
          </main>
        </MotionConfig>

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
                setHaramainInitialCity('makkah');
                setHaramainOpen(true);
              }}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <Radio className="h-5 w-5 text-emerald-400" />
              <span>Makkah &amp; Madinah Live</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => setMapsOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <MapPin className="h-5 w-5 text-emerald-400" />
              <span>Peta &amp; Sekitar</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => setChatOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <Bot className="h-5 w-5 text-sky-400" />
              <span>Asisten AI</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => setMusicOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <Music className="h-5 w-5 text-amber-300" />
              <span>Studio Musik</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              data-dpad-row="apps"
              onClick={() => setGameOpen(true)}
              className={`flex shrink-0 items-center gap-3 rounded-xl border px-5 py-3.5 text-sm font-medium whitespace-nowrap md:text-base ${themePalette.tileClass}`}
            >
              <Gamepad2 className="h-5 w-5 text-amber-400" />
              <span>Orbit Sentinel</span>
            </button>

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

          {/* Bottom-Left Quick Shortcut + Quiet TV Remote Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-focusable="true"
                data-dpad-row="legend"
                disabled={quickShortcutBusy}
                onClick={handleQuickShortcut}
                title="Tombol Pintasan Cepat (bisa dikustomisasi di Pengaturan)"
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${themePalette.primaryButtonClass} disabled:opacity-60`}
              >
                <Zap className={`h-3.5 w-3.5 ${themePalette.accentTextClass}`} />
                <span>
                  {quickShortcutBusy ? 'Membersihkan…' : quickShortcut.label}
                </span>
              </button>

              <span>
                Navigasi Remote: Panah Arah · OK/Enter Pilih · F Favorit · Back Kembali · M Menu · Tahan M Power Menu
              </span>
            </div>
            <span>
              {isAndroidEnv
                ? `Android TV Box Bridge · ${androidApps.length} aplikasi terpasang`
                : 'Mode Pratinjau Browser · Gunakan "Bangun APK TV" untuk menginstal di Android TV Box'}
            </span>
          </div>
        </footer>
      </div>
      )}

      {/* Bottom-of-Screen Emergency AI Broadcast Running Text (Pesan Siaran) */}
      <EmergencyBroadcastTicker
        visible={isEmergencyTickerVisible}
        cityName={settings.name}
        warningTitle={
          effectiveExtremeHazard?.warning.title || 'Pesan Siaran Asisten AI'
        }
        broadcast={activeBottomBroadcast}
        loading={broadcastLoading && !customChatBroadcast}
        error={customChatBroadcast ? null : broadcastError}
        isSimulated={
          customChatBroadcast ? false : Boolean(effectiveExtremeHazard?.isSimulated)
        }
        onRetry={() => {
          if (customChatBroadcast) {
            setCustomChatBroadcast(null);
          }
          requestEmergencyBroadcast(true);
        }}
        onOpenAssistant={() => setChatOpen(true)}
        onDismiss={() => {
          if (customChatBroadcast) {
            setCustomChatBroadcast(null);
            return;
          }
          if (effectiveExtremeHazard) {
            if (effectiveExtremeHazard.isSimulated) {
              setSimulatedExtremeActive(false);
            } else {
              setBroadcastDismissedKey(effectiveExtremeHazard.key);
            }
          }
        }}
      />

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
      <KidsUnlockModal
        isOpen={kidsUnlockOpen}
        expectedPin={settings.kidsPin}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onUnlock={() => {
          const next: LauncherSettings = { ...settings, kidsMode: '0' };
          setSettings(next);
          saveSettings(next);
          setKidsUnlockOpen(false);
          showToast('Mode Anak dinonaktifkan');
        }}
        onClose={() => setKidsUnlockOpen(false)}
      />

      <SettingsModal
        isOpen={!isKidsMode && settingsOpen}
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
        isOpen={!isKidsMode && apkModalOpen}
        settings={settings}
        onClose={() => setApkModalOpen(false)}
        onToast={showToast}
      />

      <WeeklyPrayerModal
        isOpen={!isKidsMode && weeklyModalOpen}
        cityName={settings.name}
        hijriDate={hijriDate}
        weekly={weeklyPrayers}
        filter={prayerChartFilter}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onFilterChange={setPrayerChartFilter}
        onClose={() => setWeeklyModalOpen(false)}
      />

      <PowerMenuModal
        isOpen={!isKidsMode && powerMenuOpen}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onAction={handlePowerAction}
        onClose={() => setPowerMenuOpen(false)}
      />

      <QrSyncModal
        isOpen={!isKidsMode && qrSyncOpen}
        settings={settings}
        soundNav={settings.soundNav === '1' && !dndSession}
        onSyncReceived={handleQrSyncReceived}
        onOpenMobilePreview={(code, token) => {
          setQrSyncOpen(false);
          setMobileSyncSession({ code, token, isPreview: true });
        }}
        onClose={() => setQrSyncOpen(false)}
        onToast={showToast}
      />

      <MapsModal
        isOpen={!isKidsMode && mapsOpen}
        cityName={settings.name}
        cityLat={settings.lat}
        cityLon={settings.lon}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onSelectCityLocation={(loc) => {
          const updated = {
            ...settings,
            name: loc.name,
            lat: loc.lat,
            lon: loc.lon,
          };
          setSettings(updated);
          saveSettings(updated);
          showToast(`Lokasi launcher diperbarui ke ${loc.name}`);
        }}
        onClose={() => setMapsOpen(false)}
        onToast={showToast}
      />

      <GeminiChatModal
        isOpen={!isKidsMode && chatOpen}
        cityName={settings.name}
        weatherSummary={
          weather && currentWxDesc
            ? `${Math.round(weather.current.temperature_2m)}°C, ${currentWxDesc.label}`
            : undefined
        }
        extremeWeatherWarning={effectiveExtremeHazard?.warning || weatherWarning}
        nextPrayerSummary={countdownLabel || undefined}
        activeLeagueName={activeLeagueName}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onBroadcastReply={(text) => {
          const clean = text.replace(/\s+/g, ' ').trim();
          setCustomChatBroadcast({
            headline: `Siaran Asisten AI (${settings.name})`,
            tickerText: clean,
            advice: '',
            model: 'gemini-4-hydrogen',
            cityName: settings.name,
            warningTitle: effectiveExtremeHazard?.warning.title || 'Pesan Siaran AI',
            generatedAt: new Date().toISOString(),
            isSimulated: false,
          });
          setChatOpen(false);
          showToast('Pesan asisten AI ditampilkan sebagai teks berjalan di bagian bawah layar');
        }}
        onClose={() => setChatOpen(false)}
      />

      <MusicStudioModal
        isOpen={!isKidsMode && musicOpen}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onClose={() => setMusicOpen(false)}
        onToast={showToast}
      />

      <OrbitSentinelGame
        isOpen={!isKidsMode && gameOpen}
        initialMuted={settings.soundNav === '0' || Boolean(dndSession)}
        onExit={() => setGameOpen(false)}
      />

      <HaramainLiveModal
        isOpen={!isKidsMode && haramainOpen}
        initialCity={haramainInitialCity}
        soundNav={settings.soundNav === '1' && !dndSession}
        dpadSpeed={settings.dpadSpeed}
        onClose={() => setHaramainOpen(false)}
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

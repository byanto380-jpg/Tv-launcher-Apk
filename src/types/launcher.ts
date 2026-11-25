export type LiveWallpaperTheme = 'clouds' | 'ocean' | 'aurora' | 'cosmos';
export type LiveWallpaperFilter = 'none' | 'monochrome' | 'sepia';
export type AccentColorPreset =
  | 'theme'
  | 'neon-green'
  | 'royal-blue'
  | 'amber-gold'
  | 'crimson'
  | 'violet';

export type TimeThemePhase = 'dawn' | 'day' | 'night';
export type TimeThemeMode = 'auto' | TimeThemePhase;
export type DpadSpeed = 'slow' | 'normal' | 'fast';

export type QuickShortcutAction =
  | 'clear-cache'
  | 'open-favorite'
  | 'toggle-dnd'
  | 'open-settings'
  | 'open-haramain';

export interface QuickShortcutConfig {
  action: QuickShortcutAction;
  label: string;
  targetAppId?: string;
}

export interface LiveWallpaperItem {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  source: string;
}

export interface ScreenSaverPhoto {
  id: string;
  title: string;
  imageUrl: string;
  photographer?: string;
  source: string;
}

export type DashboardCardId = 'prayer' | 'schedule' | 'weather';

export interface DashboardCardConfig {
  id: DashboardCardId;
  visible: boolean;
}

export interface LauncherSettings {
  name: string;
  lat: number;
  lon: number;
  tz: string;
  method: string;
  league: string;
  adzan: '1' | '0';
  apps: string;
  soundNav: '1' | '0';
  dpadSpeed: DpadSpeed;
  favoriteApps: string[];
  favoriteTvChannels: string[];
  liveWallpaper: '1' | '0';
  liveWallpaperTheme: LiveWallpaperTheme;
  liveWallpaperFilter: LiveWallpaperFilter;
  themeMode: TimeThemeMode;
  accentColor: AccentColorPreset;
  screenSaver: '1' | '0';
  autoSilent: '1' | '0';
  autoSilentDurationMin: number;
  dashboardCards: DashboardCardConfig[];
  quickShortcut: QuickShortcutConfig;
  kidsMode: '1' | '0';
  kidsPin: string;
  kidsApps: string[];
}

export interface TvChannelInfo {
  id: string;
  name: string;
}

export interface TvProgramItem {
  time: string;
  timeLabel: string;
  title: string;
}

export interface TvChannelSchedule {
  id: string;
  name: string;
  programs: TvProgramItem[];
}

export interface TvScheduleResponse {
  updatedAt: string;
  channels: TvChannelSchedule[];
}

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

export interface HijriDateInfo {
  day: string;
  monthNumber: number;
  monthName: string;
  year: string;
  formatted: string;
}

export interface DailyPrayerEntry {
  dateKey: string;
  dayLabel: string;
  fullDateLabel: string;
  hijriLabel: string;
  timings: PrayerTimings;
}

export interface PrayerScheduleResult {
  todayTimings: PrayerTimings | null;
  todayHijri: HijriDateInfo | null;
  weekly: DailyPrayerEntry[];
}

export type NewsCategory = 'tech' | 'sports';

export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  url: string;
}

export interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    precipitation?: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    precipitation_sum?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
  };
}

export type WeatherWarningLevel = 'extreme' | 'warning';

export interface DayWeatherWarning {
  level: WeatherWarningLevel;
  label: string;
}

export interface WeatherWarning {
  level: WeatherWarningLevel;
  title: string;
  detail: string;
  isCurrentHazard: boolean;
  affectedDays: number[];
}

export interface EmergencyBroadcast {
  headline: string;
  tickerText: string;
  advice: string;
  model: string;
  cityName: string;
  warningTitle: string;
  generatedAt: string;
  isSimulated?: boolean;
}

export type HaramainCityId = 'makkah' | 'madinah';

export interface HaramainChannelStream {
  id: HaramainCityId;
  city: string;
  mosque: string;
  channelName: string;
  arabicTitle: string;
  description: string;
  hlsUrl: string;
  youtubeChannelId: string;
  youtubeEmbedUrl: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface FootballMatch {
  idEvent?: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strStatus?: string | null;
  strTimestamp?: string | null;
  dateEvent: string;
  strTime?: string;
  strLeague?: string;
  strVenue?: string;
}

export interface GeoCityResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}

export interface AndroidAppItem {
  n: string; // App name
  p: string; // Package name
  i: string; // Base64 PNG icon
}

export interface ApkBuildConfig {
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  setAsHomeLauncher: boolean;
  lockLandscape: boolean;
  includeSystemShortcuts: boolean;
}

export type PowerAction = 'sleep' | 'restart' | 'shutdown';

export interface AndroidBridge {
  getApps: () => string;
  launch: (packageName: string) => void;
  openSys: (target: 'wifi' | 'display' | 'sound' | 'all') => void;
  getDeviceInfo?: () => string;
  powerAction?: (action: PowerAction) => void;
  setDnd?: (enabled: boolean) => boolean;
  hasDndAccess?: () => boolean;
  requestDndPermission?: () => void;
  getRemoteBattery?: () => string;
  clearAppCache?: () => string;
}

declare global {
  interface Window {
    Android?: AndroidBridge;
    __tvBack?: () => boolean;
    __tvMenu?: () => void;
    __tvPowerMenu?: () => void;
    __tvRefreshApps?: () => void;
  }
}

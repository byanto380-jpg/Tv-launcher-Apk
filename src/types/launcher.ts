export type LiveWallpaperTheme = 'clouds' | 'ocean' | 'aurora' | 'cosmos';

export type TimeThemePhase = 'dawn' | 'day' | 'night';
export type TimeThemeMode = 'auto' | TimeThemePhase;
export type DpadSpeed = 'slow' | 'normal' | 'fast';

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
  liveWallpaper: '1' | '0';
  liveWallpaperTheme: LiveWallpaperTheme;
  themeMode: TimeThemeMode;
  screenSaver: '1' | '0';
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

export interface FootballMatch {
  idEvent?: string;
  strHomeTeam: string;
  strAwayTeam: string;
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

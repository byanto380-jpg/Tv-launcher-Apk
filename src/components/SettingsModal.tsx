import React, { useMemo, useState } from 'react';
import {
  Baby,
  BellOff,
  Check,
  Film,
  Image as ImageIcon,
  MapPin,
  Music,
  Palette,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  SunMoon,
  Tv,
  Upload,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import {
  ACCENT_COLOR_OPTIONS,
  AUTO_SILENT_DURATION_OPTIONS,
  DPAD_SPEED_OPTIONS,
  FOOTBALL_LEAGUES,
  LIVE_WALLPAPER_FILTERS,
  LIVE_WALLPAPER_THEMES,
  PRAYER_METHODS,
  QUICK_SHORTCUT_ACTION_OPTIONS,
  THEME_MODE_OPTIONS,
  normalizeDashboardCards,
  normalizeKidsPin,
  normalizeQuickShortcut,
  playAdzanSound,
  saveAdzanAudio,
  searchCities,
} from '../services/launcherApis';
import { DashboardLayoutGrid } from './DashboardLayoutGrid';
import type {
  AccentColorPreset,
  AndroidAppItem,
  DpadSpeed,
  GeoCityResult,
  LauncherSettings,
  LiveWallpaperFilter,
  LiveWallpaperTheme,
  QuickShortcutAction,
  TimeThemeMode,
} from '../types/launcher';

interface SettingsModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  androidApps: AndroidAppItem[];
  isAndroidEnv: boolean;
  liveWallpaperTitle?: string;
  onSave: (next: LauncherSettings) => void;
  onClose: () => void;
  onWallpaperChanged: () => void;
  onNextLiveWallpaper?: () => void;
  onOpenQrSync?: () => void;
  onPreviewScreenSaver?: () => void;
  onToast: (message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  androidApps,
  isAndroidEnv,
  liveWallpaperTitle,
  onSave,
  onClose,
  onWallpaperChanged,
  onNextLiveWallpaper,
  onOpenQrSync,
  onPreviewScreenSaver,
  onToast,
}) => {
  const [draft, setDraft] = useState<LauncherSettings>(settings);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeoCityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dndAccessGranted, setDndAccessGranted] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setCityResults([]);
      setSearchError(null);
      if (isAndroidEnv && window.Android?.hasDndAccess) {
        try {
          setDndAccessGranted(Boolean(window.Android.hasDndAccess()));
        } catch {
          setDndAccessGranted(null);
        }
      } else {
        setDndAccessGranted(null);
      }
    }
  }, [isOpen, settings, isAndroidEnv]);

  React.useEffect(() => {
    if (!isOpen || !isAndroidEnv) return;
    const onFocus = () => {
      if (window.Android?.hasDndAccess) {
        try {
          setDndAccessGranted(Boolean(window.Android.hasDndAccess()));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isOpen, isAndroidEnv]);

  useDpadNavigation({
    scopeSelector: '#settings-modal',
    enabled: isOpen,
    soundEnabled: draft.soundNav === '1',
    dpadSpeed: draft.dpadSpeed,
    onBack: onClose,
  });

  const shortcutCandidates = useMemo(() => {
    return draft.apps
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('|'))
      .map((line) => {
        const idx = line.indexOf('|');
        return {
          name: line.slice(0, idx).trim(),
          id: line.slice(idx + 1).trim(),
        };
      })
      .filter((item) => item.name && item.id);
  }, [draft.apps]);

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  const handleCitySearch = async () => {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchCities(q);
      setCityResults(results);
      if (results.length === 0) {
        setSearchError('Kota tidak ditemukan.');
      }
    } catch {
      setSearchError('Gagal mencari kota. Periksa koneksi internet.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCity = (city: GeoCityResult) => {
    setDraft((prev) => ({
      ...prev,
      name: city.name,
      lat: city.latitude,
      lon: city.longitude,
      tz: city.timezone,
    }));
    setCityResults([]);
    setCityQuery('');
    onToast(`Lokasi diubah ke ${city.name}`);
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1920 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        localStorage.setItem('tvwp', canvas.toDataURL('image/jpeg', 0.85));
        onWallpaperChanged();
        onToast('Wallpaper berhasil diperbarui');
      } catch {
        try {
          localStorage.setItem('tvwp', canvas.toDataURL('image/jpeg', 0.6));
          onWallpaperChanged();
          onToast('Wallpaper berhasil diperbarui');
        } catch {
          onToast('Ukuran foto terlalu besar untuk penyimpanan lokal');
        }
      }
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleResetWallpaper = () => {
    try {
      localStorage.removeItem('tvwp');
    } catch {
      // ignore
    }
    onWallpaperChanged();
    onToast('Wallpaper dikembalikan ke default');
  };

  const handleAdzanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await saveAdzanAudio(file);
      onToast('Audio adzan tersimpan');
    } catch {
      onToast('Gagal menyimpan audio adzan');
    }
  };

  const toggleFavorite = (id: string) => {
    setDraft((prev) => {
      const current = prev.favoriteApps || [];
      const exists = current.includes(id);
      return {
        ...prev,
        favoriteApps: exists ? current.filter((x) => x !== id) : [...current, id],
      };
    });
  };

  const toggleKidsApp = (id: string) => {
    setDraft((prev) => {
      const current = prev.kidsApps || [];
      const exists = current.includes(id);
      return {
        ...prev,
        kidsApps: exists ? current.filter((x) => x !== id) : [...current, id],
      };
    });
  };

  return (
    <div
      id="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan TV Launcher"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
              Pengaturan TV Launcher
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Gunakan tombol panah remote untuk berpindah opsi, OK untuk memilih, Back untuk kembali
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {onOpenQrSync && (
              <button
                type="button"
                data-focusable="true"
                onClick={onOpenQrSync}
                className="flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 whitespace-nowrap shrink-0"
              >
                <QrCode className="h-4 w-4 text-sky-300" />
                <span>Sinkron QR HP</span>
              </button>
            )}
            <button
              type="button"
              data-focusable="true"
              onClick={onClose}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Lokasi */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">Lokasi saat ini</label>
              <span className="flex items-center gap-1.5 text-sm font-medium text-sky-400">
                <MapPin className="h-4 w-4" />
                {draft.name} ({draft.tz})
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                data-focusable="true"
                data-dpad-default="true"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCitySearch();
                  }
                }}
                placeholder="Cari kota (mis. Surabaya, Bandung, Medan)"
                className="min-w-[260px] flex-1 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100 placeholder-slate-500"
              />
              <button
                type="button"
                data-focusable="true"
                onClick={handleCitySearch}
                disabled={searching}
                className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-600/25 px-5 py-3 text-sm font-medium text-sky-200 hover:bg-sky-600/40 whitespace-nowrap shrink-0"
              >
                <Search className="h-4 w-4" />
                <span>{searching ? 'Mencari…' : 'Cari Kota'}</span>
              </button>
            </div>

            {searchError && <p className="text-sm text-amber-400">{searchError}</p>}

            {cityResults.length > 0 && (
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                {cityResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    data-focusable="true"
                    onClick={() => handleSelectCity(c)}
                    className="flex flex-col items-start rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-left hover:bg-slate-700"
                  >
                    <span className="text-sm font-medium text-slate-100">
                      {c.name}
                      {c.admin1 ? `, ${c.admin1}` : ''}
                    </span>
                    <span className="text-xs text-slate-400">
                      {c.country} · {c.timezone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Metode Sholat & Liga Bola */}
          <section className="grid gap-5 border-b border-slate-800/80 pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="pray-method" className="block text-sm font-medium text-slate-300">
                Metode perhitungan sholat
              </label>
              <select
                id="pray-method"
                data-focusable="true"
                value={draft.method}
                onChange={(e) => setDraft((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100"
              >
                {PRAYER_METHODS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900 text-slate-100">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="league-select" className="block text-sm font-medium text-slate-300">
                Liga sepak bola utama
              </label>
              <select
                id="league-select"
                data-focusable="true"
                value={draft.league}
                onChange={(e) => setDraft((prev) => ({ ...prev, league: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100"
              >
                {FOOTBALL_LEAGUES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-slate-900 text-slate-100">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Tata Letak & Urutan Kartu Dashboard */}
          <DashboardLayoutGrid
            cards={normalizeDashboardCards(draft.dashboardCards)}
            soundNav={draft.soundNav === '1'}
            onChange={(nextCards) =>
              setDraft((prev) => ({ ...prev, dashboardCards: nextCards }))
            }
            onToast={onToast}
          />

          {/* Tema Warna Otomatis (Fajar / Siang / Malam) */}
          <section className="space-y-2 border-b border-slate-800/80 pb-6">
            <label htmlFor="theme-mode" className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <SunMoon className="h-4 w-4 text-amber-300" />
              <span>Tema warna otomatis berdasarkan waktu hari</span>
            </label>
            <p className="text-xs text-slate-400">
              Otomatis bertransisi dari Fajar (04:00–09:59, soft orange), Siang (10:00–17:59, bright blue), hingga Malam (18:00–03:59, deep purple/midnight)
            </p>
            <select
              id="theme-mode"
              data-focusable="true"
              value={draft.themeMode}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  themeMode: e.target.value as TimeThemeMode,
                }))
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100"
            >
              {THEME_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Accent Color Override */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Palette className="h-4 w-4 text-sky-400" />
                <span>Warna Aksen UI Global (Border Fokus &amp; Ikon)</span>
              </label>
              <p className="text-xs text-slate-400">
                Ganti warna sorotan D-pad, tab aktif, dan ikon utama dengan warna pilihan Anda
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ACCENT_COLOR_OPTIONS.map((opt) => {
                  const active = (draft.accentColor || 'theme') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-focusable="true"
                      aria-pressed={active}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          accentColor: opt.value as AccentColorPreset,
                        }))
                      }
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                        active
                          ? 'border-white/75 bg-slate-800 text-white shadow-md'
                          : 'border-slate-700/80 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                        style={{ backgroundColor: opt.swatchHex }}
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Live Wallpaper (Ambient Video) */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Film className="h-4 w-4 text-sky-400" />
                  <span>Live Wallpaper (Video Ambient Minimalis)</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Memutar loop video ambient dari repositori publik Wikimedia Commons &amp; NASA Open Library sebagai latar belakang TV
                </p>
              </div>
              <button
                type="button"
                data-focusable="true"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    liveWallpaper: prev.liveWallpaper === '1' ? '0' : '1',
                  }))
                }
                className={`rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 ${
                  draft.liveWallpaper === '1'
                    ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {draft.liveWallpaper === '1' ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            {draft.liveWallpaper === '1' && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Tema video live wallpaper"
                    data-focusable="true"
                    value={draft.liveWallpaperTheme}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        liveWallpaperTheme: e.target.value as LiveWallpaperTheme,
                      }))
                    }
                    className="min-w-[260px] flex-1 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100"
                  >
                    {LIVE_WALLPAPER_THEMES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-900 text-slate-100">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {onNextLiveWallpaper && settings.liveWallpaper === '1' && (
                    <button
                      type="button"
                      data-focusable="true"
                      onClick={onNextLiveWallpaper}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="h-4 w-4 text-sky-300" />
                      <span>Ganti Klip</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-300">
                    Filter Suasana Ruangan (Live Wallpaper)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {LIVE_WALLPAPER_FILTERS.map((flt) => {
                      const active = (draft.liveWallpaperFilter || 'none') === flt.value;
                      return (
                        <button
                          key={flt.value}
                          type="button"
                          data-focusable="true"
                          aria-pressed={active}
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              liveWallpaperFilter: flt.value as LiveWallpaperFilter,
                            }))
                          }
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium whitespace-nowrap ${
                            active
                              ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                              : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-3 w-3 rounded-sm border border-white/25 ${
                              flt.value === 'monochrome'
                                ? 'bg-gradient-to-br from-slate-100 to-slate-700'
                                : flt.value === 'sepia'
                                ? 'bg-gradient-to-br from-amber-200 to-amber-800'
                                : 'bg-gradient-to-br from-sky-400 to-emerald-500'
                            }`}
                          />
                          <span>{flt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {draft.liveWallpaper === '1' && liveWallpaperTitle && (
              <p className="truncate text-xs text-sky-300">
                Sedang diputar: {liveWallpaperTitle}
              </p>
            )}
          </section>

          {/* Screen Saver Galeri Pemandangan */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  <span>Screen Saver (Galeri Foto Pemandangan)</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Menampilkan galeri foto pemandangan acak secara otomatis setelah 5 menit tidak ada aktivitas pada TV
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onPreviewScreenSaver && draft.screenSaver === '1' && (
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={onPreviewScreenSaver}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    Pratinjau
                  </button>
                )}
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      screenSaver: prev.screenSaver === '1' ? '0' : '1',
                    }))
                  }
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 ${
                    draft.screenSaver === '1'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {draft.screenSaver === '1' ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>
          </section>

          {/* Wallpaper & Suara Navigasi */}
          <section className="grid gap-5 border-b border-slate-800/80 pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Wallpaper foto layar TV (cadangan / saat Live Wallpaper nonaktif)
              </label>
              <div className="flex flex-wrap gap-2.5">
                <label
                  tabIndex={0}
                  data-focusable="true"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      (e.currentTarget.querySelector('input') as HTMLInputElement)?.click();
                    }
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4" />
                  <span>Pilih Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperUpload}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  data-focusable="true"
                  onClick={handleResetWallpaper}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  Kembalikan Default
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="sound-nav" className="block text-sm font-medium text-slate-300">
                  Efek suara navigasi remote
                </label>
                <select
                  id="sound-nav"
                  data-focusable="true"
                  value={draft.soundNav}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, soundNav: e.target.value as '1' | '0' }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100"
                >
                  <option value="1" className="bg-slate-900 text-slate-100">
                    Aktif (bunyi klik halus saat berpindah)
                  </option>
                  <option value="0" className="bg-slate-900 text-slate-100">
                    Nonaktif
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="dpad-speed" className="block text-sm font-medium text-slate-300">
                  Kecepatan navigasi D-pad (saat menahan tombol panah)
                </label>
                <select
                  id="dpad-speed"
                  data-focusable="true"
                  value={draft.dpadSpeed}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      dpadSpeed: e.target.value as DpadSpeed,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-base text-slate-100"
                >
                  {DPAD_SPEED_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Pengingat Adzan */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <label className="block text-sm font-medium text-slate-300">
              Pengingat Adzan otomatis (audio khusus atau bunyi bip)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                data-focusable="true"
                value={draft.adzan}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, adzan: e.target.value as '1' | '0' }))
                }
                className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100"
              >
                <option value="1" className="bg-slate-900 text-slate-100">
                  Adzan Aktif
                </option>
                <option value="0" className="bg-slate-900 text-slate-100">
                  Nonaktif
                </option>
              </select>

              <label
                tabIndex={0}
                data-focusable="true"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    (e.currentTarget.querySelector('input') as HTMLInputElement)?.click();
                  }
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                <Music className="h-4 w-4" />
                <span>Pilih Audio MP3</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAdzanUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                data-focusable="true"
                onClick={() => playAdzanSound()}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Volume2 className="h-4 w-4" />
                <span>Tes Suara</span>
              </button>
            </div>
          </section>

          {/* Auto-Silent (Do Not Disturb Saat Sholat) */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <BellOff className="h-4 w-4 text-violet-300" />
                  <span>Auto-Silent (Mode Hening Otomatis Saat Sholat)</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Mengaktifkan mode Jangan Ganggu (Do Not Disturb) pada perangkat Android TV Box otomatis saat waktu sholat tiba dan menonaktifkannya kembali setelah durasi selesai
                </p>
              </div>
              <button
                type="button"
                data-focusable="true"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    autoSilent: prev.autoSilent === '1' ? '0' : '1',
                  }))
                }
                className={`rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0 ${
                  draft.autoSilent === '1'
                    ? 'border-violet-400 bg-violet-500/25 text-violet-100'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {draft.autoSilent === '1' ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="auto-silent-duration" className="text-xs font-medium text-slate-300">
                  Durasi Mode Hening:
                </label>
                <select
                  id="auto-silent-duration"
                  data-focusable="true"
                  value={draft.autoSilentDurationMin}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      autoSilentDurationMin: Number(e.target.value) || 15,
                    }))
                  }
                  className="rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-sm text-slate-100"
                >
                  {AUTO_SILENT_DURATION_OPTIONS.map((mins) => (
                    <option key={mins} value={mins} className="bg-slate-900 text-slate-100">
                      {mins} menit
                    </option>
                  ))}
                </select>
              </div>

              {isAndroidEnv && (
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => {
                    window.Android?.requestDndPermission?.();
                    onToast('Membuka pengaturan izin Jangan Ganggu (DND) Android TV');
                  }}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                    dndAccessGranted
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                      : 'border-amber-400/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
                  }`}
                >
                  {dndAccessGranted
                    ? 'Izin DND TV Box Aktif'
                    : 'Beri Izin DND Android TV'}
                </button>
              )}
            </div>
          </section>

          {/* Pintasan Cepat Pojok Kiri Bawah */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Tombol Pintasan Cepat (Pojok Kiri Bawah)</span>
              </label>
              <p className="mt-0.5 text-xs text-slate-400">
                Atur aksi satu-klik remote di pojok kiri bawah untuk membersihkan cache RAM atau meluncurkan aplikasi favorit
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="quick-shortcut-action" className="block text-xs font-medium text-slate-300">
                  Aksi Pintasan Cepat
                </label>
                <select
                  id="quick-shortcut-action"
                  data-focusable="true"
                  value={normalizeQuickShortcut(draft.quickShortcut).action}
                  onChange={(e) => {
                    const nextAction = e.target.value as QuickShortcutAction;
                    const defLabel =
                      QUICK_SHORTCUT_ACTION_OPTIONS.find((o) => o.value === nextAction)
                        ?.defaultLabel || 'Pintasan Cepat';
                    setDraft((prev) => ({
                      ...prev,
                      quickShortcut: {
                        ...normalizeQuickShortcut(prev.quickShortcut),
                        action: nextAction,
                        label: defLabel,
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100"
                >
                  {QUICK_SHORTCUT_ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quick-shortcut-label" className="block text-xs font-medium text-slate-300">
                  Label Tombol di Layar Utama
                </label>
                <input
                  id="quick-shortcut-label"
                  type="text"
                  data-focusable="true"
                  maxLength={32}
                  value={normalizeQuickShortcut(draft.quickShortcut).label}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      quickShortcut: {
                        ...normalizeQuickShortcut(prev.quickShortcut),
                        label: e.target.value,
                      },
                    }))
                  }
                  placeholder="mis. Bersihkan Cache RAM"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500"
                />
              </div>
            </div>

            {normalizeQuickShortcut(draft.quickShortcut).action === 'open-favorite' && (
              <div className="space-y-1.5">
                <label htmlFor="quick-shortcut-target" className="block text-xs font-medium text-slate-300">
                  Pilih Aplikasi Target
                </label>
                <select
                  id="quick-shortcut-target"
                  data-focusable="true"
                  value={normalizeQuickShortcut(draft.quickShortcut).targetAppId || ''}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const matched = isAndroidEnv
                      ? androidApps.find((a) => a.p === targetId)?.n
                      : shortcutCandidates.find((c) => c.id === targetId)?.name;
                    setDraft((prev) => ({
                      ...prev,
                      quickShortcut: {
                        ...normalizeQuickShortcut(prev.quickShortcut),
                        targetAppId: targetId || undefined,
                        label: matched ? `Buka ${matched}`.slice(0, 32) : prev.quickShortcut.label,
                      },
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100"
                >
                  <option value="" className="bg-slate-900 text-slate-100">
                    Otomatis (Aplikasi Favorit Pertama)
                  </option>
                  {(isAndroidEnv
                    ? androidApps.map((a) => ({ id: a.p, name: a.n }))
                    : shortcutCandidates
                  ).map((item) => (
                    <option key={item.id} value={item.id} className="bg-slate-900 text-slate-100">
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Mode Anak (Kids Mode) */}
          <section className="space-y-4 border-b border-slate-800/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Baby className="h-4 w-4 text-emerald-300" />
                  <span>Mode Anak (Kids Mode)</span>
                </label>
                <p className="text-xs text-slate-400">
                  Saat aktif, layar TV terkunci hanya ke aplikasi yang ditandai sebagai Aplikasi Anak dan menonaktifkan Pengaturan serta aksi sistem.
                </p>
              </div>
              <span
                className={`font-mono-tabular text-xs font-semibold ${
                  draft.kidsMode === '1' ? 'text-emerald-300' : 'text-slate-400'
                }`}
              >
                {draft.kidsMode === '1' ? 'Terkunci · Mode Anak Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="kids-mode-select" className="block text-xs font-medium text-slate-300">
                  Status Mode Anak
                </label>
                <select
                  id="kids-mode-select"
                  data-focusable="true"
                  value={draft.kidsMode === '1' ? '1' : '0'}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      kidsMode: e.target.value === '1' ? '1' : '0',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100"
                >
                  <option value="0" className="bg-slate-900 text-slate-100">
                    Nonaktif (Tampilan Launcher Normal)
                  </option>
                  <option value="1" className="bg-slate-900 text-slate-100">
                    Aktif (Kunci Antarmuka ke Aplikasi Anak)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="kids-pin-input" className="block text-xs font-medium text-slate-300">
                  PIN Orang Tua (4 Digit untuk Keluar Mode Anak)
                </label>
                <input
                  id="kids-pin-input"
                  type="password"
                  inputMode="numeric"
                  data-focusable="true"
                  maxLength={4}
                  value={draft.kidsPin}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setDraft((prev) => ({ ...prev, kidsPin: digits }));
                  }}
                  placeholder="Default: 1234"
                  className="font-mono-tabular w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm tracking-widest text-slate-100 placeholder-slate-500"
                />
                <p className="text-[11px] text-slate-400">
                  Jika kurang dari 4 angka, otomatis kembali ke PIN default 1234 saat disimpan.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  <span>
                    Pilih Aplikasi Anak ({(draft.kidsApps || []).length} dipilih)
                  </span>
                </div>
                {(isAndroidEnv ? androidApps.length > 0 : shortcutCandidates.length > 0) && (
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() => {
                      const allIds = isAndroidEnv
                        ? androidApps.map((a) => a.p)
                        : shortcutCandidates.map((c) => c.id);
                      const allSelected =
                        allIds.length > 0 &&
                        allIds.every((id) => (draft.kidsApps || []).includes(id));
                      setDraft((prev) => ({
                        ...prev,
                        kidsApps: allSelected ? [] : allIds,
                      }));
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    {(isAndroidEnv
                      ? androidApps.every((a) => (draft.kidsApps || []).includes(a.p))
                      : shortcutCandidates.every((c) => (draft.kidsApps || []).includes(c.id)))
                      ? 'Kosongkan'
                      : 'Pilih Semua'}
                  </button>
                )}
              </div>

              {isAndroidEnv ? (
                androidApps.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada aplikasi Android terdeteksi.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {androidApps.map((app) => {
                      const isKid = (draft.kidsApps || []).includes(app.p);
                      return (
                        <button
                          key={`kid-${app.p}`}
                          type="button"
                          data-focusable="true"
                          onClick={() => toggleKidsApp(app.p)}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left ${
                            isKid
                              ? 'border-emerald-400/65 bg-emerald-500/15 text-emerald-100'
                              : 'border-slate-700/80 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {app.i ? (
                              <img
                                src={`data:image/png;base64,${app.i}`}
                                alt={app.n}
                                className="h-7 w-7 shrink-0 rounded-md object-contain"
                              />
                            ) : (
                              <Tv className="h-5 w-5 shrink-0 text-sky-400" />
                            )}
                            <span className="truncate text-sm font-medium">{app.n}</span>
                          </div>
                          <Baby
                            className={`h-4 w-4 shrink-0 ${
                              isKid ? 'text-emerald-300' : 'text-slate-500'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )
              ) : shortcutCandidates.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Tambahkan pintasan aplikasi di bagian bawah untuk memilih Aplikasi Anak.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {shortcutCandidates.map((item) => {
                    const isKid = (draft.kidsApps || []).includes(item.id);
                    return (
                      <button
                        key={`kid-${item.id}`}
                        type="button"
                        data-focusable="true"
                        onClick={() => toggleKidsApp(item.id)}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left ${
                          isKid
                            ? 'border-emerald-400/65 bg-emerald-500/15 text-emerald-100'
                            : 'border-slate-700/80 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        <Baby
                          className={`h-4 w-4 shrink-0 ${
                            isKid ? 'text-emerald-300' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {draft.kidsMode === '1' && (draft.kidsApps || []).length === 0 && (
                <p className="text-xs font-medium text-amber-300">
                  Peringatan: Mode Anak aktif namun belum ada Aplikasi Anak yang dipilih. Tandai minimal 1 aplikasi agar anak memiliki aplikasi yang dapat dibuka.
                </p>
              )}
            </div>
          </section>

          {/* Aplikasi Favorit */}
          <section className="space-y-3 border-b border-slate-800/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Aplikasi Favorit (Tampil Paling Depan)
                </label>
                <p className="text-xs text-slate-400">
                  {isAndroidEnv
                    ? 'Pilih aplikasi Android terpasang yang ingin disematkan di posisi paling depan pada baris aplikasi.'
                    : 'Mode browser: tandai pintasan favorit di bawah. Di APK Android TV, daftar ini berisi semua aplikasi terpasang.'}
                </p>
              </div>
              <span className="font-mono-tabular text-xs font-medium text-amber-300">
                {(draft.favoriteApps || []).length} favorit
              </span>
            </div>

            {isAndroidEnv ? (
              androidApps.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada aplikasi Android terdeteksi.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {androidApps.map((app) => {
                    const isFav = (draft.favoriteApps || []).includes(app.p);
                    return (
                      <button
                        key={app.p}
                        type="button"
                        data-focusable="true"
                        onClick={() => toggleFavorite(app.p)}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left ${
                          isFav
                            ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                            : 'border-slate-700/80 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {app.i ? (
                            <img
                              src={`data:image/png;base64,${app.i}`}
                              alt={app.n}
                              className="h-7 w-7 shrink-0 rounded-md object-contain"
                            />
                          ) : (
                            <Tv className="h-5 w-5 shrink-0 text-sky-400" />
                          )}
                          <span className="truncate text-sm font-medium">{app.n}</span>
                        </div>
                        <Star
                          className={`h-4 w-4 shrink-0 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )
            ) : shortcutCandidates.length === 0 ? (
              <p className="text-xs text-slate-400">Tambahkan pintasan aplikasi di bawah terlebih dahulu.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {shortcutCandidates.map((item) => {
                  const isFav = (draft.favoriteApps || []).includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-focusable="true"
                      onClick={() => toggleFavorite(item.id)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left ${
                        isFav
                          ? 'border-amber-400/60 bg-amber-500/15 text-amber-100'
                          : 'border-slate-700/80 bg-slate-800/70 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <Star
                        className={`h-4 w-4 shrink-0 ${
                          isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pintasan Aplikasi Browser */}
          <section className="space-y-2">
            <label htmlFor="apps-textarea" className="block text-sm font-medium text-slate-300">
              Pintasan aplikasi mode browser (satu per baris: Nama|URL). Di APK Android TV, seluruh aplikasi terpasang terbaca otomatis.
            </label>
            <textarea
              id="apps-textarea"
              data-focusable="true"
              rows={4}
              value={draft.apps}
              onChange={(e) => setDraft((prev) => ({ ...prev, apps: e.target.value }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-3 font-mono text-sm text-slate-100"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            data-focusable="true"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            Batal
          </button>
          <button
            type="button"
            data-focusable="true"
            onClick={() => {
              onSave({
                ...draft,
                kidsMode: draft.kidsMode === '1' ? '1' : '0',
                kidsPin: normalizeKidsPin(draft.kidsPin),
                kidsApps: Array.isArray(draft.kidsApps) ? draft.kidsApps : [],
              });
              onClose();
            }}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 whitespace-nowrap shrink-0"
          >
            <Check className="h-4 w-4" />
            <span>Simpan &amp; Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

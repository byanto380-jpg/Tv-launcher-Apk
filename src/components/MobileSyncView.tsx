import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Film,
  Image as ImageIcon,
  MapPin,
  Search,
  Send,
  Smartphone,
  Tv,
} from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  DPAD_SPEED_OPTIONS,
  FOOTBALL_LEAGUES,
  LIVE_WALLPAPER_THEMES,
  PRAYER_METHODS,
  THEME_MODE_OPTIONS,
  searchCities,
} from '../services/launcherApis';
import type {
  DpadSpeed,
  GeoCityResult,
  LauncherSettings,
  LiveWallpaperTheme,
  TimeThemeMode,
} from '../types/launcher';

interface MobileSyncViewProps {
  code: string;
  token: string;
  onExitPreview?: () => void;
}

export const MobileSyncView: React.FC<MobileSyncViewProps> = ({
  code,
  token,
  onExitPreview,
}) => {
  const [draft, setDraft] = useState<LauncherSettings>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeoCityResult[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/sync-session/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Sesi tidak ditemukan atau sudah kedaluwarsa.');
        }
        return res.json();
      })
      .then((data: { settings?: LauncherSettings }) => {
        if (cancelled) return;
        if (data.settings) {
          setDraft({ ...DEFAULT_SETTINGS, ...data.settings });
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Gagal terhubung ke sesi TV. Silakan pindai ulang QR code di TV.'
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, token]);

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = cityQuery.trim();
    if (!q) return;
    setSearchingCity(true);
    try {
      const res = await searchCities(q);
      setCityResults(res);
    } catch {
      setCityResults([]);
    } finally {
      setSearchingCity(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    setSentSuccess(false);
    try {
      const res = await fetch(`/api/sync-session/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token,
        },
        body: JSON.stringify({ token, settings: draft }),
      });
      if (!res.ok) {
        throw new Error('Gagal mengirim pengaturan ke TV.');
      }
      setSentSuccess(true);
    } catch (err: unknown) {
      setSendError(
        err instanceof Error ? err.message : 'Gagal mengirim pengaturan. Coba lagi.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d19] px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Pengaturan TV Launcher (HP)
              </h1>
              <p className="text-xs text-slate-400">
                Terhubung ke TV · Kode{' '}
                <span className="font-mono-tabular font-semibold text-sky-300">
                  {code.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke TV</span>
            </button>
          )}
        </header>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-900" />
            ))}
          </div>
        ) : loadError ? (
          <div className="space-y-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-200">
            <div className="flex items-center gap-2 font-semibold">
              <Tv className="h-4 w-4" />
              <span>Koneksi Sesi Terputus</span>
            </div>
            <p className="text-xs text-rose-200/80">{loadError}</p>
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white"
              >
                Kembali ke TV Launcher
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {sentSuccess && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-4 text-sm text-emerald-100">
                <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-semibold">Terkirim ke TV Launcher</div>
                  <div className="text-xs text-emerald-200/80">
                    Perubahan sudah disinkronkan ke layar TV Anda.
                  </div>
                </div>
              </div>
            )}

            {sendError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                {sendError}
              </div>
            )}

            {/* City Search */}
            <section className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Lokasi Kota</span>
                <span className="flex items-center gap-1 font-medium text-sky-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {draft.name}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Cari kota (mis. Bandung, Surabaya)"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={handleCitySearch}
                  disabled={searchingCity}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-2.5 text-sm font-medium text-sky-200 whitespace-nowrap shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span>{searchingCity ? 'Cari…' : 'Cari'}</span>
                </button>
              </div>
              {cityResults.length > 0 && (
                <div className="grid gap-1.5 pt-1">
                  {cityResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          name: c.name,
                          lat: c.latitude,
                          lon: c.longitude,
                          tz: c.timezone,
                        }));
                        setCityResults([]);
                        setCityQuery('');
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.admin1 ? `, ${c.admin1}` : ''} · {c.country}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Prayer & Football */}
            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <div className="space-y-1.5">
                <label htmlFor="m-method" className="block text-xs font-medium text-slate-300">
                  Metode Perhitungan Sholat
                </label>
                <select
                  id="m-method"
                  value={draft.method}
                  onChange={(e) => setDraft((prev) => ({ ...prev, method: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                >
                  {PRAYER_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="m-league" className="block text-xs font-medium text-slate-300">
                  Liga Sepak Bola Utama
                </label>
                <select
                  id="m-league"
                  value={draft.league}
                  onChange={(e) => setDraft((prev) => ({ ...prev, league: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                >
                  {FOOTBALL_LEAGUES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Live Wallpaper & Tema */}
            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <div className="space-y-1.5">
                <label htmlFor="m-theme" className="block text-xs font-medium text-slate-300">
                  Tema Warna Layar (Fajar / Siang / Malam)
                </label>
                <select
                  id="m-theme"
                  value={draft.themeMode}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      themeMode: e.target.value as TimeThemeMode,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                >
                  {THEME_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <Film className="h-4 w-4 text-sky-400" />
                  Live Wallpaper Video Ambient
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      liveWallpaper: prev.liveWallpaper === '1' ? '0' : '1',
                    }))
                  }
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
                    draft.liveWallpaper === '1'
                      ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                      : 'border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  {draft.liveWallpaper === '1' ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {draft.liveWallpaper === '1' && (
                <select
                  aria-label="Tema live wallpaper"
                  value={draft.liveWallpaperTheme}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      liveWallpaperTheme: e.target.value as LiveWallpaperTheme,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                >
                  {LIVE_WALLPAPER_THEMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  Screen Saver Pemandangan (5 Menit)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      screenSaver: prev.screenSaver === '1' ? '0' : '1',
                    }))
                  }
                  className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
                    draft.screenSaver === '1'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                      : 'border-slate-700 bg-slate-950 text-slate-300'
                  }`}
                >
                  {draft.screenSaver === '1' ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="m-adzan" className="block text-xs font-medium text-slate-300">
                    Pengingat Adzan
                  </label>
                  <select
                    id="m-adzan"
                    value={draft.adzan}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, adzan: e.target.value as '1' | '0' }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="m-sound" className="block text-xs font-medium text-slate-300">
                    Suara Remote
                  </label>
                  <select
                    id="m-sound"
                    value={draft.soundNav}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        soundNav: e.target.value as '1' | '0',
                      }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="m-dpad-speed" className="block text-xs font-medium text-slate-300">
                  Kecepatan Navigasi D-pad (Scroll Speed)
                </label>
                <select
                  id="m-dpad-speed"
                  value={draft.dpadSpeed}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      dpadSpeed: e.target.value as DpadSpeed,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
                >
                  {DPAD_SPEED_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Shortcuts */}
            <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
              <label htmlFor="m-apps" className="block text-xs font-medium text-slate-300">
                Pintasan Aplikasi (Nama|URL per baris)
              </label>
              <textarea
                id="m-apps"
                rows={4}
                value={draft.apps}
                onChange={(e) => setDraft((prev) => ({ ...prev, apps: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white"
              />
            </section>

            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Mengirim ke TV…' : 'Kirim Pengaturan ke TV'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

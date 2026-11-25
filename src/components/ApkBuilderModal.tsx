import React, { useState } from 'react';
import { Download, FolderArchive, Monitor, PackageCheck, Terminal, Tv, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import { generateAndroidTvProjectZip } from '../services/androidApkGenerator';
import type { ApkBuildConfig, LauncherSettings } from '../types/launcher';

interface ApkBuilderModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  onClose: () => void;
  onToast: (message: string) => void;
}

export const ApkBuilderModal: React.FC<ApkBuilderModalProps> = ({
  isOpen,
  settings,
  onClose,
  onToast,
}) => {
  const [config, setConfig] = useState<ApkBuildConfig>({
    appName: 'TV Launcher',
    packageId: 'com.tvlauncher.box',
    versionName: '1.0.0',
    versionCode: 1,
    setAsHomeLauncher: true,
    lockLandscape: true,
    includeSystemShortcuts: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useDpadNavigation({
    scopeSelector: '#apk-modal',
    enabled: isOpen,
    soundEnabled: settings.soundNav === '1',
    dpadSpeed: settings.dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  const isValidPackage = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.packageId.trim());

  const handleDownloadZip = async () => {
    if (!isValidPackage) {
      onToast('Format Package ID harus seperti com.tvlauncher.box');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await generateAndroidTvProjectZip(
        {
          ...config,
          appName: config.appName.trim() || 'TV Launcher',
          packageId: config.packageId.trim(),
        },
        settings
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const slug = (config.appName.trim() || 'TVLauncher').replace(/[^a-zA-Z0-9_-]/g, '');
      link.href = url;
      link.download = `${slug}-AndroidTV-APK-Project.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onToast('Proyek Android TV (.zip) berhasil diunduh');
    } catch {
      onToast('Gagal membuat arsip proyek Android TV');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="apk-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Bangun APK Android TV Box"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
                Bangun Paket APK Android TV Box
              </h1>
              <p className="text-sm text-slate-400">
                Ekspor proyek Android Studio / Gradle siap kompilasi menjadi APK dengan dukungan remote D-Pad
              </p>
            </div>
          </div>
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

        {/* Content */}
        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
          {/* Left: APK Configuration */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">
              Konfigurasi Aplikasi Android TV
            </h2>

            <div className="space-y-1.5">
              <label htmlFor="apk-name" className="block text-sm text-slate-400">
                Nama Aplikasi di Layar TV
              </label>
              <input
                id="apk-name"
                type="text"
                data-focusable="true"
                data-dpad-default="true"
                value={config.appName}
                onChange={(e) => setConfig((prev) => ({ ...prev, appName: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-base text-slate-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="apk-pkg" className="block text-sm text-slate-400">
                  Package ID Android
                </label>
                <input
                  id="apk-pkg"
                  type="text"
                  data-focusable="true"
                  value={config.packageId}
                  onChange={(e) => setConfig((prev) => ({ ...prev, packageId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-sm text-slate-100"
                />
                {!isValidPackage && (
                  <p className="text-xs text-rose-400">Contoh valid: com.tvlauncher.box</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="apk-ver" className="block text-sm text-slate-400">
                  Versi Aplikasi
                </label>
                <input
                  id="apk-ver"
                  type="text"
                  data-focusable="true"
                  value={config.versionName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, versionName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                data-focusable="true"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, setAsHomeLauncher: !prev.setAsHomeLauncher }))
                }
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    Daftarkan sebagai Home Launcher (Tombol Home)
                  </div>
                  <div className="text-xs text-slate-400">
                    Menambahkan CATEGORY_HOME &amp; LEANBACK_LAUNCHER di AndroidManifest.xml
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    config.setAsHomeLauncher ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {config.setAsHomeLauncher ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>

              <button
                type="button"
                data-focusable="true"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, lockLandscape: !prev.lockLandscape }))
                }
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    Kunci Orientasi Landscape (16:9 TV Box)
                  </div>
                  <div className="text-xs text-slate-400">
                    Mencegah rotasi potret pada STB/TV Box AOSP
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    config.lockLandscape ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {config.lockLandscape ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>

              <button
                type="button"
                data-focusable="true"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    includeSystemShortcuts: !prev.includeSystemShortcuts,
                  }))
                }
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-slate-100">
                    Sertakan Pintasan Sistem (WiFi, Layar &amp; HDMI, Suara)
                  </div>
                  <div className="text-xs text-slate-400">
                    Akses cepat pengaturan Android TV langsung dari bilah bawah
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    config.includeSystemShortcuts ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {config.includeSystemShortcuts ? 'Aktif' : 'Nonaktif'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Included Native Android Architecture & Build Steps */}
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">
              Komponen Native di dalam Proyek APK
            </h2>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <span className="font-medium text-slate-100">MainActivity.kt (Kotlin + WebViewAssetLoader)</span>
                  <p className="text-xs text-slate-400">
                    Menyediakan bridge <code className="text-sky-300">window.Android</code> untuk membaca daftar semua aplikasi TV terpasang beserta ikonnya (<code className="text-sky-300">getApps()</code>), meluncurkan aplikasi (<code className="text-sky-300">launch()</code>), dan membuka pengaturan WiFi/HDMI/Suara.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <span className="font-medium text-slate-100">Navigasi Remote Control D-Pad 2D &amp; Leanback</span>
                  <p className="text-xs text-slate-400">
                    Mendukung penuh tombol Panah Atas/Bawah/Kiri/Kanan, OK/Enter, Back (<code className="text-sky-300">KEYCODE_BACK</code>), dan tombol Menu (<code className="text-sky-300">KEYCODE_MENU</code>), serta kompatibel dengan Android TV API 21–34 (Android 5.0 hingga Android 14).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FolderArchive className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <span className="font-medium text-slate-100">Auto-Build APK via GitHub Actions</span>
                  <p className="text-xs text-slate-400">
                    Sudah termasuk <code className="text-sky-300">.github/workflows/build-apk.yml</code> sehingga Anda dapat mengompilasi file <code className="text-sky-300">app-debug.apk</code> secara otomatis di cloud tanpa perlu menginstal Android Studio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <span className="font-medium text-slate-100">Instalasi ke Android TV Box</span>
                  <p className="text-xs text-slate-400">
                    Salin <code className="text-sky-300">app-debug.apk</code> ke flashdisk USB atau pasang melalui <code className="font-mono text-sky-300">adb install -r app-debug.apk</code>. Pengaturan kota ({settings.name}), metode sholat, dan liga bola saat ini otomatis ikut terbawa.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <span className="text-xs text-slate-400">
            Target SDK 34 · Min SDK 21 (Android 5.0+) · Mendukung Google TV &amp; STB TV Box AOSP
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-focusable="true"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              Tutup
            </button>
            <button
              type="button"
              data-focusable="true"
              disabled={isGenerating || !isValidPackage}
              onClick={handleDownloadZip}
              className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Menyiapkan Proyek…' : 'Unduh Proyek APK (.zip)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

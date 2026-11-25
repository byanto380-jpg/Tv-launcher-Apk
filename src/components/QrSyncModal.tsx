import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode, RefreshCw, Smartphone, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { LauncherSettings } from '../types/launcher';

interface QrSyncModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  soundNav: boolean;
  onSyncReceived: (next: LauncherSettings) => void;
  onOpenMobilePreview: (code: string, token: string) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

interface SyncSessionInfo {
  code: string;
  token: string;
  expiresAt: number;
}

export const QrSyncModal: React.FC<QrSyncModalProps> = ({
  isOpen,
  settings,
  soundNav,
  onSyncReceived,
  onOpenMobilePreview,
  onClose,
  onToast,
}) => {
  const [session, setSession] = useState<SyncSessionInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const lastAppliedAtRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useDpadNavigation({
    scopeSelector: '#qr-sync-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed: settings.dpadSpeed,
    onBack: onClose,
  });

  const syncUrl =
    session && typeof window !== 'undefined'
      ? `${window.location.origin}/?sync=${encodeURIComponent(session.code)}&t=${encodeURIComponent(session.token)}`
      : '';

  const createSession = useCallback(async () => {
    setCreating(true);
    setError(null);
    setSyncDone(false);
    lastAppliedAtRef.current = 0;

    try {
      const res = await fetch('/api/sync-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsRef.current }),
      });
      if (!res.ok) {
        throw new Error('Gagal membuat sesi sinkronisasi');
      }
      const data = (await res.json()) as SyncSessionInfo;
      setSession(data);

      const url = `${window.location.origin}/?sync=${encodeURIComponent(data.code)}&t=${encodeURIComponent(data.token)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setError(
        'Server sinkronisasi belum terjangkau. Pastikan TV terhubung ke server aplikasi yang sama.'
      );
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSession(null);
      setQrDataUrl('');
      setError(null);
      setSyncDone(false);
      return;
    }
    createSession();
  }, [isOpen, createSession]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !session) return;
    const updateRemaining = () => {
      const secs = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setRemainingSec(secs);
    };
    updateRemaining();
    const t = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(t);
  }, [isOpen, session]);

  // Poll server for incoming mobile settings
  useEffect(() => {
    if (!isOpen || !session) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/sync-session/${encodeURIComponent(session.code)}?t=${encodeURIComponent(session.token)}`
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          synced?: boolean;
          updatedAt?: number;
          settings?: LauncherSettings;
        };
        if (
          data.synced &&
          data.settings &&
          typeof data.updatedAt === 'number' &&
          data.updatedAt > lastAppliedAtRef.current
        ) {
          lastAppliedAtRef.current = data.updatedAt;
          setSyncDone(true);
          onSyncReceived(data.settings);
        }
      } catch {
        // ignore transient poll failures
      }
    };

    const timer = window.setInterval(poll, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, session, onSyncReceived]);

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const countdownText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleCopy = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      onToast('Tautan sinkronisasi disalin');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Tidak dapat menyalin tautan');
    }
  };

  return (
    <div
      id="qr-sync-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Sinkronisasi Pengaturan via QR Code"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
                Sinkronisasi Pengaturan dari HP
              </h1>
              <p className="text-sm text-slate-400">
                Pindai QR code dengan kamera HP untuk mengatur kota, jadwal sholat, liga bola, &amp; aplikasi favorit lebih cepat
              </p>
            </div>
          </div>
          <button
            type="button"
            data-focusable="true"
            data-dpad-row="qr-top"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-4 w-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 items-center gap-8 overflow-y-auto px-6 py-7 md:grid-cols-[auto_1fr]">
          {/* Left: Scannable QR Code */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex h-[268px] w-[268px] items-center justify-center rounded-2xl bg-white p-3 shadow-lg">
              {creating ? (
                <div className="text-sm font-medium text-slate-600">Membuat QR Code…</div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code Sinkronisasi TV Launcher"
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <div className="px-4 text-center text-xs text-slate-500">
                  QR Code tidak tersedia
                </div>
              )}
            </div>

            {session && (
              <div className="text-center">
                <span className="text-xs text-slate-400">Kode Pairing: </span>
                <span className="font-mono-tabular text-sm font-semibold tracking-wider text-sky-300">
                  {session.code}
                </span>
                <span className="mx-2 text-slate-600">·</span>
                <span className="font-mono-tabular text-xs text-slate-400">
                  Berlaku {countdownText}
                </span>
              </div>
            )}
          </div>

          {/* Right: Instructions & Status */}
          <div className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                {error}
              </div>
            ) : syncDone ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-4 text-sm text-emerald-100">
                <Check className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-semibold">Pengaturan berhasil disinkronkan dari HP</div>
                  <div className="text-xs text-emerald-200/80">
                    Perubahan sudah diterapkan ke TV Launcher secara otomatis. Anda dapat mengirim pembaruan lagi atau menutup jendela ini.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="font-medium text-white">Menunggu konfigurasi dari HP…</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Buka kamera HP atau pemindai QR, arahkan ke kode di sebelah kiri, lalu ubah pengaturan dan tekan <span className="text-slate-200 font-medium">Kirim ke TV</span>. Layar TV akan memperbarui secara otomatis.
                </p>
              </div>
            )}

            <ol className="space-y-2 text-sm text-slate-300">
              <li>1. Pindai QR code menggunakan kamera ponsel Anda.</li>
              <li>2. Cari kota, aktifkan Live Wallpaper, atau edit pintasan aplikasi dengan keyboard HP.</li>
              <li>3. Tekan tombol kirim untuk menyinkronkan ke TV secara instan.</li>
            </ol>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                data-focusable="true"
                data-dpad-default="true"
                data-dpad-row="qr-actions"
                onClick={createSession}
                disabled={creating}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-4 w-4 text-sky-300 ${creating ? 'animate-spin' : ''}`} />
                <span>Buat Ulang QR</span>
              </button>

              {syncUrl && (
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="qr-actions"
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-300" />
                  )}
                  <span>{copied ? 'Tersalin' : 'Salin Tautan'}</span>
                </button>
              )}

              {session && (
                <button
                  type="button"
                  data-focusable="true"
                  data-dpad-row="qr-actions"
                  onClick={() => onOpenMobilePreview(session.code, session.token)}
                  className="flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30 whitespace-nowrap shrink-0"
                >
                  <Smartphone className="h-4 w-4 text-sky-300" />
                  <span>Buka Halaman HP</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 text-xs text-slate-400">
          <span>Sesi sinkronisasi dilindungi token acak dan otomatis kedaluwarsa setelah 15 menit</span>
          <span>Back/Esc Tutup</span>
        </div>
      </div>
    </div>
  );
};

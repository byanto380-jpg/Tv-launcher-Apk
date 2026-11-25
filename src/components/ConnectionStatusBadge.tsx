import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';

interface NetworkInformationLike extends EventTarget {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

type SignalLevel = 0 | 1 | 2 | 3 | 4;

interface ConnectionSnapshot {
  online: boolean;
  signalLevel: SignalLevel;
  rttMs: number | null;
}

interface ConnectionStatusBadgeProps {
  tileClass?: string;
  isAndroidEnv?: boolean;
  onToast?: (message: string) => void;
}

function computeSignalLevel(
  online: boolean,
  measuredRttMs: number | null,
  conn?: NetworkInformationLike
): SignalLevel {
  if (!online) return 0;

  const effective = conn?.effectiveType;
  const downlink = typeof conn?.downlink === 'number' ? conn.downlink : null;
  const connRtt = typeof conn?.rtt === 'number' && conn.rtt > 0 ? conn.rtt : null;
  const rtt = measuredRttMs ?? connRtt;

  if (effective === 'slow-2g' || effective === '2g') return 1;
  if (effective === '3g') {
    if (rtt !== null && rtt > 500) return 2;
    return 3;
  }

  if (rtt !== null) {
    if (rtt > 850) return 1;
    if (rtt > 380) return 2;
    if (rtt > 160) return 3;
  }

  if (downlink !== null) {
    if (downlink < 1.2) return 2;
    if (downlink < 4) return 3;
  }

  return 4;
}

function getSignalLabel(level: SignalLevel): string {
  switch (level) {
    case 4:
      return 'Kuat';
    case 3:
      return 'Baik';
    case 2:
      return 'Sedang';
    case 1:
      return 'Lemah';
    default:
      return 'Terputus';
  }
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  tileClass = '',
  isAndroidEnv = false,
  onToast,
}) => {
  const [status, setStatus] = useState<ConnectionSnapshot>(() => {
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithConnection) : undefined;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    return {
      online: initialOnline,
      signalLevel: computeSignalLevel(initialOnline, null, conn),
      rttMs: null,
    };
  });
  const [checking, setChecking] = useState(false);
  const prevOnlineRef = useRef<boolean | null>(null);

  const checkConnection = useCallback(async (manual = false) => {
    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!navigator.onLine) {
      setStatus({ online: false, signalLevel: 0, rttMs: null });
      if (manual) {
        onToast?.('Koneksi terputus. Periksa jaringan Wi-Fi atau LAN Anda.');
      }
      return;
    }

    if (manual) setChecking(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4500);
    const startedAt = performance.now();

    try {
      const res = await fetch('/api/ping', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
      const isOk = res.ok || res.status === 204;
      const nextLevel = computeSignalLevel(isOk, isOk ? elapsed : null, conn);
      setStatus({
        online: isOk,
        signalLevel: nextLevel,
        rttMs: isOk ? elapsed : null,
      });
      if (manual) {
        onToast?.(
          isOk
            ? `Koneksi terhubung · Sinyal ${getSignalLabel(nextLevel)} (${elapsed} ms)`
            : 'Koneksi ke server tidak merespons'
        );
      }
    } catch {
      const stillBrowserOnline = navigator.onLine;
      setStatus({
        online: false,
        signalLevel: 0,
        rttMs: null,
      });
      if (manual) {
        onToast?.(
          stillBrowserOnline
            ? 'Koneksi internet atau server tidak terjangkau'
            : 'Koneksi terputus. Periksa jaringan Wi-Fi Anda.'
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (manual) setChecking(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (prevOnlineRef.current === null) {
      prevOnlineRef.current = status.online;
      return;
    }
    if (prevOnlineRef.current !== status.online) {
      prevOnlineRef.current = status.online;
      onToast?.(
        status.online
          ? 'Koneksi jaringan kembali tersambung'
          : 'Koneksi jaringan terputus'
      );
    }
  }, [status.online, onToast]);

  useEffect(() => {
    void checkConnection(false);

    const handleOnline = () => {
      void checkConnection(false);
    };

    const handleOffline = () => {
      setStatus({ online: false, signalLevel: 0, rttMs: null });
    };

    const handleConnectionChange = () => {
      const nav = navigator as NavigatorWithConnection;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      setStatus((prev) => ({
        ...prev,
        signalLevel: computeSignalLevel(prev.online && navigator.onLine, prev.rttMs, conn),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    conn?.addEventListener?.('change', handleConnectionChange);

    const intervalId = window.setInterval(() => {
      void checkConnection(false);
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener?.('change', handleConnectionChange);
      window.clearInterval(intervalId);
    };
  }, [checkConnection]);

  const { online, signalLevel, rttMs } = status;
  const signalLabel = getSignalLabel(signalLevel);
  const isWeak = online && signalLevel <= 2;

  const badgeToneClass = !online
    ? 'border-rose-500/65 bg-rose-500/18 text-rose-200 hover:bg-rose-500/28'
    : isWeak
    ? 'border-amber-400/50 bg-amber-500/14 text-amber-100 hover:bg-amber-500/24'
    : `${tileClass} text-slate-100`;

  const iconAccentClass = !online
    ? 'text-rose-400'
    : isWeak
    ? 'text-amber-300'
    : 'text-emerald-400';

  const statusText = !online ? 'Terputus' : signalLabel;

  return (
    <button
      type="button"
      data-focusable="true"
      data-dpad-row="top"
      aria-live="polite"
      aria-label={
        online
          ? `Status koneksi: Terhubung, sinyal ${signalLabel}${rttMs ? ` (${rttMs} ms)` : ''}`
          : 'Status koneksi: Terputus'
      }
      title={
        online
          ? `Terhubung · Sinyal ${signalLabel}${rttMs ? ` (${rttMs} ms)` : ''}`
          : 'Koneksi terputus — tekan untuk memeriksa ulang'
      }
      onClick={() => {
        if (isAndroidEnv && window.Android) {
          window.Android.openSys('wifi');
          return;
        }
        void checkConnection(true);
      }}
      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-300 md:text-sm ${badgeToneClass}`}
    >
      {online ? (
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 ${iconAccentClass} ${checking ? 'animate-pulse' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Outer arc (Level 4) */}
          <path
            d="M2 8.82a15 15 0 0 1 20 0"
            className={signalLevel >= 4 ? 'opacity-100' : 'opacity-25'}
          />
          {/* Middle arc (Level 3) */}
          <path
            d="M5 12.859a10 10 0 0 1 14 0"
            className={signalLevel >= 3 ? 'opacity-100' : 'opacity-25'}
          />
          {/* Inner arc (Level 2) */}
          <path
            d="M8.5 16.429a5 5 0 0 1 7 0"
            className={signalLevel >= 2 ? 'opacity-100' : 'opacity-25'}
          />
          {/* Base dot (Level 1+) */}
          <circle
            cx="12"
            cy="20"
            r="1.15"
            fill="currentColor"
            stroke="none"
            className={signalLevel >= 1 ? 'opacity-100' : 'opacity-25'}
          />
        </svg>
      ) : (
        <WifiOff
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-rose-400"
        />
      )}

      {/* Compact 4-bar signal meter */}
      <span
        aria-hidden="true"
        className="flex h-3.5 items-end gap-[2px]"
      >
        {[1, 2, 3, 4].map((bar) => {
          const active = online && signalLevel >= bar;
          const heightClass =
            bar === 1
              ? 'h-1.5'
              : bar === 2
              ? 'h-2'
              : bar === 3
              ? 'h-2.5'
              : 'h-3.5';
          const barColor = !online
            ? 'bg-rose-400/35'
            : active
            ? isWeak
              ? 'bg-amber-300'
              : 'bg-emerald-400'
            : 'bg-slate-600/55';
          return (
            <span
              key={bar}
              className={`w-[2.5px] rounded-full transition-colors duration-300 ${heightClass} ${barColor}`}
            />
          );
        })}
      </span>

      <span className={!online ? 'font-semibold text-rose-200' : 'text-slate-200'}>
        {statusText}
      </span>
    </button>
  );
};

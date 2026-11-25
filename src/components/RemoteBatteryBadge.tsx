import React, { useCallback, useEffect, useState } from 'react';
import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Gamepad2 } from 'lucide-react';

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManagerLike>;
}

interface RemoteBatterySnapshot {
  levelPct: number | null;
  charging: boolean;
  source: string;
}

interface RemoteBatteryBadgeProps {
  tileClass?: string;
  accentTextClass?: string;
  onToast?: (message: string) => void;
}

export const RemoteBatteryBadge: React.FC<RemoteBatteryBadgeProps> = ({
  tileClass = '',
  accentTextClass = 'text-sky-300',
  onToast,
}) => {
  const [battery, setBattery] = useState<RemoteBatterySnapshot>({
    levelPct: null,
    charging: false,
    source: 'Remote D-Pad',
  });
  const [inputPulse, setInputPulse] = useState(false);

  const refreshBattery = useCallback(async (manual = false) => {
    // 1. Check Android TV Native Bridge (Bluetooth HID InputDevice / BatteryManager)
    try {
      const rawAndroid = window.Android?.getRemoteBattery?.();
      if (rawAndroid) {
        const parsed = JSON.parse(rawAndroid) as {
          level?: unknown;
          charging?: unknown;
          source?: unknown;
        };
        const lvl = Number(parsed.level);
        if (Number.isFinite(lvl) && lvl >= 0 && lvl <= 100) {
          const snap: RemoteBatterySnapshot = {
            levelPct: Math.round(lvl),
            charging: Boolean(parsed.charging),
            source:
              typeof parsed.source === 'string' && parsed.source.trim()
                ? parsed.source.trim()
                : 'Remote Bluetooth TV',
          };
          setBattery(snap);
          if (manual) {
            onToast?.(
              `Baterai ${snap.source}: ${snap.levelPct}%${snap.charging ? ' (Mengisi daya)' : ''}`
            );
          }
          return;
        }
      }
    } catch {
      // ignore invalid bridge payload
    }

    // 2. Check Web Battery Status API (Chromium / Android WebView)
    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery === 'function') {
      try {
        const bm = await nav.getBattery();
        const lvl = Math.round((bm.level ?? 1) * 100);
        const snap: RemoteBatterySnapshot = {
          levelPct: Number.isFinite(lvl) ? Math.max(0, Math.min(100, lvl)) : null,
          charging: Boolean(bm.charging),
          source: 'Perangkat Input',
        };
        setBattery(snap);
        if (manual && snap.levelPct !== null) {
          onToast?.(
            `Daya Perangkat Input: ${snap.levelPct}%${snap.charging ? ' (Mengisi daya)' : ''}`
          );
        }
        return;
      } catch {
        // fallback below
      }
    }

    // 3. Fallback when browser restricts Battery API
    const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const connectedPad = Array.from(gamepads || []).find(Boolean);
    const fallbackSource = connectedPad ? connectedPad.id.slice(0, 28) : 'D-Pad / Keyboard Aktif';
    setBattery({ levelPct: null, charging: false, source: fallbackSource });
    if (manual) {
      onToast?.(`Input D-Pad terhubung (${fallbackSource})`);
    }
  }, [onToast]);

  useEffect(() => {
    void refreshBattery(false);

    let batteryManager: BatteryManagerLike | null = null;
    const handleBatteryChange = () => {
      void refreshBattery(false);
    };

    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery === 'function') {
      nav
        .getBattery()
        .then((bm) => {
          batteryManager = bm;
          bm.addEventListener('levelchange', handleBatteryChange);
          bm.addEventListener('chargingchange', handleBatteryChange);
        })
        .catch(() => {
          // ignore
        });
    }

    const intervalId = window.setInterval(() => {
      void refreshBattery(false);
    }, 30000);

    let pulseTimeout: number | null = null;
    const handleInputPulse = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Enter'
      ) {
        setInputPulse(true);
        if (pulseTimeout !== null) window.clearTimeout(pulseTimeout);
        pulseTimeout = window.setTimeout(() => setInputPulse(false), 260);
      }
    };

    window.addEventListener('keydown', handleInputPulse, { passive: true });
    window.addEventListener('gamepadconnected', handleBatteryChange);
    window.addEventListener('gamepaddisconnected', handleBatteryChange);

    return () => {
      window.clearInterval(intervalId);
      if (pulseTimeout !== null) window.clearTimeout(pulseTimeout);
      window.removeEventListener('keydown', handleInputPulse);
      window.removeEventListener('gamepadconnected', handleBatteryChange);
      window.removeEventListener('gamepaddisconnected', handleBatteryChange);
      batteryManager?.removeEventListener('levelchange', handleBatteryChange);
      batteryManager?.removeEventListener('chargingchange', handleBatteryChange);
    };
  }, [refreshBattery]);

  const pct = battery.levelPct;
  const isCritical = pct !== null && !battery.charging && pct <= 15;
  const isLow = pct !== null && !battery.charging && pct > 15 && pct <= 25;

  const toneClass = isCritical
    ? 'border-rose-500/65 bg-rose-500/18 text-rose-100 hover:bg-rose-500/28'
    : isLow
    ? 'border-amber-400/55 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
    : `${tileClass} text-slate-100`;

  const Icon = battery.charging
    ? BatteryCharging
    : pct === null
    ? Gamepad2
    : pct <= 25
    ? BatteryLow
    : pct <= 60
    ? BatteryMedium
    : BatteryFull;

  const iconColor = battery.charging
    ? 'text-emerald-400'
    : isCritical
    ? 'text-rose-400'
    : isLow
    ? 'text-amber-300'
    : accentTextClass;

  return (
    <button
      type="button"
      data-focusable="true"
      data-dpad-row="top"
      aria-live="polite"
      aria-label={
        pct !== null
          ? `Baterai remote D-pad ${pct}%${battery.charging ? ', sedang mengisi' : ''}`
          : 'Status daya perangkat D-Pad aktif'
      }
      title={
        pct !== null
          ? `${battery.source}: ${pct}%${battery.charging ? ' (Mengisi daya)' : ''}`
          : `${battery.source} · Klik untuk cek ulang baterai`
      }
      onClick={() => void refreshBattery(true)}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-300 md:text-sm ${toneClass}`}
    >
      <span className="relative flex items-center justify-center">
        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${iconColor}`} />
        {inputPulse && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
          />
        )}
      </span>
      <span className="font-mono-tabular">
        {pct !== null ? `${pct}%` : 'D-Pad'}
      </span>
    </button>
  );
};

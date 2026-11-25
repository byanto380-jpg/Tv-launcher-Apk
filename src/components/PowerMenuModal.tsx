import React from 'react';
import { Moon, Power, RotateCcw, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DpadSpeed, PowerAction } from '../types/launcher';

interface PowerMenuModalProps {
  isOpen: boolean;
  soundNav: boolean;
  dpadSpeed?: DpadSpeed;
  onAction: (action: PowerAction) => void;
  onClose: () => void;
}

const POWER_OPTIONS: Array<{
  action: PowerAction;
  label: string;
  description: string;
  icon: typeof Moon;
  accentClass: string;
  iconBgClass: string;
}> = [
  {
    action: 'sleep',
    label: 'Sleep',
    description: 'Redupkan layar ke mode siaga hemat daya',
    icon: Moon,
    accentClass: 'hover:border-sky-400/70 hover:bg-sky-500/10',
    iconBgClass: 'bg-sky-500/15 text-sky-300',
  },
  {
    action: 'restart',
    label: 'Restart',
    description: 'Mulai ulang TV Launcher dan segarkan sistem',
    icon: RotateCcw,
    accentClass: 'hover:border-amber-400/70 hover:bg-amber-500/10',
    iconBgClass: 'bg-amber-500/15 text-amber-300',
  },
  {
    action: 'shutdown',
    label: 'Shutdown',
    description: 'Matikan perangkat Android TV Box',
    icon: Power,
    accentClass: 'hover:border-rose-400/70 hover:bg-rose-500/10',
    iconBgClass: 'bg-rose-500/15 text-rose-300',
  },
];

export const PowerMenuModal: React.FC<PowerMenuModalProps> = ({
  isOpen,
  soundNav,
  dpadSpeed = 'normal',
  onAction,
  onClose,
}) => {
  useDpadNavigation({
    scopeSelector: '#power-menu-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  return (
    <div
      id="power-menu-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Power Menu"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex w-full max-w-3xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
              Power Menu
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Pilih tindakan daya perangkat menggunakan tombol panah dan OK pada remote
            </p>
          </div>
          <button
            type="button"
            data-focusable="true"
            data-dpad-row="power-header"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-4 w-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Power Actions Grid */}
        <div className="grid gap-4 px-6 py-7 sm:grid-cols-3">
          {POWER_OPTIONS.map((option, idx) => {
            const Icon = option.icon;
            return (
              <button
                key={option.action}
                type="button"
                data-focusable="true"
                data-dpad-row="power-actions"
                data-dpad-default={idx === 0 ? 'true' : undefined}
                onClick={() => onAction(option.action)}
                className={`flex flex-col items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-800/85 px-5 py-7 text-center transition-colors ${option.accentClass}`}
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${option.iconBgClass}`}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-lg font-semibold tracking-tight text-white">
                    {option.label}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
          <span className="text-xs text-slate-400">
            Panah Kiri/Kanan Pilih · OK Konfirmasi · Back/Esc Batal
          </span>
          <button
            type="button"
            data-focusable="true"
            data-dpad-row="power-footer"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DpadSpeed } from '../types/launcher';

interface KidsUnlockModalProps {
  isOpen: boolean;
  expectedPin: string;
  soundNav: boolean;
  dpadSpeed: DpadSpeed;
  title?: string;
  subtitle?: string;
  onUnlock: () => void;
  onClose: () => void;
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export const KidsUnlockModal: React.FC<KidsUnlockModalProps> = ({
  isOpen,
  expectedPin,
  soundNav,
  dpadSpeed,
  title = 'Keluar Mode Anak',
  subtitle = 'Masukkan 4 digit PIN orang tua untuk membuka kunci antarmuka TV.',
  onUnlock,
  onClose,
}) => {
  const [entered, setEntered] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  useEffect(() => {
    if (isOpen) {
      setEntered('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  useDpadNavigation({
    scopeSelector: '#kids-unlock-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const handleDigit = useCallback(
    (digit: string) => {
      setErrorMsg(null);
      setEntered((prev) => {
        if (prev.length >= 4) return prev;
        const next = `${prev}${digit}`;
        if (next.length === 4) {
          const validPin = /^\d{4}$/.test(expectedPin) ? expectedPin : '1234';
          if (next === validPin) {
            window.setTimeout(() => {
              onUnlock();
            }, 90);
          } else {
            window.setTimeout(() => {
              setErrorMsg('PIN salah · Silakan coba lagi');
              setEntered('');
            }, 160);
          }
        }
        return next;
      });
    },
    [expectedPin, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    setErrorMsg(null);
    setEntered((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleDigit, handleBackspace]);

  if (!shouldRender) return null;

  return (
    <div
      id="kids-unlock-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`tv-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 backdrop-blur-md ${
        isVisible ? 'is-open' : ''
      }`}
    >
      <div className="tv-modal-panel w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/35 bg-sky-500/15 text-sky-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            data-focusable="true"
            onClick={onClose}
            aria-label="Tutup dialog PIN"
            className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-Digit PIN Slots */}
        <div className="my-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3" aria-label={`PIN dimasukkan ${entered.length} dari 4 digit`}>
            {[0, 1, 2, 3].map((slot) => {
              const filled = slot < entered.length;
              return (
                <div
                  key={slot}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-bold transition-colors ${
                    errorMsg
                      ? 'border-rose-400/70 bg-rose-500/15 text-rose-200'
                      : filled
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-slate-700 bg-slate-800/80 text-slate-500'
                  }`}
                >
                  {filled ? '•' : ''}
                </div>
              );
            })}
          </div>
          <div className="min-h-[1.25rem] text-xs font-medium">
            {errorMsg ? (
              <span className="text-rose-300">{errorMsg}</span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Gunakan D-pad OK atau tombol angka 0–9</span>
              </span>
            )}
          </div>
        </div>

        {/* D-Pad Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {KEYPAD_ROWS.flat().map((digit, idx) => (
            <button
              key={digit}
              type="button"
              data-focusable="true"
              data-dpad-default={idx === 0 ? 'true' : undefined}
              onClick={() => handleDigit(digit)}
              className="font-mono-tabular flex h-13 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/90 text-xl font-semibold text-white hover:bg-slate-700"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            data-focusable="true"
            onClick={handleBackspace}
            className="flex h-13 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <Delete className="h-4 w-4" />
            <span>Hapus</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={() => handleDigit('0')}
            className="font-mono-tabular flex h-13 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/90 text-xl font-semibold text-white hover:bg-slate-700"
          >
            0
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={onClose}
            className="flex h-13 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/70 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

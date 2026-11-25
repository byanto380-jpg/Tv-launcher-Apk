import React from 'react';
import { AlertTriangle, Bot, Radio, RefreshCw, X } from 'lucide-react';
import type { EmergencyBroadcast } from '../types/launcher';

interface EmergencyBroadcastTickerProps {
  visible: boolean;
  cityName: string;
  warningTitle: string;
  broadcast: EmergencyBroadcast | null;
  loading: boolean;
  error: string | null;
  isSimulated?: boolean;
  onRetry: () => void;
  onOpenAssistant: () => void;
  onDismiss: () => void;
}

export const EmergencyBroadcastTicker: React.FC<EmergencyBroadcastTickerProps> = ({
  visible,
  cityName,
  warningTitle,
  broadcast,
  loading,
  error,
  isSimulated = false,
  onRetry,
  onOpenAssistant,
  onDismiss,
}) => {
  if (!visible) return null;

  const headline = broadcast?.headline || warningTitle;
  const fullRunningMessage = broadcast
    ? `${headline} (${broadcast.cityName || cityName}) — ${broadcast.tickerText}${
        broadcast.advice ? ` · Saran Keselamatan: ${broadcast.advice}` : ''
      }`
    : '';

  return (
    <aside
      role="alert"
      aria-live="assertive"
      aria-label="Pesan Siaran Darurat Cuaca Ekstrem dari Asisten AI"
      className="tv-broadcast-bar fixed inset-x-0 bottom-0 z-40 border-t-2 border-rose-500/90 bg-gradient-to-r from-[#280710]/95 via-[#180912]/96 to-[#280710]/95 px-4 py-2 text-rose-50 shadow-[0_-12px_36px_rgba(225,29,72,0.34)] backdrop-blur-md md:px-8"
    >
      <div className="mx-auto flex max-w-[1920px] items-center gap-3">
        {/* Emergency AI Broadcast Badge */}
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-rose-400/60 bg-rose-600/30 px-2.5 py-1 text-xs font-bold tracking-wider text-rose-100 uppercase">
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
          </span>
          <Radio className="h-3.5 w-3.5 text-rose-300" />
          <span>Pesan Siaran AI</span>
          {isSimulated && (
            <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
              Simulasi
            </span>
          )}
        </div>

        {/* Running Text Area */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {loading && !broadcast ? (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-200 md:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="truncate">
                Asisten AI sedang menyusun Pesan Siaran darurat cuaca ekstrem untuk {cityName}…
              </span>
            </div>
          ) : error && !broadcast ? (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-200 md:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-300" />
              <span className="truncate">
                {warningTitle} ({cityName}) — {error}
              </span>
            </div>
          ) : broadcast ? (
            <div className="relative overflow-hidden py-0.5">
              <div className="tv-broadcast-track text-sm font-medium tracking-wide text-rose-50 md:text-base">
                <span className="inline-flex items-center gap-3 pr-14 whitespace-nowrap">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>{fullRunningMessage}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-3 pr-14 whitespace-nowrap"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>{fullRunningMessage}</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* D-Pad Focusable Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-focusable="true"
            data-dpad-row="broadcast"
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/35 whitespace-nowrap"
          >
            <Bot className="h-3.5 w-3.5 text-amber-300" />
            <span>Tanya AI</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            data-dpad-row="broadcast"
            aria-label="Perbarui pesan siaran AI"
            onClick={onRetry}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-rose-400/40 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-rose-100 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{error ? 'Coba Lagi' : 'Perbarui'}</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            data-dpad-row="broadcast"
            aria-label="Tutup pesan siaran darurat"
            onClick={onDismiss}
            className="flex items-center gap-1 rounded-lg border border-rose-400/40 bg-slate-900/70 px-2.5 py-1.5 text-xs font-medium text-rose-100 hover:bg-slate-800 whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" />
            <span>Tutup</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

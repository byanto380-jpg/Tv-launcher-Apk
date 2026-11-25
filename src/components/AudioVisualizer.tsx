import React, { useEffect, useRef, useState } from 'react';
import {
  sampleAudioVisualizerBands,
  subscribeAudioVisualizer,
  type AudioVisualizerSnapshot,
} from '../services/launcherApis';

interface AudioVisualizerProps {
  accentClass?: string;
}

const BAR_COUNT = 5;
const REDUCED_ACTIVE_LEVELS = [0.45, 0.82, 1, 0.72, 0.52];

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  accentClass = 'bg-sky-400',
}) => {
  const [snapshot, setSnapshot] = useState<AudioVisualizerSnapshot>({
    kind: 'idle',
    active: false,
  });
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    return subscribeAudioVisualizer(setSnapshot);
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const applyLevels = (levels: number[]) => {
      for (let i = 0; i < BAR_COUNT; i++) {
        const el = barRefs.current[i];
        if (!el) continue;
        const scale = levels[i] ?? 0.16;
        el.style.transform = `scaleY(${scale.toFixed(3)})`;
      }
    };

    if (!snapshot.active) {
      applyLevels(Array.from({ length: BAR_COUNT }, () => 0.16));
      return;
    }

    if (prefersReduced) {
      applyLevels(REDUCED_ACTIVE_LEVELS);
      return;
    }

    let rafId = 0;
    const tick = () => {
      applyLevels(sampleAudioVisualizerBands(BAR_COUNT));
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [snapshot.active, snapshot.kind]);

  const statusLabel =
    snapshot.kind === 'adzan'
      ? 'Adzan'
      : snapshot.kind === 'nav'
      ? 'Nav'
      : '';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        snapshot.kind === 'adzan'
          ? 'Audio Adzan sedang diputar'
          : snapshot.kind === 'nav'
          ? 'Suara navigasi remote aktif'
          : 'Indikator audio siaga'
      }
      className="flex shrink-0 items-center gap-2"
    >
      {statusLabel && (
        <span
          className={`text-[11px] font-medium tracking-wide ${
            snapshot.kind === 'adzan' ? 'text-emerald-300' : 'text-slate-300'
          }`}
        >
          {statusLabel}
        </span>
      )}
      <div
        aria-hidden="true"
        className="flex h-4 items-end gap-[3px]"
      >
        {Array.from({ length: BAR_COUNT }).map((_, idx) => (
          <span
            key={idx}
            ref={(el) => {
              barRefs.current[idx] = el;
            }}
            style={{ transform: 'scaleY(0.16)', transformOrigin: 'bottom' }}
            className={`w-[3px] h-full rounded-[2px] will-change-transform transition-opacity duration-150 ${
              snapshot.kind === 'adzan'
                ? 'bg-emerald-400 opacity-100'
                : snapshot.kind === 'nav'
                ? `${accentClass} opacity-95`
                : 'bg-slate-500 opacity-35'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

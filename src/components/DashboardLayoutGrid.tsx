import React, { useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CloudSun,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  MoveHorizontal,
  RotateCcw,
  Tv,
} from 'lucide-react';
import { DEFAULT_DASHBOARD_CARDS, playNavTick } from '../services/launcherApis';
import type { DashboardCardConfig, DashboardCardId } from '../types/launcher';

interface DashboardLayoutGridProps {
  cards: DashboardCardConfig[];
  soundNav: boolean;
  onChange: (next: DashboardCardConfig[]) => void;
  onToast?: (msg: string) => void;
}

const CARD_META: Record<
  DashboardCardId,
  {
    title: string;
    subtitle: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  prayer: {
    title: 'Sholat',
    subtitle: 'Jadwal sholat, Hijriyah, Adzan & Auto-Silent',
    Icon: Calendar,
  },
  schedule: {
    title: 'Jadwal',
    subtitle: 'Jadwal pertandingan bola & acara TV nasional',
    Icon: Tv,
  },
  weather: {
    title: 'Cuaca',
    subtitle: 'Prakiraan 5 hari & peringatan cuaca ekstrem',
    Icon: CloudSun,
  },
};

function moveCard(
  list: DashboardCardConfig[],
  fromIndex: number,
  toIndex: number
): DashboardCardConfig[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export const DashboardLayoutGrid: React.FC<DashboardLayoutGridProps> = ({
  cards,
  soundNav,
  onChange,
  onToast,
}) => {
  const [grabbedId, setGrabbedId] = useState<DashboardCardId | null>(null);
  const [draggedId, setDraggedId] = useState<DashboardCardId | null>(null);
  const [dragOverId, setDragOverId] = useState<DashboardCardId | null>(null);
  const grabBtnRefs = useRef<Partial<Record<DashboardCardId, HTMLButtonElement | null>>>({});

  // Re-focus grabbed card's handle button after React reorders the grid
  useEffect(() => {
    if (!grabbedId) return;
    const targetBtn = grabBtnRefs.current[grabbedId];
    if (targetBtn && document.activeElement !== targetBtn) {
      targetBtn.focus({ preventScroll: true });
    }
  }, [cards, grabbedId]);

  // Capture-phase D-pad handler while a card is grabbed so Arrow keys reorder directly
  useEffect(() => {
    if (!grabbedId) return;

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      const idx = cards.findIndex((c) => c.id === grabbedId);
      if (idx === -1) {
        setGrabbedId(null);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (idx > 0) {
          onChange(moveCard(cards, idx, idx - 1));
          if (soundNav) playNavTick();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (idx < cards.length - 1) {
          onChange(moveCard(cards, idx, idx + 1));
          if (soundNav) playNavTick();
        }
        return;
      }

      if (
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'BrowserBack'
      ) {
        e.preventDefault();
        e.stopPropagation();
        setGrabbedId(null);
        if (soundNav) playNavTick();
        onToast?.(`Posisi kartu ${CARD_META[grabbedId].title} disimpan ke urutan ${idx + 1}`);
      }
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => window.removeEventListener('keydown', handleKeyDownCapture, true);
  }, [grabbedId, cards, soundNav, onChange, onToast]);

  const isDefaultLayout =
    cards.length === 3 &&
    cards[0]?.id === 'prayer' &&
    cards[1]?.id === 'schedule' &&
    cards[2]?.id === 'weather' &&
    cards.every((c) => c.visible);

  const visibleCount = cards.filter((c) => c.visible).length;

  return (
    <section className="space-y-3 border-b border-slate-800/80 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <LayoutGrid className="h-4 w-4 text-sky-400" />
            <span>Tata Letak &amp; Urutan Kartu Dashboard (Layar Utama)</span>
          </label>
          <p className="mt-0.5 text-xs text-slate-400">
            {grabbedId
              ? `Mode Geser aktif untuk ${CARD_META[grabbedId].title}: tekan panah Kiri/Kanan untuk memindah posisi, lalu OK untuk meletakkan.`
              : `Tekan OK pada "Geser Posisi" lalu panah Kiri/Kanan untuk menukar posisi dengan D-pad, atau seret kartu langsung. (${visibleCount}/3 tampil)`}
          </p>
        </div>

        <button
          type="button"
          data-focusable="true"
          onClick={() => {
            setGrabbedId(null);
            onChange(DEFAULT_DASHBOARD_CARDS.map((c) => ({ ...c })));
            onToast?.('Urutan kartu dikembalikan ke bawaan (Sholat · Jadwal · Cuaca)');
          }}
          disabled={isDefaultLayout}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 text-sky-300" />
          <span>Reset Urutan</span>
        </button>
      </div>

      <MotionConfig reducedMotion="user">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((card, index) => {
            const meta = CARD_META[card.id];
            const Icon = meta.Icon;
            const isGrabbed = grabbedId === card.id;
            const isDragged = draggedId === card.id;
            const isDragOver = dragOverId === card.id && draggedId !== card.id;

            return (
              <motion.div
                key={card.id}
                layout
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    setGrabbedId(null);
                    setDraggedId(card.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', card.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedId && draggedId !== card.id) {
                      setDragOverId(card.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverId === card.id) {
                      setDragOverId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = cards.findIndex((c) => c.id === draggedId);
                    if (fromIdx !== -1 && fromIdx !== index) {
                      onChange(moveCard(cards, fromIdx, index));
                      onToast?.(`Kartu ${CARD_META[cards[fromIdx].id].title} dipindah ke posisi ${index + 1}`);
                    }
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  className={`flex h-full flex-col justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                    isGrabbed
                      ? 'border-sky-400 bg-sky-500/15 shadow-lg ring-2 ring-sky-400/35'
                      : isDragOver
                      ? 'border-emerald-400 bg-emerald-500/12'
                      : !card.visible
                      ? 'border-dashed border-slate-700/80 bg-slate-900/50 opacity-65'
                      : 'border-slate-700/80 bg-slate-800/70'
                  } ${isDragged ? 'opacity-50' : ''}`}
                >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          card.visible ? 'text-sky-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate text-sm font-semibold text-slate-100">
                        0{index + 1}. {meta.title}
                      </span>
                    </div>
                    <GripVertical
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 cursor-grab text-slate-500"
                    />
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {meta.subtitle}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="font-mono-tabular text-slate-400">Kolom {index + 1}</span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className={card.visible ? 'text-emerald-300' : 'text-amber-300'}>
                      {card.visible ? 'Tampil' : 'Disembunyikan'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    ref={(el) => {
                      grabBtnRefs.current[card.id] = el;
                    }}
                    type="button"
                    data-focusable="true"
                    aria-pressed={isGrabbed}
                    onClick={() => {
                      if (isGrabbed) {
                        setGrabbedId(null);
                        onToast?.(`Posisi kartu ${meta.title} ditetapkan`);
                      } else {
                        setGrabbedId(card.id);
                      }
                    }}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                      isGrabbed
                        ? 'border-sky-300 bg-sky-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {isGrabbed ? (
                      <>
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Geser · OK Lepas</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <MoveHorizontal className="h-3.5 w-3.5 text-sky-300" />
                        <span>Geser Posisi</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() => {
                      setGrabbedId(null);
                      const next = cards.map((c) =>
                        c.id === card.id ? { ...c, visible: !c.visible } : c
                      );
                      onChange(next);
                      onToast?.(
                        card.visible
                          ? `Kartu ${meta.title} akan disembunyikan`
                          : `Kartu ${meta.title} akan ditampilkan`
                      );
                    }}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                      card.visible
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {card.visible ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Tampil</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Sembunyikan</span>
                      </>
                    )}
                  </button>
                </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </MotionConfig>
    </section>
  );
};

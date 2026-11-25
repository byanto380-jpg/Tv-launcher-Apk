import React from 'react';
import { Calendar, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DailyPrayerEntry, DpadSpeed, HijriDateInfo } from '../types/launcher';
import { WeeklyPrayerChart, type PrayerChartFilter } from './WeeklyPrayerChart';

interface WeeklyPrayerModalProps {
  isOpen: boolean;
  cityName: string;
  hijriDate: HijriDateInfo | null;
  weekly: DailyPrayerEntry[];
  filter: PrayerChartFilter;
  soundNav: boolean;
  dpadSpeed?: DpadSpeed;
  onFilterChange: (next: PrayerChartFilter) => void;
  onClose: () => void;
}

export const WeeklyPrayerModal: React.FC<WeeklyPrayerModalProps> = ({
  isOpen,
  cityName,
  hijriDate,
  weekly,
  filter,
  soundNav,
  dpadSpeed = 'normal',
  onFilterChange,
  onClose,
}) => {
  useDpadNavigation({
    scopeSelector: '#weekly-prayer-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  return (
    <div
      id="weekly-prayer-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Grafik Jadwal Sholat Mingguan"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
              Tren Jadwal Sholat 7 Hari ke Depan
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span>{cityName}</span>
              {hijriDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <Calendar className="h-3.5 w-3.5" />
                    {hijriDate.formatted}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            data-focusable="true"
            data-dpad-default="true"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-4 w-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Chart + 7-Day Table */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <WeeklyPrayerChart
            weekly={weekly}
            filter={filter}
            onFilterChange={onFilterChange}
            height={300}
            dpadRow="modal-chart"
          />

          {weekly.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Kalender Hijriyah</th>
                    <th className="px-3 py-3 font-medium text-right">Subuh</th>
                    <th className="px-3 py-3 font-medium text-right">Dzuhur</th>
                    <th className="px-3 py-3 font-medium text-right">Ashar</th>
                    <th className="px-3 py-3 font-medium text-right">Maghrib</th>
                    <th className="px-3 py-3 font-medium text-right">Isya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono-tabular">
                  {weekly.map((day, i) => (
                    <tr
                      key={day.dateKey}
                      className={i === 0 ? 'bg-emerald-950/35 text-emerald-100' : 'text-slate-200'}
                    >
                      <td className="px-4 py-2.5 font-sans font-medium">{day.fullDateLabel}</td>
                      <td className="px-4 py-2.5 font-sans text-xs text-sky-300">
                        {day.hijriLabel || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right">{day.timings.Fajr?.slice(0, 5)}</td>
                      <td className="px-3 py-2.5 text-right">{day.timings.Dhuhr?.slice(0, 5)}</td>
                      <td className="px-3 py-2.5 text-right">{day.timings.Asr?.slice(0, 5)}</td>
                      <td className="px-3 py-2.5 text-right">{day.timings.Maghrib?.slice(0, 5)}</td>
                      <td className="px-3 py-2.5 text-right">{day.timings.Isha?.slice(0, 5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

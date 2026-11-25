import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PRAYER_KEYS, PRAYER_LABELS } from '../services/launcherApis';
import type { DailyPrayerEntry } from '../types/launcher';

export type PrayerChartFilter = 'ALL' | 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

const PRAYER_COLORS: Record<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha', string> = {
  Fajr: '#38bdf8',
  Dhuhr: '#fbbf24',
  Asr: '#fb923c',
  Maghrib: '#34d399',
  Isha: '#818cf8',
};

function toMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.slice(0, 5);
  const [h, m] = clean.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function formatMinutes(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60) % 24;
  const m = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface ChartDatum {
  dayLabel: string;
  fullDateLabel: string;
  hijriLabel: string;
  Fajr: number;
  Dhuhr: number;
  Asr: number;
  Maghrib: number;
  Isha: number;
  FajrText: string;
  DhuhrText: string;
  AsrText: string;
  MaghribText: string;
  IshaText: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    color?: string;
    value?: number;
    payload?: ChartDatum;
  }>;
  filter: PrayerChartFilter;
}

const PrayerChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, filter }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3.5 py-2.5 text-xs text-slate-100 shadow-xl">
      <div className="font-semibold text-white">{row.fullDateLabel}</div>
      {row.hijriLabel && (
        <div className="mb-1.5 text-[11px] text-sky-300">{row.hijriLabel}</div>
      )}
      <div className="space-y-1">
        {filter === 'ALL' ? (
          PRAYER_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="inline-block h-2 w-2 rounded-xs"
                  style={{ backgroundColor: PRAYER_COLORS[k] }}
                />
                {PRAYER_LABELS[k]}
              </span>
              <span className="font-mono-tabular font-medium text-white">
                {row[`${k}Text`]}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">{PRAYER_LABELS[filter]}</span>
            <span className="font-mono-tabular text-sm font-semibold text-white">
              {row[`${filter}Text`]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface WeeklyPrayerChartProps {
  weekly: DailyPrayerEntry[];
  filter: PrayerChartFilter;
  onFilterChange: (next: PrayerChartFilter) => void;
  height?: number;
  compact?: boolean;
  dpadRow?: string;
}

export const WeeklyPrayerChart: React.FC<WeeklyPrayerChartProps> = ({
  weekly,
  filter,
  onFilterChange,
  height = 190,
  compact = false,
  dpadRow = 'cards',
}) => {
  const data = useMemo<ChartDatum[]>(() => {
    return weekly.map((entry) => ({
      dayLabel: entry.dayLabel,
      fullDateLabel: entry.fullDateLabel,
      hijriLabel: entry.hijriLabel,
      Fajr: toMinutes(entry.timings.Fajr),
      Dhuhr: toMinutes(entry.timings.Dhuhr),
      Asr: toMinutes(entry.timings.Asr),
      Maghrib: toMinutes(entry.timings.Maghrib),
      Isha: toMinutes(entry.timings.Isha),
      FajrText: entry.timings.Fajr?.slice(0, 5) || '--:--',
      DhuhrText: entry.timings.Dhuhr?.slice(0, 5) || '--:--',
      AsrText: entry.timings.Asr?.slice(0, 5) || '--:--',
      MaghribText: entry.timings.Maghrib?.slice(0, 5) || '--:--',
      IshaText: entry.timings.Isha?.slice(0, 5) || '--:--',
    }));
  }, [weekly]);

  const yDomain = useMemo<[number, number]>(() => {
    if (filter === 'ALL' || data.length === 0) return [0, 1440];
    const values = data.map((d) => d[filter]).filter((v) => v > 0);
    if (values.length === 0) return [0, 1440];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(4, Math.ceil((max - min) * 0.45));
    return [Math.max(0, min - padding), Math.min(1440, max + padding)];
  }, [data, filter]);

  const trendSummary = useMemo(() => {
    if (filter === 'ALL' || data.length < 2) return null;
    const first = data[0][filter];
    const last = data[data.length - 1][filter];
    const min = Math.min(...data.map((d) => d[filter]));
    const max = Math.max(...data.map((d) => d[filter]));
    const diff = last - first;
    const diffStr =
      diff === 0 ? 'stabil' : diff > 0 ? `+${diff} mnt` : `${diff} mnt`;
    return `${PRAYER_LABELS[filter]}: ${formatMinutes(min)} – ${formatMinutes(max)} (${diffStr})`;
  }, [data, filter]);

  const filterButtons: { key: PrayerChartFilter; label: string }[] = [
    { key: 'Fajr', label: 'Subuh' },
    { key: 'Dhuhr', label: 'Dzuhur' },
    { key: 'Asr', label: 'Ashar' },
    { key: 'Maghrib', label: 'Maghrib' },
    { key: 'Isha', label: 'Isya' },
    { key: 'ALL', label: 'Semua' },
  ];

  if (data.length === 0) {
    return (
      <div className="py-6 text-sm text-slate-400">
        Data grafik sholat mingguan belum tersedia. Periksa koneksi internet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filterButtons.map((btn) => {
          const active = filter === btn.key;
          return (
            <button
              key={btn.key}
              type="button"
              data-focusable="true"
              data-dpad-row={dpadRow}
              onClick={() => onFilterChange(btn.key)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                  : 'border-slate-700/80 bg-slate-800/75 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {trendSummary && (
        <div className="font-mono-tabular text-xs text-slate-300">
          {trendSummary}
        </div>
      )}

      {/* Recharts BarChart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 6, left: compact ? -14 : -4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: '#cbd5e1', fontSize: compact ? 11 : 13 }}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.25)' }}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={formatMinutes}
              tick={{ fill: '#94a3b8', fontSize: compact ? 10 : 12 }}
              axisLine={false}
              tickLine={false}
              width={compact ? 48 : 54}
            />
            <Tooltip
              cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }}
              content={<PrayerChartTooltip filter={filter} />}
            />
            {filter === 'ALL' ? (
              PRAYER_KEYS.map((k) => (
                <Bar
                  key={k}
                  dataKey={k}
                  name={PRAYER_LABELS[k]}
                  fill={PRAYER_COLORS[k]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar
                dataKey={filter}
                name={PRAYER_LABELS[filter]}
                fill={PRAYER_COLORS[filter]}
                radius={[6, 6, 0, 0]}
                maxBarSize={compact ? 32 : 48}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

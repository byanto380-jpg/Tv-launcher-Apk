import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Newspaper } from 'lucide-react';
import { fetchTrendingHeadlines } from '../services/launcherApis';
import type { NewsCategory, NewsHeadline } from '../types/launcher';

interface NewsTickerProps {
  onSelectHeadline?: (headline: NewsHeadline) => void;
  cardClass?: string;
  accentTextClass?: string;
}

export const NewsTicker: React.FC<NewsTickerProps> = ({
  onSelectHeadline,
  cardClass = 'border-slate-700/50 bg-slate-900/85',
  accentTextClass = 'text-sky-300',
}) => {
  const [category, setCategory] = useState<NewsCategory>('tech');
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const loadHeadlines = useCallback(async (cat: NewsCategory) => {
    setLoading(true);
    const list = await fetchTrendingHeadlines(cat);
    setHeadlines(list);
    setActiveIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHeadlines(category);
    const refreshTimer = window.setInterval(() => loadHeadlines(category), 15 * 60 * 1000);
    return () => window.clearInterval(refreshTimer);
  }, [category, loadHeadlines]);

  useEffect(() => {
    if (paused || headlines.length <= 1) return;
    const cycleTimer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % headlines.length);
    }, 6000);
    return () => window.clearInterval(cycleTimer);
  }, [paused, headlines.length]);

  const current = headlines[activeIndex] || null;

  const handleToggleCategory = () => {
    setCategory((prev) => (prev === 'tech' ? 'sports' : 'tech'));
  };

  const handleNext = () => {
    if (headlines.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % headlines.length);
  };

  return (
    <div
      aria-label="News Ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 backdrop-blur-sm transition-colors duration-700 ${cardClass}`}
    >
      {/* Category switcher */}
      <button
        type="button"
        data-focusable="true"
        data-dpad-row="ticker"
        onClick={handleToggleCategory}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-2.5 py-1 text-xs font-semibold hover:bg-slate-800 whitespace-nowrap ${accentTextClass}`}
      >
        <Newspaper className="h-3.5 w-3.5 shrink-0" />
        <span>{category === 'tech' ? 'Teknologi' : 'Olahraga'}</span>
      </button>

      {/* Active headline */}
      <div className="min-w-0 flex-1">
        {loading && headlines.length === 0 ? (
          <div className="h-4 w-64 animate-pulse rounded bg-slate-800" />
        ) : !current ? (
          <span className="text-xs text-slate-400">
            Berita trending belum tersedia. Periksa koneksi internet.
          </span>
        ) : (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            data-focusable="true"
            data-dpad-row="ticker"
            onClick={(e) => {
              if (onSelectHeadline) {
                e.preventDefault();
                onSelectHeadline(current);
              }
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-0.5 text-left text-xs text-slate-100 hover:text-sky-200 md:text-sm"
          >
            <span className="truncate font-medium">{current.title}</span>
            <span className="shrink-0 text-slate-400">· {current.source}</span>
          </a>
        )}
      </div>

      {/* Counter & Next Headline button */}
      {headlines.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono-tabular text-xs text-slate-400">
            {activeIndex + 1}/{headlines.length}
          </span>
          <button
            type="button"
            data-focusable="true"
            data-dpad-row="ticker"
            aria-label="Berita berikutnya"
            onClick={handleNext}
            className="flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/90 p-1 text-slate-300 hover:bg-slate-700"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

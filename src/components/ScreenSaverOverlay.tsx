import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useModalTransition } from '../hooks/useModalTransition';
import { fetchScreenSaverPhotos } from '../services/launcherApis';
import type { ScreenSaverPhoto } from '../types/launcher';

interface ScreenSaverOverlayProps {
  isOpen: boolean;
  clock: string;
  dateLabel: string;
  cityName: string;
  temperatureLabel?: string;
  onDismiss: () => void;
}

const SLIDE_INTERVAL_MS = 12000;

export const ScreenSaverOverlay: React.FC<ScreenSaverOverlayProps> = ({
  isOpen,
  clock,
  dateLabel,
  cityName,
  temperatureLabel,
  onDismiss,
}) => {
  const [photos, setPhotos] = useState<ScreenSaverPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});

  const { shouldRender, isVisible } = useModalTransition(isOpen, 300);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setFailedUrls({});
    setLoadedUrl(null);
    fetchScreenSaverPhotos().then((list) => {
      if (cancelled) return;
      setPhotos(list);
      setActiveIndex(0);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const validPhotos = photos.filter((p) => !failedUrls[p.imageUrl]);
  const safeIndex = validPhotos.length > 0 ? activeIndex % validPhotos.length : 0;
  const currentPhoto = validPhotos[safeIndex] || null;
  const nextPhoto =
    validPhotos.length > 1 ? validPhotos[(safeIndex + 1) % validPhotos.length] : null;

  // Cycle slides automatically every 12 seconds
  useEffect(() => {
    if (!isOpen || validPhotos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validPhotos.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isOpen, validPhotos.length]);

  // Preload the next slide quietly in the background
  useEffect(() => {
    if (!isOpen || !nextPhoto) return;
    const img = new window.Image();
    img.referrerPolicy = 'no-referrer';
    img.src = nextPhoto.imageUrl;
  }, [isOpen, nextPhoto]);

  if (!shouldRender) return null;

  const isCurrentLoaded = Boolean(currentPhoto && loadedUrl === currentPhoto.imageUrl);

  return (
    <div
      id="tv-screensaver"
      role="dialog"
      aria-modal="true"
      aria-label="Screen Saver Galeri Pemandangan"
      onClick={onDismiss}
      className={`fixed inset-0 z-[55] cursor-none select-none overflow-hidden bg-[#050505] transition-opacity duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {/* Ambient fallback canvas when loading or offline */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(30,58,138,0.28),#050505_68%)]"
      />

      {!currentPhoto && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500"
        >
          <ImageIcon className="h-10 w-10 opacity-40" />
          <span className="text-sm text-slate-400">
            {loading ? 'Memuat galeri foto pemandangan…' : 'Mode Screen Saver Ambient'}
          </span>
        </div>
      )}

      {/* Active Scenic Photo */}
      {currentPhoto && (
        <img
          key={currentPhoto.id}
          src={currentPhoto.imageUrl}
          alt={currentPhoto.title}
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedUrl(currentPhoto.imageUrl)}
          onError={() => {
            setFailedUrls((prev) => ({ ...prev, [currentPhoto.imageUrl]: true }));
          }}
          className={`tv-ken-burns absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            isCurrentLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Measured contrast scrim for 4.5:1+ legibility across all photo frames */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20"
      />

      {/* Minimalist Ambient Footer Overlay */}
      <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          {/* Bottom-Left: Tabular Clock & Date / Weather */}
          <div>
            <div className="font-mono-tabular text-6xl font-light tracking-tight text-white md:text-8xl md:leading-none">
              {clock}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 text-sm font-medium text-slate-200 md:text-base">
              <span>{dateLabel}</span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span>{cityName}</span>
              {temperatureLabel && (
                <>
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono-tabular text-slate-100">{temperatureLabel}</span>
                </>
              )}
            </p>
          </div>

          {/* Bottom-Right: Photo Credit & Quiet Exit Prompt (Zero Pills) */}
          <div className="max-w-md text-left md:text-right">
            {currentPhoto && (
              <>
                <p className="truncate text-sm font-medium text-slate-100 md:text-base">
                  {currentPhoto.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-300 md:justify-end">
                  {currentPhoto.photographer && (
                    <>
                      <span className="truncate max-w-[220px]">{currentPhoto.photographer}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>{currentPhoto.source}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-slate-300">
                    {safeIndex + 1}/{validPhotos.length}
                  </span>
                </p>
              </>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Tekan tombol remote mana saja atau gerakkan kursor untuk kembali
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

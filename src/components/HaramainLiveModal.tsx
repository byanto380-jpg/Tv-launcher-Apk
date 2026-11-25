import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertTriangle,
  Columns2,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import {
  HARAMAIN_STREAMS,
  PRAYER_KEYS,
  PRAYER_LABELS,
  fetchHaramainPrayerTimes,
  getTimeParts,
} from '../services/launcherApis';
import type {
  DpadSpeed,
  HaramainChannelStream,
  HaramainCityId,
  PrayerTimings,
} from '../types/launcher';

type StreamSourceMode = 'hls' | 'youtube';

interface StreamPlayerPaneProps {
  stream: HaramainChannelStream;
  sourceMode: StreamSourceMode;
  muted: boolean;
  reloadSeed: number;
  compactLabel?: boolean;
  onHlsFallbackRequested?: () => void;
}

const StreamPlayerPane: React.FC<StreamPlayerPaneProps> = ({
  stream,
  sourceMode,
  muted,
  reloadSeed,
  compactLabel = false,
  onHlsFallbackRequested,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [buffering, setBuffering] = useState(true);
  const [hlsError, setHlsError] = useState<string | null>(null);

  useEffect(() => {
    if (sourceMode !== 'hls') {
      setBuffering(false);
      setHlsError(null);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    setBuffering(true);
    setHlsError(null);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hls.loadSource(stream.hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        video.play().catch(() => {
          // Autoplay with audio may be paused by browser policy until unmuted/clicked
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError();
        } else {
          setHlsError('Gagal memutar aliran HLS di browser ini.');
          setBuffering(false);
          hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = stream.hlsUrl;
      video.play().catch(() => {
        // Ignore strict autoplay block
      });
    } else {
      setHlsError('Peramban tidak mendukung pemutaran HLS langsung.');
      setBuffering(false);
    }

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
      } else if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [stream.hlsUrl, sourceMode, reloadSeed]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
    }
  }, [muted]);

  const ytSrc = `${stream.youtubeEmbedUrl}&mute=${muted ? '1' : '0'}`;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-black">
      {sourceMode === 'hls' ? (
        <>
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={muted}
            onPlaying={() => {
              setBuffering(false);
              setHlsError(null);
            }}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onError={() => {
              setHlsError('Koneksi siaran langsung terganggu.');
              setBuffering(false);
            }}
            className="h-full w-full bg-black object-contain"
          />

          {buffering && !hlsError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-[2px]">
              <RefreshCw className="h-7 w-7 animate-spin text-emerald-300" />
              <span className="text-xs font-medium text-slate-200 md:text-sm">
                Menghubungkan siaran langsung {stream.mosque}…
              </span>
            </div>
          )}

          {hlsError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 px-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{hlsError}</p>
                <p className="text-xs text-slate-400">
                  Anda dapat beralih ke pemutar YouTube Resmi {stream.channelName}.
                </p>
              </div>
              {onHlsFallbackRequested && (
                <button
                  type="button"
                  data-focusable="true"
                  onClick={onHlsFallbackRequested}
                  className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
                >
                  Putar via YouTube Live Resmi
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <iframe
          key={`${stream.id}-${muted}-${reloadSeed}`}
          src={ytSrc}
          title={`${stream.mosque} — ${stream.channelName}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0 bg-black"
        />
      )}

      {/* Subtle Corner Broadcast Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              LIVE 24/7
            </span>
            <span className="truncate text-xs font-semibold text-emerald-300 md:text-sm">
              {stream.mosque}
            </span>
          </div>
          {!compactLabel && (
            <p className="mt-0.5 truncate text-xs text-slate-300">
              {stream.channelName} · {stream.arabicTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface HaramainLiveModalProps {
  isOpen: boolean;
  initialCity?: HaramainCityId;
  soundNav: boolean;
  dpadSpeed: DpadSpeed;
  onClose: () => void;
  onToast: (message: string) => void;
}

export const HaramainLiveModal: React.FC<HaramainLiveModalProps> = ({
  isOpen,
  initialCity = 'makkah',
  soundNav,
  dpadSpeed,
  onClose,
  onToast,
}) => {
  const [activeCity, setActiveCity] = useState<HaramainCityId>(initialCity);
  const [splitView, setSplitView] = useState(false);
  const [sourceMode, setSourceMode] = useState<StreamSourceMode>('hls');
  const [muted, setMuted] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saudiNow, setSaudiNow] = useState<Date>(() => new Date());
  const [prayerByCity, setPrayerByCity] = useState<Record<HaramainCityId, PrayerTimings | null>>({
    makkah: null,
    madinah: null,
  });

  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveCity(initialCity);
    }
  }, [isOpen, initialCity]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all(HARAMAIN_STREAMS.map((s) => fetchHaramainPrayerTimes(s))).then(
      ([makkahTimings, madinahTimings]) => {
        if (cancelled) return;
        setPrayerByCity({
          makkah: makkahTimings,
          madinah: madinahTimings,
        });
      }
    );
    const timer = window.setInterval(() => setSaudiNow(new Date()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useDpadNavigation({
    scopeSelector: '#haramain-live-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);
  if (!shouldRender) return null;

  const activeStream =
    HARAMAIN_STREAMS.find((s) => s.id === activeCity) || HARAMAIN_STREAMS[0];
  const activeTimings = prayerByCity[activeCity];
  const saudiParts = getTimeParts(activeStream.tz, saudiNow);
  const formattedSaudiClock = `${String(saudiParts.hour).padStart(2, '0')}:${saudiParts.minute}:${saudiParts.second} AST`;

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      onToast('Mode layar penuh tidak didukung pada jendela ini');
    }
  };

  return (
    <div
      id="haramain-live-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Siaran Langsung Makkah dan Madinah"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/94 p-3 md:p-6 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        ref={stageRef}
        className={`flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#071117] shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-900/75 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white md:text-lg">
                  Siaran Live Haramain
                </h1>
                <span className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono-tabular text-[11px] font-semibold text-emerald-300">
                  {formattedSaudiClock}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {splitView
                  ? 'Masjidil Haram (Makkah) & Masjid Nabawi (Madinah) · Dua Layar'
                  : `${activeStream.mosque} (${activeStream.city}) · ${activeStream.channelName}`}
              </p>
            </div>
          </div>

          {/* Channel & Player Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {HARAMAIN_STREAMS.map((stream) => {
              const isSelected = !splitView && activeCity === stream.id;
              return (
                <button
                  key={stream.id}
                  type="button"
                  data-focusable="true"
                  data-dpad-default={stream.id === 'makkah' ? 'true' : undefined}
                  onClick={() => {
                    setSplitView(false);
                    setActiveCity(stream.id);
                    onToast(`Menayangkan siaran langsung ${stream.mosque}`);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                      : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{stream.id === 'makkah' ? 'Makkah Live' : 'Madinah Live'}</span>
                </button>
              );
            })}

            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                setSplitView((prev) => {
                  const next = !prev;
                  onToast(
                    next
                      ? 'Mode dua layar aktif: Makkah & Madinah'
                      : `Fokus layar tunggal: ${activeStream.mosque}`
                  );
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0 ${
                splitView
                  ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                  : 'border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5 text-amber-300" />
              <span>Dua Layar</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                setSourceMode((prev) => {
                  const next = prev === 'hls' ? 'youtube' : 'hls';
                  onToast(
                    next === 'hls'
                      ? 'Sumber siaran: Aliran Langsung TV (HLS)'
                      : 'Sumber siaran: Kanal YouTube Resmi'
                  );
                  return next;
                });
              }}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              {sourceMode === 'hls' ? 'Sumber: TV HLS' : 'Sumber: YouTube Live'}
            </button>

            <button
              type="button"
              data-focusable="true"
              aria-label={muted ? 'Nyalakan suara siaran' : 'Bisukan suara siaran'}
              onClick={() => setMuted((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-rose-300" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-300" />
              )}
              <span>{muted ? 'Bisu' : 'Suara'}</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              aria-label="Muat ulang siaran"
              onClick={() => {
                setReloadSeed((s) => s + 1);
                onToast('Memuat ulang aliran siaran langsung');
              }}
              className="rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              data-focusable="true"
              aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
              onClick={toggleFullscreen}
              className="rounded-xl border border-slate-700 bg-slate-800/90 p-2 text-slate-200 hover:bg-slate-700"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              data-focusable="true"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Main Video Stage */}
        <div className="min-h-0 flex-1 bg-black/95 p-3 md:p-4">
          {splitView ? (
            <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-2">
              <StreamPlayerPane
                stream={HARAMAIN_STREAMS[0]}
                sourceMode={sourceMode}
                muted={muted}
                reloadSeed={reloadSeed}
                compactLabel
                onHlsFallbackRequested={() => setSourceMode('youtube')}
              />
              <StreamPlayerPane
                stream={HARAMAIN_STREAMS[1]}
                sourceMode={sourceMode}
                muted={true}
                reloadSeed={reloadSeed}
                compactLabel
                onHlsFallbackRequested={() => setSourceMode('youtube')}
              />
            </div>
          ) : (
            <StreamPlayerPane
              stream={activeStream}
              sourceMode={sourceMode}
              muted={muted}
              reloadSeed={reloadSeed}
              onHlsFallbackRequested={() => setSourceMode('youtube')}
            />
          )}
        </div>

        {/* Footer: Waktu Sholat Setempat Makkah / Madinah (Umm al-Qura) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 bg-slate-900/80 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-emerald-300">{activeStream.city}:</span>
            <span className="text-slate-400">{activeStream.description}</span>
          </div>

          {activeTimings && (
            <div className="flex flex-wrap items-center gap-3 font-mono-tabular">
              {PRAYER_KEYS.map((k) => (
                <span key={k} className="text-slate-300">
                  <span className="text-slate-400">{PRAYER_LABELS[k]} </span>
                  <span className="font-semibold text-white">{activeTimings[k]?.slice(0, 5)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

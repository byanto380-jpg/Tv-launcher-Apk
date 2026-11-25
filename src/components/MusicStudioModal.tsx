import React, { useState } from 'react';
import { Disc3, Music, Play, Sparkles, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DpadSpeed } from '../types/launcher';

interface GeneratedTrack {
  id: string;
  prompt: string;
  model: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
  audioDataUrl: string;
  lyrics: string;
  createdAt: string;
}

const MUSIC_PRESETS = [
  {
    label: 'Lo-Fi Ruang Tamu',
    prompt:
      'Warm lo-fi chillhop beats with electric piano, soft vinyl crackle, mellow bassline, calm evening living room ambiance, 82 BPM',
  },
  {
    label: 'Akustik Fajar Tenang',
    prompt:
      'Peaceful acoustic nylon guitar and gentle warm pad strings, serene morning sunrise atmosphere, hopeful and meditative',
  },
  {
    label: 'Orkestra Sinematik',
    prompt:
      'Epic sweeping cinematic orchestral theme with lush strings, warm French horns, and subtle timpani percussion, inspiring movie score',
  },
  {
    label: 'Jazz Malam Santai',
    prompt:
      'Smooth late-night jazz trio with upright bass, brushed drums, and expressive muted trumpet, cozy lounge mood',
  },
];

interface MusicStudioModalProps {
  isOpen: boolean;
  soundNav: boolean;
  dpadSpeed: DpadSpeed;
  onClose: () => void;
  onToast: (message: string) => void;
}

export const MusicStudioModal: React.FC<MusicStudioModalProps> = ({
  isOpen,
  soundNav,
  dpadSpeed,
  onClose,
  onToast,
}) => {
  const [model, setModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>(
    'lyria-3-clip-preview'
  );
  const [prompt, setPrompt] = useState(MUSIC_PRESETS[0].prompt);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  useDpadNavigation({
    scopeSelector: '#music-studio-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  if (!shouldRender) return null;

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0] || null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, model }),
      });
      const data = (await res.json()) as {
        audioDataUrl?: string;
        lyrics?: string;
        model?: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
        error?: string;
      };

      if (!res.ok || !data.audioDataUrl) {
        throw new Error(
          data.error || 'Gagal membuat musik dengan model Lyria.'
        );
      }

      const newTrack: GeneratedTrack = {
        id: `trk-${Date.now()}`,
        prompt: trimmed,
        model: data.model || model,
        audioDataUrl: data.audioDataUrl,
        lyrics: data.lyrics || '',
        createdAt: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setTracks((prev) => [newTrack, ...prev]);
      setActiveTrackId(newTrack.id);
      onToast('Trek musik berhasil dibuat dengan Lyria');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membuat musik. Pastikan API key berbayar tersedia di Settings > Secrets.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      id="music-studio-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Studio Musik AI Lyria"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100 md:text-2xl">
                Studio Musik Ambient TV
              </h1>
              <p className="text-sm text-slate-400">
                Buat musik latar ruang keluarga secara langsung menggunakan Lyria 3
              </p>
            </div>
          </div>

          <button
            type="button"
            data-focusable="true"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <X className="h-4 w-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-12">
          {/* Left: Prompt & Model Config */}
          <form onSubmit={handleGenerate} className="space-y-4 lg:col-span-7">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">
                Durasi &amp; Model Lyria
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => setModel('lyria-3-clip-preview')}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    model === 'lyria-3-clip-preview'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">Klip Cepat (30 detik)</div>
                  <div className="text-xs opacity-80">lyria-3-clip-preview</div>
                </button>
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => setModel('lyria-3-pro-preview')}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    model === 'lyria-3-pro-preview'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-sm font-semibold">Trek Penuh (Pro)</div>
                  <div className="text-xs opacity-80">lyria-3-pro-preview</div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">
                Preset Suasana
              </span>
              <div className="flex flex-wrap gap-2">
                {MUSIC_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    data-focusable="true"
                    onClick={() => setPrompt(preset.prompt)}
                    className="rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lyria-prompt" className="block text-xs font-medium text-slate-400">
                Deskripsi Musik / Instrumen / Tempo
              </label>
              <textarea
                id="lyria-prompt"
                rows={4}
                data-focusable="true"
                data-dpad-default="true"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Deskripsikan genre, suasana, instrumen, dan tempo musik…"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-400"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs leading-relaxed text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              data-focusable="true"
              disabled={generating || !prompt.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {generating
                  ? 'Merangkai Audio Musik…'
                  : model === 'lyria-3-pro-preview'
                  ? 'Buat Trek Penuh (Lyria Pro)'
                  : 'Buat Klip 30 Detik (Lyria Clip)'}
              </span>
            </button>
          </form>

          {/* Right: Player & Generated History */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-5 lg:col-span-5">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">
              Pemutar &amp; Riwayat Musik
            </h2>

            {activeTrack ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    <Disc3 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {activeTrack.prompt}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {activeTrack.model} · {activeTrack.createdAt}
                    </div>
                  </div>
                </div>

                <audio
                  key={activeTrack.id}
                  controls
                  autoPlay
                  src={activeTrack.audioDataUrl}
                  className="w-full"
                />

                {activeTrack.lyrics && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {activeTrack.lyrics}
                  </div>
                )}

                {tracks.length > 1 && (
                  <div className="space-y-1.5 border-t border-slate-800 pt-3">
                    <div className="text-xs font-medium text-slate-400">
                      Trek Sebelumnya ({tracks.length})
                    </div>
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {tracks.map((trk) => (
                        <button
                          key={trk.id}
                          type="button"
                          data-focusable="true"
                          onClick={() => setActiveTrackId(trk.id)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs ${
                            trk.id === activeTrack.id
                              ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Play className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{trk.prompt}</span>
                          <span className="font-mono-tabular text-slate-400">{trk.createdAt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
                <Disc3 className="mb-3 h-10 w-10 text-slate-600" />
                <p className="max-w-xs leading-relaxed">
                  Pilih preset atau tulis deskripsi musik di sebelah kiri lalu tekan tombol buat untuk memutar trek audio MP3 langsung di TV.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

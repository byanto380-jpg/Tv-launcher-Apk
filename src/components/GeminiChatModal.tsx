import React, { useEffect, useRef, useState } from 'react';
import { Bot, Radio, Send, Sparkles, Trash2, User, X } from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DpadSpeed, WeatherWarning } from '../types/launcher';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  model?: string;
}

interface PersonaPreset {
  id: string;
  label: string;
  systemInstruction: string;
  starterPrompt: string;
}

const PERSONAS: PersonaPreset[] = [
  {
    id: 'tv-guide',
    label: 'Pemandu TV & Harian',
    systemInstruction:
      'Anda adalah Pemandu TV Pintar untuk Android TV Launcher. Jawab dengan ramah, ringkas, dan mudah dibaca di layar TV dalam bahasa Indonesia. Bantu pengguna merencanakan tontonan, cuaca, dan aktivitas harian.',
    starterPrompt: 'Rangkum agenda santai malam ini untuk menonton bersama keluarga.',
  },
  {
    id: 'ibadah',
    label: 'Asisten Sholat & Doa',
    systemInstruction:
      'Anda adalah Asisten Ibadah yang tenang, sopan, dan akurat. Berikan panduan waktu sholat, doa harian, dan pengingat ibadah dalam bahasa Indonesia yang jelas untuk dibaca di layar TV ruang keluarga.',
    starterPrompt: 'Berikan doa singkat sebelum beraktivitas dan keutamaan sholat tepat waktu.',
  },
  {
    id: 'sports',
    label: 'Analis Bola',
    systemInstruction:
      'Anda adalah Analis Sepak Bola untuk layar TV. Berikan ulasan taktik, jadwal liga top Eropa dan Liga 1, serta prediksi gaya bermain secara objektif dan ringkas dalam bahasa Indonesia.',
    starterPrompt: 'Bahas tren taktik sepak bola modern di Premier League dan Liga Champions.',
  },
  {
    id: 'city',
    label: 'Penjelajah Kota',
    systemInstruction:
      'Anda adalah Pemandu Kota Lokal yang membantu keluarga menemukan ide wisata, kuliner, dan tempat ramah anak di kota yang sedang aktif di TV Launcher. Jawab singkat dan terstruktur.',
    starterPrompt: 'Rekomendasikan ide aktivitas akhir pekan di dalam kota.',
  },
];

const CHAT_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Umum)',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite (Cepat)',
  },
  {
    id: 'gemini-4-neon',
    label: 'Gemini 4 Neon (Interaktif)',
  },
  {
    id: 'gemini-4-carbon',
    label: 'Gemini 4 Carbon (Penalaran Dalam)',
  },
];

interface GeminiChatModalProps {
  isOpen: boolean;
  cityName: string;
  weatherSummary?: string;
  extremeWeatherWarning?: WeatherWarning | null;
  nextPrayerSummary?: string;
  activeLeagueName: string;
  soundNav: boolean;
  dpadSpeed: DpadSpeed;
  onBroadcastReply?: (text: string) => void;
  onClose: () => void;
}

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  cityName,
  weatherSummary,
  extremeWeatherWarning,
  nextPrayerSummary,
  activeLeagueName,
  soundNav,
  dpadSpeed,
  onBroadcastReply,
  onClose,
}) => {
  const [personaId, setPersonaId] = useState<string>(PERSONAS[0].id);
  const [modelId, setModelId] = useState<string>('gemini-4-hydrogen');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement | null>(null);

  useDpadNavigation({
    scopeSelector: '#gemini-chat-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, sending]);

  if (!shouldRender) return null;

  const activePersona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0];

  const buildSystemInstruction = () => {
    const contextLines = [
      activePersona.systemInstruction,
      `Konteks layar TV saat ini: Kota aktif ${cityName}.`,
      weatherSummary ? `Cuaca saat ini: ${weatherSummary}.` : '',
      extremeWeatherWarning?.level === 'extreme'
        ? `PERINGATAN CUACA EKSTREM AKTIF: ${extremeWeatherWarning.title} (${extremeWeatherWarning.detail}). Prioritaskan saran keselamatan praktis jika relevan.`
        : '',
      nextPrayerSummary ? `Jadwal sholat terdekat: ${nextPrayerSummary}.` : '',
      `Liga bola aktif: ${activeLeagueName}.`,
    ]
      .filter(Boolean)
      .join(' ');
    return contextLines;
  };

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          systemInstruction: buildSystemInstruction(),
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          message: trimmed,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendapatkan respons dari asisten AI.');
      }

      const replyMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.reply || '(Tidak ada teks balasan)',
        model: data.model || modelId,
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke server Gemini AI.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendPrompt(input);
  };

  return (
    <div
      id="gemini-chat-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Asisten AI TV Launcher"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex h-[88vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-100 md:text-xl">
                Asisten TV AI
              </h1>
              <p className="text-xs text-slate-400">
                Percakapan multi-giliran dengan konteks kota {cityName} &amp; jadwal TV
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Pilih model Gemini"
              data-focusable="true"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100"
            >
              {CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Obrolan Baru</span>
            </button>

            <button
              type="button"
              data-focusable="true"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <X className="h-4 w-4" />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Persona Role Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 bg-slate-950/40 px-6 py-3">
          <span className="text-xs font-medium text-slate-400">Peran Asisten:</span>
          {PERSONAS.map((persona) => {
            const active = persona.id === personaId;
            return (
              <button
                key={persona.id}
                type="button"
                data-focusable="true"
                onClick={() => setPersonaId(persona.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                    : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {persona.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Conversation Thread */}
        <div
          ref={threadRef}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-sky-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="text-base font-semibold text-slate-100">
                  Mode {activePersona.label} siap membantu
                </h2>
                <p className="text-xs leading-relaxed text-slate-400">
                  Tanyakan apa saja mengenai jadwal harian, rekomendasi hiburan, berita sepak bola {activeLeagueName}, atau aktivitas di {cityName}.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5">
                {extremeWeatherWarning?.level === 'extreme' && (
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() =>
                      sendPrompt(
                        `Berikan panduan keselamatan darurat untuk menghadapi ${extremeWeatherWarning.title} di ${cityName}.`
                      )
                    }
                    className="rounded-xl border border-rose-400/50 bg-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                  >
                    Panduan Darurat: {extremeWeatherWarning.title}
                  </button>
                )}
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => sendPrompt(activePersona.starterPrompt)}
                  className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-xs font-medium text-sky-100 hover:bg-sky-500/25"
                >
                  Coba: &ldquo;{activePersona.starterPrompt}&rdquo;
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className="max-w-[82%] space-y-1.5">
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'border-sky-400/40 bg-sky-500/20 text-slate-50'
                          : 'border-slate-700/70 bg-slate-800/85 text-slate-100'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {!isUser && onBroadcastReply && (
                      <button
                        type="button"
                        data-focusable="true"
                        onClick={() => onBroadcastReply(msg.text)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/25"
                      >
                        <Radio className="h-3 w-3 text-rose-300" />
                        <span>Siarkan sebagai Pesan Berjalan</span>
                      </button>
                    )}
                  </div>
                  {isUser && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <span>Menyusun jawaban…</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-t border-slate-800 px-6 py-4"
        >
          <input
            type="text"
            data-focusable="true"
            data-dpad-default="true"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Tanya ${activePersona.label}…`}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-400"
          />
          <button
            type="submit"
            data-focusable="true"
            disabled={sending || !input.trim()}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" />
            <span>{sending ? 'Mengirim…' : 'Kirim'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

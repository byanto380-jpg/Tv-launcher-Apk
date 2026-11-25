import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useModalTransition } from '../hooks/useModalTransition';
import type { DpadSpeed } from '../types/launcher';

interface GroundedPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets: Array<{ text: string; uri?: string }>;
}

interface SelectedMapLocation {
  lat: number;
  lng: number;
  label: string;
  address?: string;
}

interface MapsModalProps {
  isOpen: boolean;
  cityName: string;
  cityLat: number;
  cityLon: number;
  soundNav: boolean;
  dpadSpeed: DpadSpeed;
  onSelectCityLocation?: (loc: { name: string; lat: number; lon: number }) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

const GROUNDING_QUICK_QUERIES = [
  { label: 'Masjid Terdekat', query: 'Rekomendasi masjid besar atau masjid terdekat dari lokasi ini lengkap dengan fasilitas sholatnya' },
  { label: 'Kuliner Keluarga', query: 'Tempat makan dan restoran keluarga yang nyaman dan populer di sekitar lokasi ini' },
  { label: 'Apotek & Klinik', query: 'Apotek 24 jam atau klinik kesehatan terdekat di sekitar lokasi ini' },
  { label: 'Wisata & Taman', query: 'Taman kota atau destinasi wisata ramah keluarga terdekat di sekitar lokasi ini' },
];

function isQuotaErrorLike(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err).toUpperCase();
  return (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('QUOTA') ||
    msg.includes('429')
  );
}

interface PlacePredictionLike {
  placeId?: string;
  text: { text: string };
  mainText?: { text: string } | null;
  toPlace: () => {
    displayName?: string | null;
    formattedAddress?: string | null;
    location?: { lat: () => number; lng: () => number } | null;
    fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
  };
}

interface AutocompleteSuggestionLike {
  placePrediction?: PlacePredictionLike | null;
}

interface PlacesLibraryLike {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      sessionToken?: unknown;
      locationBias?: { center: { lat: number; lng: number }; radius: number };
    }) => Promise<{ suggestions?: AutocompleteSuggestionLike[] }>;
  };
}

function PlaceAutocompleteSearch({
  biasCenter,
  onPlacePicked,
}: {
  biasCenter: { lat: number; lng: number };
  onPlacePicked: (loc: SelectedMapLocation) => void;
}) {
  const placesLib = useMapsLibrary('places') as unknown as PlacesLibraryLike | null;
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const sessionTokenRef = useRef<unknown | null>(null);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!placesLib || !trimmed) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError(null);
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          locationBias: {
            center: biasCenter,
            radius: 30000,
          },
        });
        if (!cancelled) {
          setSuggestions(res.suggestions || []);
        }
      } catch (err) {
        if (isQuotaErrorLike(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          setSuggestions([]);
          setSearchError('Pencarian lokasi Google Places sedang tidak tersedia.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputValue, biasCenter]);

  const handleSelectSuggestion = async (suggestion: AutocompleteSuggestionLike) => {
    if (!placesLib || !suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        onPlacePicked({
          lat: place.location.lat(),
          lng: place.location.lng(),
          label:
            place.displayName ||
            suggestion.placePrediction.mainText?.text ||
            suggestion.placePrediction.text.text,
          address: place.formattedAddress || undefined,
        });
      }
      setInputValue('');
      resetSession();
    } catch (err) {
      if (isQuotaErrorLike(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      setSearchError('Gagal memuat koordinat tempat terpilih.');
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
        />
        <input
          type="text"
          data-focusable="true"
          aria-label="Cari alamat atau kota di Google Maps"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Cari kota, alamat, atau tempat di Google Maps…"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pr-9 pl-9 text-sm text-slate-100 placeholder-slate-400"
        />
        {loading && (
          <span className="absolute right-3 text-[11px] text-sky-400">…</span>
        )}
      </div>

      {searchError && (
        <p className="mt-1 text-xs text-rose-300">{searchError}</p>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl">
          {suggestions.map((suggestion, idx) => (
            <li key={suggestion.placePrediction?.placeId || idx}>
              <button
                type="button"
                data-focusable="true"
                onClick={() => void handleSelectSuggestion(suggestion)}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-100 hover:bg-slate-800"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span className="min-w-0 flex-1">
                  {suggestion.placePrediction?.text.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InteractiveMapViewport({
  selectedLocation,
  zoom,
  onCameraChange,
  onLocationChange,
}: {
  selectedLocation: SelectedMapLocation;
  zoom: number;
  onCameraChange: (center: { lat: number; lng: number }, zoom: number) => void;
  onLocationChange: (loc: SelectedMapLocation) => void;
}) {
  const apiStatus = useApiLoadingStatus();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);

  useEffect(() => {
    if (
      apiStatus === APILoadingStatus.AUTH_FAILURE ||
      apiStatus === APILoadingStatus.FAILED
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [apiStatus]);

  useEffect(() => {
    setInfoOpen(true);
  }, [selectedLocation.lat, selectedLocation.lng, selectedLocation.label]);

  if (
    apiStatus === APILoadingStatus.AUTH_FAILURE ||
    apiStatus === APILoadingStatus.FAILED
  ) {
    return (
      <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-rose-500/35 bg-slate-950/80 px-6 text-center md:h-[420px]">
        <MapPin className="mb-3 h-8 w-8 text-amber-400" />
        <p className="text-sm font-semibold text-slate-100">
          Google Maps tidak dapat dimuat
        </p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
          Terjadi kendala otorisasi atau kuota Google Maps Platform. Anda tetap dapat menggunakan pencarian AI Maps Grounding di panel sebelah kanan.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 md:h-[420px]">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
        zoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        onCameraChanged={(ev) => {
          onCameraChange(ev.detail.center, ev.detail.zoom);
        }}
        onClick={(ev) => {
          const coords = ev.detail.latLng;
          if (!coords) return;
          onLocationChange({
            lat: coords.lat,
            lng: coords.lng,
            label: 'Titik Peta Terpilih',
          });
        }}
        className="h-full w-full"
      >
        <AdvancedMarker
          ref={markerRef}
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          title={selectedLocation.label}
          onClick={() => setInfoOpen((prev) => !prev)}
        >
          <Pin
            background="#0ea5e9"
            borderColor="#e0f2fe"
            glyphColor="#0f172a"
          />
        </AdvancedMarker>

        {infoOpen && marker && (
          <InfoWindow
            anchor={marker}
            onCloseClick={() => setInfoOpen(false)}
          >
            <div className="max-w-[220px] text-slate-900">
              <div className="text-xs font-bold">{selectedLocation.label}</div>
              {selectedLocation.address && (
                <div className="mt-0.5 text-[11px] text-slate-600">
                  {selectedLocation.address}
                </div>
              )}
              <div className="mt-1 font-mono text-[10px] text-slate-500">
                {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

export const MapsModal: React.FC<MapsModalProps> = ({
  isOpen,
  cityName,
  cityLat,
  cityLon,
  soundNav,
  dpadSpeed,
  onSelectCityLocation,
  onClose,
  onToast,
}) => {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [selectedLocation, setSelectedLocation] = useState<SelectedMapLocation>({
    lat: cityLat,
    lng: cityLon,
    label: cityName,
  });
  const [cameraCenter, setCameraCenter] = useState<{ lat: number; lng: number }>({
    lat: cityLat,
    lng: cityLon,
  });
  const [zoom, setZoom] = useState(12);
  const [locating, setLocating] = useState(false);

  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [groundingAnswer, setGroundingAnswer] = useState<string>('');
  const [groundingPlaces, setGroundingPlaces] = useState<GroundedPlace[]>([]);

  useDpadNavigation({
    scopeSelector: '#maps-modal',
    enabled: isOpen,
    soundEnabled: soundNav,
    dpadSpeed,
    onBack: onClose,
  });

  const { shouldRender, isVisible } = useModalTransition(isOpen, 200);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedLocation({
      lat: cityLat,
      lng: cityLon,
      label: cityName,
    });
    setCameraCenter({ lat: cityLat, lng: cityLon });
    setZoom(12);
  }, [isOpen, cityName, cityLat, cityLon]);

  if (!shouldRender) return null;

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      onToast('Perangkat ini tidak mendukung geolokasi browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLoc: SelectedMapLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Lokasi Saat Ini',
        };
        setSelectedLocation(nextLoc);
        setCameraCenter({ lat: nextLoc.lat, lng: nextLoc.lng });
        setZoom(14);
        setLocating(false);
        onToast('Peta dipusatkan ke lokasi perangkat Anda');
      },
      () => {
        setLocating(false);
        onToast('Izin lokasi ditolak atau tidak tersedia');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const runMapsGrounding = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || groundingLoading) return;

    setGroundingLoading(true);
    setGroundingError(null);

    try {
      const res = await fetch('/api/maps/grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        places?: GroundedPlace[];
        error?: string;
      };

      if (res.status === 429 || (data.error && isQuotaErrorLike(data.error))) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }

      if (!res.ok) {
        throw new Error(
          data.error || 'Gagal mengambil data tempat dari Google Maps Grounding.'
        );
      }

      setGroundingAnswer(data.text || '');
      setGroundingPlaces(Array.isArray(data.places) ? data.places : []);
    } catch (err) {
      setGroundingError(
        err instanceof Error
          ? err.message
          : 'Gagal terhubung ke layanan Google Maps Grounding.'
      );
    } finally {
      setGroundingLoading(false);
    }
  };

  const handleGroundingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runMapsGrounding(groundingQuery);
  };

  return (
    <div
      id="maps-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Peta Kota dan Eksplorasi Sekitar"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-4 md:p-8 backdrop-blur-md transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.97] opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-100 md:text-xl">
                Peta Kota &amp; Eksplorasi Sekitar
              </h1>
              <p className="text-xs text-slate-400">
                Peta interaktif Google Maps dan pencarian tempat terverifikasi sekitar {selectedLocation.label}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-focusable="true"
              onClick={handleLocateMe}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <LocateFixed className="h-3.5 w-3.5 text-sky-400" />
              <span>{locating ? 'Mencari Lokasi…' : 'Lokasi Saya'}</span>
            </button>

            {onSelectCityLocation && (
              <button
                type="button"
                data-focusable="true"
                onClick={() => {
                  onSelectCityLocation({
                    name: selectedLocation.label,
                    lat: selectedLocation.lat,
                    lon: selectedLocation.lng,
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25 whitespace-nowrap shrink-0"
              >
                <Navigation className="h-3.5 w-3.5 text-emerald-300" />
                <span>Jadikan Kota Launcher</span>
              </button>
            )}

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

        {/* Main 2-column Body */}
        <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-12">
          {/* Left: Interactive Google Map + Autocomplete */}
          <div className="flex flex-col gap-3 lg:col-span-7">
            {mapsApiKey ? (
              <APIProvider
                apiKey={mapsApiKey}
                libraries={['marker', 'places']}
                language="id"
                region="ID"
              >
                <PlaceAutocompleteSearch
                  biasCenter={cameraCenter}
                  onPlacePicked={(loc) => {
                    setSelectedLocation(loc);
                    setCameraCenter({ lat: loc.lat, lng: loc.lng });
                    setZoom(14);
                  }}
                />
                <InteractiveMapViewport
                  selectedLocation={selectedLocation}
                  zoom={zoom}
                  onCameraChange={(center, nextZoom) => {
                    setCameraCenter(center);
                    setZoom(nextZoom);
                  }}
                  onLocationChange={(loc) => {
                    setSelectedLocation(loc);
                    setCameraCenter({ lat: loc.lat, lng: loc.lng });
                  }}
                />
              </APIProvider>
            ) : (
              <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-amber-500/35 bg-slate-950/75 px-6 text-center md:h-[420px]">
                <MapPin className="mb-3 h-8 w-8 text-amber-400" />
                <p className="text-sm font-semibold text-slate-100">
                  Kunci Google Maps belum aktif
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-400">
                  Pastikan variabel VITE_GOOGLE_MAPS_API_KEY tersedia untuk menampilkan peta interaktif.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                Klik pada peta untuk memindahkan pin atau cari tempat di kolom atas.
              </span>
              <span className="font-mono-tabular text-slate-300">
                {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Right: Google Maps Grounding via Gemini API */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 lg:col-span-5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Sparkles className="h-4 w-4 text-sky-400" />
                <span>Tanya Tempat Sekitar (Google Maps AI)</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Rekomendasi tempat nyata dan ulasan sekitar pin aktif.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {GROUNDING_QUICK_QUERIES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  data-focusable="true"
                  onClick={() => {
                    setGroundingQuery(item.label);
                    void runMapsGrounding(item.query);
                  }}
                  className="rounded-lg border border-slate-700/80 bg-slate-800/85 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleGroundingSubmit} className="flex items-center gap-2">
              <input
                type="text"
                data-focusable="true"
                data-dpad-default="true"
                value={groundingQuery}
                onChange={(e) => setGroundingQuery(e.target.value)}
                placeholder="Mis. masjid terdekat, kopi enak, SPBU…"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 md:text-sm"
              />
              <button
                type="submit"
                data-focusable="true"
                disabled={groundingLoading || !groundingQuery.trim()}
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap shrink-0 md:text-sm"
              >
                {groundingLoading ? 'Mencari…' : 'Cari'}
              </button>
            </form>

            {groundingError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                {groundingError}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs leading-relaxed">
              {groundingLoading ? (
                <div className="space-y-2 py-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
                </div>
              ) : !groundingAnswer && groundingPlaces.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Pilih topik cepat di atas atau ketik pertanyaan untuk menelusuri tempat di sekitar koordinat peta.
                </div>
              ) : (
                <>
                  {groundingAnswer && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-slate-200 whitespace-pre-wrap">
                      {groundingAnswer}
                    </div>
                  )}

                  {groundingPlaces.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-300">
                        Sumber Google Maps ({groundingPlaces.length})
                      </div>
                      {groundingPlaces.map((place, idx) => (
                        <div
                          key={place.placeId || `${place.uri}-${idx}`}
                          className="rounded-xl border border-slate-800 bg-slate-900/75 p-3"
                        >
                          <a
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-focusable="true"
                            className="flex items-center justify-between gap-2 font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                          >
                            <span className="truncate">{place.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>

                          {place.reviewSnippets.length > 0 && (
                            <ul className="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2 text-[11px] text-slate-300">
                              {place.reviewSnippets.slice(0, 2).map((snip, sIdx) => (
                                <li key={sIdx} className="leading-snug">
                                  <span>&ldquo;{snip.text}&rdquo;</span>
                                  {snip.uri && (
                                    <a
                                      href={snip.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-1.5 text-sky-400 underline hover:text-sky-300"
                                    >
                                      Ulasan
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

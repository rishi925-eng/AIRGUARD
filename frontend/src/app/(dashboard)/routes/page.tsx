'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity, AlertTriangle, Bike, Car, CheckCircle2, Clock, Footprints,
  Info, Leaf, MapPin, Navigation, RefreshCw, Scale, Search, Shield, ShieldCheck,
  TrendingDown, Wind, X, Zap,
} from 'lucide-react';
import {
  fetchRouteAlternatives, LocationAQI, LocationSuggestion, RouteAlternative,
  RouteCompareResponse, SaferRouteRecommendation, searchLocations,
} from '../../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type Point = { lat: number; lon: number };
type Field = 'origin' | 'destination';

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtDistance(m: number | null | undefined): string {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function fmtDuration(s: number | null | undefined): string {
  if (s == null) return '—';
  const mins = Math.max(1, Math.round(s / 60));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins} min`;
}

function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return 'Live real-time model';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function aqiColor(aqi: number | null | undefined): string {
  if (aqi == null) return 'text-slate-400';
  if (aqi <= 50) return 'text-emerald-700';
  if (aqi <= 100) return 'text-amber-700';
  if (aqi <= 150) return 'text-orange-700';
  if (aqi <= 200) return 'text-red-700';
  return 'text-purple-700';
}

function aqiBadgeBg(aqi: number | null | undefined): string {
  if (aqi == null) return 'bg-slate-50 text-slate-500 border-slate-200';
  if (aqi <= 50) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (aqi <= 100) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (aqi <= 150) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (aqi <= 200) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-purple-50 text-purple-700 border-purple-200';
}

function aqiLabel(aqi: number | null | undefined): string {
  if (aqi == null) return 'No data';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function aqiDotColor(aqi: number | null | undefined): string {
  if (aqi == null) return 'bg-slate-500';
  if (aqi <= 50) return 'bg-emerald-400';
  if (aqi <= 100) return 'bg-yellow-400';
  if (aqi <= 150) return 'bg-orange-400';
  if (aqi <= 200) return 'bg-red-400';
  return 'bg-purple-400';
}

// ── Leaflet map (dynamic import — no SSR) ────────────────────────────────────

const LeafletRouteMap = dynamic(() => import('./LeafletRouteMap'), { ssr: false });

// ── LocationField component ───────────────────────────────────────────────────

interface LocationFieldProps {
  label: string;
  value: string;
  field: Field;
  color: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  hasValidCoords: boolean;
}

function LocationField({ label, value, field, color, onChange, onSelect, hasValidCoords }: LocationFieldProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setSearchError('');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        const results = await searchLocations(value.trim(), controller.signal);
        if (id !== requestId.current) return;
        setSuggestions(results);
        setOpen(true);
        setHighlighted(0);
        if (results.length === 0) setSearchError('No locations found for this search.');
      } catch (err: unknown) {
        if ((err as DOMException).name === 'AbortError') return;
        if (id !== requestId.current) return;
        const status = (err as Error & { status?: number }).status;
        const msg = (err as Error).message || '';
        if (status === 429) {
          setSearchError('Search rate limit reached. Please wait a moment and try again.');
        } else if (msg.toLowerCase().includes('fetch')) {
          setSearchError('Cannot reach the backend. Is the server running on port 8000?');
        } else {
          setSearchError(`Search error: ${msg}`);
        }
        setSuggestions([]);
        setOpen(true);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 380);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const handleSelect = useCallback((s: LocationSuggestion) => {
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  }, [onSelect]);

  return (
    <div className="relative" id={`location-field-${field}`}>
      <label className="text-[11px] text-slate-400 font-semibold mb-1 block tracking-wider">
        {label}
      </label>
      <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border transition-colors
        ${hasValidCoords ? 'border-emerald-500' : 'border-slate-200'} focus-within:border-emerald-500`}>
        <MapPin className={`w-4 h-4 shrink-0 ${color}`} />
        <input
          ref={inputRef}
          id={`input-${field}`}
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={e => {
            if (!open || suggestions.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(i => (i + 1) % suggestions.length); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(i => (i - 1 + suggestions.length) % suggestions.length); }
            if (e.key === 'Enter') { e.preventDefault(); handleSelect(suggestions[highlighted]); }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="bg-transparent text-xs text-slate-800 w-full focus:outline-none placeholder:text-slate-400"
          placeholder="Search a city, landmark, station or address…"
          autoComplete="off"
        />
        {hasValidCoords && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
        {loading && <span className="w-3 h-3 shrink-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />}
        {value && (
          <button
            aria-label={`Clear ${field}`}
            onClick={() => { onChange(''); setOpen(false); setSuggestions([]); }}
            className="shrink-0 hover:text-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200
            bg-white shadow-xl overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <button
              key={`${s.latitude}-${s.longitude}-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2.5 text-xs flex items-start gap-2 border-b border-slate-100 last:border-0
                ${i === highlighted ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <Search className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
              <span className="leading-snug">{s.label}</span>
            </button>
          ))}
          {searchError && (
            <div className="px-3 py-2.5 text-[10px] text-amber-700 flex items-start gap-2 bg-amber-50 border-t border-amber-200">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{searchError}</span>
            </div>
          )}
          {suggestions.length === 0 && !loading && !searchError && (
            <div className="px-3 py-3 text-xs text-slate-400">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Route card ────────────────────────────────────────────────────────────────

function RouteCard({
  route, index, selected, onSelect,
}: { route: RouteAlternative; index: number; selected: boolean; onSelect: () => void }) {
  const isClean = route.name.toLowerCase().includes('cleanest');

  return (
    <button
      id={`route-card-${route.id}`}
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200
        ${selected
          ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300 shadow-2xs'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
        }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold flex items-center gap-1.5 ${selected ? 'text-emerald-900' : 'text-slate-800'}`}>
          {isClean ? <Leaf className="w-3.5 h-3.5 text-emerald-600" /> : <Navigation className="w-3.5 h-3.5 text-slate-600" />}
          {route.name}
        </span>
        {index === 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
            TOP PICK
          </span>
        )}
      </div>

      {/* AQI badge */}
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border mb-3 ${aqiBadgeBg(route.average_aqi)}`}>
        <Wind className="w-3 h-3" />
        {route.average_aqi != null
          ? `AQI ${route.average_aqi} · ${aqiLabel(route.average_aqi)}`
          : 'AQI data unavailable'}
        {route.exposure_status === 'estimated' && <span className="opacity-60">~</span>}
      </div>

      <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
        {route.duration != null ? (
          <span className="flex items-center gap-1 font-medium text-slate-700">
            <Clock className="w-3 h-3 text-slate-400" />
            {fmtDuration(route.duration)}
          </span>
        ) : (
          <span className="text-slate-400 text-[10px]">Duration unavailable</span>
        )}
        {route.distance != null ? (
          <span className="font-medium text-slate-700">{fmtDistance(route.distance)}</span>
        ) : (
          <span className="text-slate-400 text-[10px]">—</span>
        )}
        {route.pm25_exposure_ug != null && (
          <span className="text-slate-500 font-mono text-[11px]" title="Estimated inhaled PM2.5 mass">
            {route.pm25_exposure_ug.toFixed(1)} µg
          </span>
        )}
      </div>

      {route.exposure_reduction_pct != null && (
        <div className={`mt-2 text-[10px] font-semibold ${route.exposure_reduction_pct > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {route.exposure_reduction_pct > 0
            ? `+${route.exposure_reduction_pct}% more exposure than cleanest`
            : `${Math.abs(route.exposure_reduction_pct)}% less exposure`}
        </div>
      )}
    </button>
  );
}

// ── AQI Location Card ─────────────────────────────────────────────────────────

function AQILocationCard({ data, label }: { data: LocationAQI; label: string }) {
  const hasData = data.aqi != null || data.pm25 != null;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className={`inline-flex items-center gap-1.5 ${aqiDotColor(data.aqi)} w-2 h-2 rounded-full`} />
      </div>

      {hasData ? (
        <>
          <div className="flex items-baseline gap-3">
            {data.aqi != null && (
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${aqiColor(data.aqi)}`}>{data.aqi}</span>
                <span className="text-[10px] text-slate-500 font-semibold">AQI</span>
              </div>
            )}
            {data.pm25 != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-slate-700">{data.pm25}</span>
                <span className="text-[10px] text-slate-500">µg/m³ PM2.5</span>
              </div>
            )}
          </div>
          {data.aqi != null && (
            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${aqiBadgeBg(data.aqi)}`}>
              {aqiLabel(data.aqi)} — {data.category}
            </div>
          )}
          {data.warning && (
            <p className="text-[11px] text-slate-600 leading-relaxed">{data.warning}</p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>Source: {data.source}</span>
            {data.is_estimated && <span className="text-amber-700">· Estimate</span>}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400">Air quality data unavailable for this location.</p>
      )}
    </div>
  );
}

// ── Safer Route Recommendation Card ───────────────────────────────────────────

function RecommendationCard({ rec }: { rec: SaferRouteRecommendation }) {
  return (
    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-2 text-slate-800 shadow-2xs">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{rec.title}</span>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">{rec.reason}</p>
      <p className="text-[11px] text-slate-600 leading-relaxed">{rec.health_advisory}</p>
      {rec.exposure_saved_pct != null && rec.exposure_saved_pct > 0 && (
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
          <Leaf className="w-3 h-3 text-emerald-600" />
          {rec.exposure_saved_pct}% less exposure than alternatives
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RoutesPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originPoint, setOriginPoint] = useState<Point | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<Point | null>(null);
  const [mode, setMode] = useState<'drive' | 'bike' | 'walk'>('drive');
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Full response data from backend
  const [originAqi, setOriginAqi] = useState<LocationAQI | null>(null);
  const [destinationAqi, setDestinationAqi] = useState<LocationAQI | null>(null);
  const [recommendation, setRecommendation] = useState<SaferRouteRecommendation | null>(null);
  const [routingStatus, setRoutingStatus] = useState<'ok' | 'failed' | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Retry counter to force re-fetch
  const [retryCount, setRetryCount] = useState(0);

  // Fetch routes whenever both endpoints + mode change (or retry)
  useEffect(() => {
    if (!originPoint || !destinationPoint) {
      setRoutes([]);
      setError('');
      setOriginAqi(null);
      setDestinationAqi(null);
      setRecommendation(null);
      setRoutingStatus(null);
      setRoutingError(null);
      return;
    }
    if (originPoint.lat === destinationPoint.lat && originPoint.lon === destinationPoint.lon) {
      setError('Start and destination must be different locations.');
      setRoutes([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRoutes([]);
    setOriginAqi(null);
    setDestinationAqi(null);
    setRecommendation(null);
    setRoutingStatus(null);
    setRoutingError(null);

    fetchRouteAlternatives(originPoint, destinationPoint, mode, controller.signal)
      .then((result: RouteCompareResponse) => {
        // Always set AQI data (available even when routing fails)
        setOriginAqi(result.origin_aqi ?? null);
        setDestinationAqi(result.destination_aqi ?? null);
        setRecommendation(result.safer_route_recommendation ?? null);
        setRoutingStatus(result.routing_status ?? null);
        setRoutingError(result.routing_error ?? null);

        // Set routes (may be empty if routing failed)
        setRoutes(result.routes ?? []);
        setSelected(0);

        if (result.routing_status === 'failed' && (!result.routes || result.routes.length === 0)) {
          // Routing failed but we still have AQI data — show a specific error
          setError(result.routing_error || 'Road routing unavailable between these locations.');
        } else if ((!result.routes || result.routes.length === 0) && result.routing_status !== 'failed') {
          setError('No route alternatives found between these locations.');
        }
      })
      .catch(reason => {
        if ((reason as DOMException).name === 'AbortError') return;
        const msg = (reason as Error).message || 'An error occurred while fetching routes.';
        if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
          setError('Cannot reach the AIRGUARD backend (port 8000). Start the backend server and try again.');
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [originPoint, destinationPoint, mode, retryCount]);

  const handleOriginSelect = useCallback((s: LocationSuggestion) => {
    setOrigin(s.label);
    setOriginPoint({ lat: s.latitude, lon: s.longitude });
  }, []);

  const handleDestinationSelect = useCallback((s: LocationSuggestion) => {
    setDestination(s.label);
    setDestinationPoint({ lat: s.latitude, lon: s.longitude });
  }, []);

  const handleOriginChange = useCallback((v: string) => {
    setOrigin(v);
    setOriginPoint(null);  // Invalidate until user selects a suggestion
    setRoutes([]);
    setOriginAqi(null);
    setDestinationAqi(null);
    setRecommendation(null);
  }, []);

  const handleDestinationChange = useCallback((v: string) => {
    setDestination(v);
    setDestinationPoint(null);
    setRoutes([]);
    setOriginAqi(null);
    setDestinationAqi(null);
    setRecommendation(null);
  }, []);

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  const selectedRoute = routes[selected];

  const fastest = useMemo(
    () => (routes.length > 1 ? routes.reduce((b, r) => (r.duration ?? Infinity) < (b.duration ?? Infinity) ? r : b) : null),
    [routes]
  );

  const hasAqiData = originAqi != null || destinationAqi != null;
  const bothPointsSet = !!originPoint && !!destinationPoint;

  return (
    <div className="min-w-0 w-full space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              EXPOSURE-MINIMIZED NAVIGATION
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Clean-Air Routing Engine</h1>
            <p className="text-xs text-slate-500 mt-1">
              Real road routes via OSRM · PM2.5 data via Open-Meteo · Ranked by inhaled exposure
            </p>
          </div>
          {/* Mode selector */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
            {([
              ['drive', Car, 'Drive'],
              ['bike', Bike, 'Cycle'],
              ['walk', Footprints, 'Walk'],
            ] as const).map(([val, Icon, lbl]) => (
              <button
                key={val}
                id={`mode-${val}`}
                onClick={() => setMode(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                  ${mode === val ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel */}
        <div className="min-w-0 lg:col-span-4 space-y-4">
          {/* Location inputs */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Plan Trip</h2>

            <LocationField
              label="START LOCATION"
              field="origin"
              value={origin}
              color="text-emerald-600"
              hasValidCoords={!!originPoint}
              onChange={handleOriginChange}
              onSelect={handleOriginSelect}
            />
            <LocationField
              label="DESTINATION"
              field="destination"
              value={destination}
              color="text-rose-600"
              hasValidCoords={!!destinationPoint}
              onChange={handleDestinationChange}
              onSelect={handleDestinationSelect}
            />

            {(!originPoint || !destinationPoint) && !error && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {!originPoint && !destinationPoint
                  ? 'Type a city, station, or landmark in both fields and select a suggestion to begin route analysis.'
                  : !originPoint
                  ? 'Select a start location suggestion to continue.'
                  : 'Select a destination suggestion to continue.'}
              </p>
            )}

            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
                {bothPointsSet && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200
                      text-[11px] font-bold text-red-700 hover:bg-red-200 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                Calculating routes and sampling air quality…
              </div>
            )}
          </div>

          {/* Origin & Destination AQI cards */}
          {hasAqiData && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Location Air Quality
              </h2>
              {originAqi && <AQILocationCard data={originAqi} label="Start Location AQI" />}
              {destinationAqi && <AQILocationCard data={destinationAqi} label="Destination AQI" />}
            </div>
          )}

          {/* Safer Route Recommendation */}
          {recommendation && (
            <RecommendationCard rec={recommendation} />
          )}

          {/* Route cards */}
          {routes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {routes.length} Route{routes.length > 1 ? 's' : ''} Found
              </h2>
              {routes.map((route, i) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={i}
                  selected={selected === i}
                  onSelect={() => setSelected(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="min-w-0 lg:col-span-8 space-y-5">
          {/* Map */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Road Network Map</h2>
                <p className="text-xs text-slate-500">
                  {routes.length > 0
                    ? 'Click a route line or card to compare alternatives.'
                    : bothPointsSet
                    ? (loading ? 'Computing road routes…' : (routingStatus === 'failed' ? 'Route geometry unavailable. Showing endpoint markers.' : 'Road geometry will appear after selecting both locations.'))
                    : 'Road geometry will appear after selecting both locations.'}
                </p>
              </div>
              {loading && (
                <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  Calculating…
                </span>
              )}
            </div>

            {bothPointsSet && routes.length > 0 ? (
              <div className="h-80 lg:h-96 rounded-2xl overflow-hidden border border-slate-200">
                <LeafletRouteMap
                  routes={routes}
                  selected={selected}
                  start={originPoint!}
                  end={destinationPoint!}
                  onSelect={setSelected}
                />
              </div>
            ) : bothPointsSet && !loading ? (
              /* Show map with just markers when routing failed but we have both points */
              <div className="h-80 lg:h-96 rounded-2xl overflow-hidden border border-slate-200">
                <LeafletRouteMap
                  routes={[]}
                  selected={0}
                  start={originPoint!}
                  end={destinationPoint!}
                  onSelect={() => {}}
                />
              </div>
            ) : (
              <div
                id="map-placeholder"
                className="min-h-72 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center gap-3 px-6 py-10"
              >
                <MapPin className="w-8 h-8 text-emerald-500/60" />
                <p className="text-sm text-slate-500 max-w-xs">
                  {loading
                    ? 'Computing road routes and sampling PM2.5 along each path…'
                    : 'Search and select two locations to display real road geometry and air quality data.'}
                </p>
              </div>
            )}
          </div>

          {/* Selected route detail */}
          {selectedRoute && (
            <div id="route-detail" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {selectedRoute.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    {selectedRoute.duration != null && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {fmtDuration(selectedRoute.duration)} &nbsp;·&nbsp;
                      </>
                    )}
                    {selectedRoute.distance != null && fmtDistance(selectedRoute.distance)}
                    {selectedRoute.duration == null && selectedRoute.distance == null && (
                      <span className="text-slate-400">Distance and time data unavailable</span>
                    )}
                  </p>
                </div>
                <div className={`text-right text-xs font-bold ${aqiColor(selectedRoute.average_aqi)}`}>
                  {selectedRoute.average_aqi != null
                    ? <>AQI {selectedRoute.average_aqi} · {aqiLabel(selectedRoute.average_aqi)}</>
                    : 'AQI unavailable'}
                </div>
              </div>

              {/* Exposure stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={<Wind className="w-4 h-4 text-emerald-600" />}
                  label="Avg PM2.5"
                  value={selectedRoute.average_pm25 != null ? `${selectedRoute.average_pm25} µg/m³` : 'N/A'}
                  sub={selectedRoute.exposure_status === 'estimated' ? 'estimate' : selectedRoute.exposure_status}
                />
                <StatCard
                  icon={<Zap className="w-4 h-4 text-amber-500" />}
                  label="Inhaled PM2.5"
                  value={selectedRoute.pm25_exposure_ug != null ? `${selectedRoute.pm25_exposure_ug.toFixed(1)} µg` : 'N/A'}
                  sub="estimated mass"
                />
                <StatCard
                  icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  label="Data Coverage"
                  value={`${Math.round(selectedRoute.aqi_data_coverage * 100)}%`}
                  sub="of route sampled"
                />
                <StatCard
                  icon={<Info className="w-4 h-4 text-sky-500" />}
                  label="AQI Source"
                  value={selectedRoute.aqi_source || 'N/A'}
                  sub={selectedRoute.exposure_status}
                />
              </div>

              {/* Turn-by-turn */}
              {selectedRoute.steps.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-3">Turn-by-turn directions</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedRoute.steps.slice(0, 12).map((step, i) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{step.instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison note */}
              {fastest && fastest.id !== selectedRoute.id && (
                <p className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-2 bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-500" />
                  <span>
                    Fastest alternative: {fmtDuration(fastest.duration)}.
                    {selectedRoute.exposure_reduction_pct != null
                      ? ` This route has ${selectedRoute.exposure_reduction_pct > 0 ? `${selectedRoute.exposure_reduction_pct}% more` : `${Math.abs(selectedRoute.exposure_reduction_pct)}% less`} estimated PM2.5 exposure than the cleanest route.`
                      : ' Exposure comparison unavailable — insufficient AQI data for one or both routes.'}
                  </span>
                </p>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
                ⚠ Inhaled mass is a rough estimate based on documented breathing rates (driving: 3 L/min effective, cycling: 40 L/min, walking: 15 L/min) and does not represent a clinical lung-dose measurement.
                AQI values marked &quot;estimate&quot; are sourced from Open-Meteo meteorological models and may not reflect local sensor readings.
                Data freshness: {selectedRoute.aqi_source}.
              </p>
            </div>
          )}

          {/* AQI-only detail panel (when routing failed but AQI data is present) */}
          {!selectedRoute && routingStatus === 'failed' && hasAqiData && (
            <div id="aqi-only-detail" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Air Quality at Selected Locations
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Road routing was unable to find a path between these locations, but air quality measurements are available.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {originAqi && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Origin</div>
                    <div className="flex items-baseline gap-2">
                      {originAqi.aqi != null && <span className={`text-3xl font-black ${aqiColor(originAqi.aqi)}`}>{originAqi.aqi}</span>}
                      {originAqi.pm25 != null && <span className="text-sm text-slate-600">{originAqi.pm25} µg/m³</span>}
                    </div>
                    {originAqi.aqi != null && <span className={`text-[10px] font-bold ${aqiColor(originAqi.aqi)}`}>{aqiLabel(originAqi.aqi)}</span>}
                  </div>
                )}
                {destinationAqi && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Destination</div>
                    <div className="flex items-baseline gap-2">
                      {destinationAqi.aqi != null && <span className={`text-3xl font-black ${aqiColor(destinationAqi.aqi)}`}>{destinationAqi.aqi}</span>}
                      {destinationAqi.pm25 != null && <span className="text-sm text-slate-600">{destinationAqi.pm25} µg/m³</span>}
                    </div>
                    {destinationAqi.aqi != null && <span className={`text-[10px] font-bold ${aqiColor(destinationAqi.aqi)}`}>{aqiLabel(destinationAqi.aqi)}</span>}
                  </div>
                )}
              </div>
              {routingError && (
                <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>{routingError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BEST ROUTE vs WORST ROUTE Comparison Section ── */}
      <BestVsWorstSection
        routes={routes}
        loading={loading}
        bothPointsSet={bothPointsSet}
        routingStatus={routingStatus}
        routingError={routingError}
        onSelectRoute={setSelected}
        selectedRouteIndex={selected}
      />
    </div>
  );
}

// ── StatCard helper ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900 leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 capitalize">{sub}</div>}
    </div>
  );
}

// ── Best vs Worst Route Comparison Component ──────────────────────────────────

interface BestVsWorstSectionProps {
  routes: RouteAlternative[];
  loading: boolean;
  bothPointsSet: boolean;
  routingStatus: 'ok' | 'failed' | null;
  routingError: string | null;
  onSelectRoute: (index: number) => void;
  selectedRouteIndex: number;
}

function BestVsWorstSection({
  routes,
  loading,
  bothPointsSet,
  routingStatus,
  routingError,
  onSelectRoute,
  selectedRouteIndex,
}: BestVsWorstSectionProps) {
  // Derive Best and Worst routes based on real AQI and inhaled PM2.5 exposure
  const analysis = useMemo(() => {
    if (!bothPointsSet) {
      return { status: 'waiting_for_inputs' as const };
    }
    if (loading) {
      return { status: 'loading' as const };
    }
    if (routingStatus === 'failed' || routes.length === 0) {
      return {
        status: 'no_routes' as const,
        message: routingError || 'No road network paths found between the selected coordinates.',
      };
    }
    if (routes.length === 1) {
      return {
        status: 'single_route' as const,
        singleRoute: routes[0],
      };
    }

    // Filter routes with available AQI or PM2.5 readings
    const routesWithPollution = routes.filter(
      r => r.average_aqi != null || r.average_pm25 != null
    );

    if (routesWithPollution.length < 2) {
      return {
        status: 'insufficient_aqi' as const,
        message: 'Air quality data is currently unavailable for one or more route alternatives. Cannot determine verified Best vs Worst pollution rankings without live data.',
      };
    }

    // Sort ascending: cleanest (lowest pollution) first, dirtiest (highest pollution) last
    const sorted = [...routesWithPollution].sort((a, b) => {
      const aVal = a.average_aqi ?? (a.average_pm25 != null ? Math.round(a.average_pm25) : 999);
      const bVal = b.average_aqi ?? (b.average_pm25 != null ? Math.round(b.average_pm25) : 999);
      if (aVal !== bVal) return aVal - bVal;
      const aExp = a.pm25_exposure_ug ?? 999;
      const bExp = b.pm25_exposure_ug ?? 999;
      return aExp - bExp;
    });

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const bestOrigIndex = routes.findIndex(r => r.id === best.id);
    const worstOrigIndex = routes.findIndex(r => r.id === worst.id);

    // Compute differentials
    let exposureSavingsPct: number | null = null;
    let massSavedUg: number | null = null;
    if (worst.pm25_exposure_ug != null && best.pm25_exposure_ug != null && worst.pm25_exposure_ug > 0) {
      exposureSavingsPct = Math.round(
        ((worst.pm25_exposure_ug - best.pm25_exposure_ug) / worst.pm25_exposure_ug) * 100
      );
      massSavedUg = Math.round((worst.pm25_exposure_ug - best.pm25_exposure_ug) * 10) / 10;
    } else if (worst.average_pm25 != null && best.average_pm25 != null && worst.average_pm25 > 0) {
      exposureSavingsPct = Math.round(
        ((worst.average_pm25 - best.average_pm25) / worst.average_pm25) * 100
      );
    }

    const aqiDelta =
      worst.average_aqi != null && best.average_aqi != null
        ? worst.average_aqi - best.average_aqi
        : null;

    const pm25Delta =
      worst.average_pm25 != null && best.average_pm25 != null
        ? Math.round((worst.average_pm25 - best.average_pm25) * 10) / 10
        : null;

    const timeDiffSeconds =
      worst.duration != null && best.duration != null
        ? worst.duration - best.duration
        : null;

    return {
      status: 'success' as const,
      best,
      worst,
      bestOrigIndex: bestOrigIndex >= 0 ? bestOrigIndex : 0,
      worstOrigIndex: worstOrigIndex >= 0 ? worstOrigIndex : 1,
      exposureSavingsPct,
      massSavedUg,
      aqiDelta,
      pm25Delta,
      timeDiffSeconds,
    };
  }, [bothPointsSet, loading, routingStatus, routingError, routes]);

  return (
    <section
      id="best-vs-worst-comparison"
      aria-label="Best Route versus Worst Route Comparison"
      className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-wide">
                BEST ROUTE vs WORST ROUTE
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                Corridor Analysis
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct comparison between lowest exposure and highest pollution road corridors
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time atmospheric modeling</span>
        </div>
      </div>

      {/* State: Waiting for inputs */}
      {analysis.status === 'waiting_for_inputs' && (
        <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Origin and Destination Required</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select both a start location and destination in the form above to evaluate road geometry, sample live PM2.5 levels, and generate a Best vs. Worst route comparison.
          </p>
        </div>
      )}

      {/* State: Loading */}
      {analysis.status === 'loading' && (
        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Comparing Route Alternatives…</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Fetching OSRM road paths and sampling hourly PM2.5 concentrations along each travel corridor.
          </p>
        </div>
      )}

      {/* State: No routes found */}
      {analysis.status === 'no_routes' && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Comparison Unavailable</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            {analysis.message}
          </p>
        </div>
      )}

      {/* State: Single route returned */}
      {analysis.status === 'single_route' && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-start gap-2.5 text-xs text-slate-700">
            <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Only 1 Route Alternative Available</p>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                The road routing network returned only a single viable corridor for this journey. A Best vs. Worst comparative evaluation requires at least 2 distinct alternative routes.
              </p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div>
              <div className="text-xs font-bold text-slate-900">{analysis.singleRoute.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {analysis.singleRoute.distance != null ? fmtDistance(analysis.singleRoute.distance) : 'Distance unavailable'} &nbsp;·&nbsp;
                {analysis.singleRoute.duration != null ? fmtDuration(analysis.singleRoute.duration) : 'Travel time unavailable'}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-black ${aqiColor(analysis.singleRoute.average_aqi)}`}>
                {analysis.singleRoute.average_aqi != null ? analysis.singleRoute.average_aqi : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">AVG AQI</span>
            </div>
          </div>
        </div>
      )}

      {/* State: Insufficient AQI data */}
      {analysis.status === 'insufficient_aqi' && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Air Quality Data Unavailable</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            {analysis.message}
          </p>
        </div>
      )}

      {/* State: Success with 2+ routes evaluated */}
      {analysis.status === 'success' && (
        <div className="space-y-6">
          {/* Highlight Banner: Why the Best Route is Better */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Recommended Safer Path
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Why {analysis.best.name} is Better
                  </h3>
                </div>
              </div>

              {/* Quick comparison pills */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {analysis.exposureSavingsPct != null && analysis.exposureSavingsPct > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    <TrendingDown className="w-3 h-3 text-emerald-600" />
                    {analysis.exposureSavingsPct}% less inhaled PM2.5
                  </span>
                )}
                {analysis.pm25Delta != null && analysis.pm25Delta > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-semibold">
                    <Wind className="w-3 h-3 text-emerald-600" />
                    -{analysis.pm25Delta} µg/m³ PM2.5
                  </span>
                )}
                {analysis.aqiDelta != null && analysis.aqiDelta > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-semibold">
                    -{analysis.aqiDelta} AQI points
                  </span>
                )}
                {analysis.timeDiffSeconds != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-semibold shadow-2xs">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {analysis.timeDiffSeconds === 0
                      ? 'Same travel time'
                      : analysis.timeDiffSeconds > 0
                      ? `Saves ${Math.round(analysis.timeDiffSeconds / 60)} min`
                      : `+${Math.round(Math.abs(analysis.timeDiffSeconds) / 60)} min tradeoff`}
                  </span>
                )}
              </div>
            </div>

            {/* Narrative explanation */}
            <p className="text-xs text-slate-700 leading-relaxed">
              {analysis.exposureSavingsPct != null && analysis.exposureSavingsPct > 0 ? (
                <>
                  Choosing <strong className="text-emerald-700 font-bold">{analysis.best.name}</strong> reduces your estimated inhaled particulate pollution by{' '}
                  <strong className="text-emerald-700 font-bold">{analysis.exposureSavingsPct}%</strong>
                  {analysis.massSavedUg != null && ` (~${analysis.massSavedUg} µg less particulate matter inhaled)`} compared to{' '}
                  <strong className="text-rose-700 font-bold">{analysis.worst.name}</strong>. This corridor avoids dense pollution hot-spots while maintaining efficient transit.
                </>
              ) : analysis.pm25Delta != null && analysis.pm25Delta > 0 ? (
                <>
                  <strong className="text-emerald-700 font-bold">{analysis.best.name}</strong> routes through ambient air with{' '}
                  <strong className="text-emerald-700 font-bold">{analysis.pm25Delta} µg/m³ lower PM2.5</strong> concentration than{' '}
                  <strong className="text-rose-700 font-bold">{analysis.worst.name}</strong>.
                </>
              ) : (
                <>
                  Both routes experience comparable ambient AQI along their paths. <strong className="text-emerald-700 font-bold">{analysis.best.name}</strong> is recommended for offering the optimal balance of travel duration and exposure.
                </>
              )}
            </p>
          </div>

          {/* Cards Grid: Best vs Worst */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEST ROUTE CARD */}
            <div
              className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white shadow-xs
                ${selectedRouteIndex === analysis.bestOrigIndex
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-emerald-200 hover:border-emerald-400'
                }`}
            >
              <div className="space-y-4">
                {/* Header / Badge */}
                <div className="flex justify-between items-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    SAFE ROUTE · LOWEST EXPOSURE
                  </span>
                  <button
                    onClick={() => onSelectRoute(analysis.bestOrigIndex)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors"
                  >
                    {selectedRouteIndex === analysis.bestOrigIndex ? 'Currently selected' : 'View on map →'}
                  </button>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">{analysis.best.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Corridor with minimal particulate matter density</p>
                </div>

                {/* AQI & Category Display */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Corridor Air Quality
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${aqiColor(analysis.best.average_aqi)}`}>
                        {analysis.best.average_aqi != null ? analysis.best.average_aqi : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">AQI</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md border ${aqiBadgeBg(analysis.best.average_aqi)}`}>
                      {analysis.best.aqi_category || aqiLabel(analysis.best.average_aqi)}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">PM2.5 Concentration</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {analysis.best.average_pm25 != null ? `${analysis.best.average_pm25} µg/m³` : 'Data unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Estimated Inhaled Mass</span>
                    <span className="text-sm font-bold text-emerald-700 mt-1 block">
                      {analysis.best.pm25_exposure_ug != null ? `${analysis.best.pm25_exposure_ug.toFixed(1)} µg` : 'Data unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Route Distance</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {analysis.best.distance != null ? fmtDistance(analysis.best.distance) : 'Distance unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Travel Time</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {analysis.best.duration != null ? fmtDuration(analysis.best.duration) : 'Travel time unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Timestamp & Source Footer */}
              <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate max-w-[180px]">Source: {analysis.best.aqi_source || 'Open-Meteo'}</span>
                <span>Updated: {fmtTimestamp(analysis.best.timestamp)}</span>
              </div>
            </div>

            {/* WORST ROUTE CARD */}
            <div
              className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white shadow-xs
                ${selectedRouteIndex === analysis.worstOrigIndex
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-rose-200 hover:border-rose-400'
                }`}
            >
              <div className="space-y-4">
                {/* Header / Badge */}
                <div className="flex justify-between items-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    POLLUTION WARNING · HIGHEST EXPOSURE
                  </span>
                  <button
                    onClick={() => onSelectRoute(analysis.worstOrigIndex)}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition-colors"
                  >
                    {selectedRouteIndex === analysis.worstOrigIndex ? 'Currently selected' : 'View on map →'}
                  </button>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">{analysis.worst.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Corridor with highest recorded particulate density</p>
                </div>

                {/* AQI & Category Display */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Corridor Air Quality
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${aqiColor(analysis.worst.average_aqi)}`}>
                        {analysis.worst.average_aqi != null ? analysis.worst.average_aqi : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">AQI</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md border ${aqiBadgeBg(analysis.worst.average_aqi)}`}>
                      {analysis.worst.aqi_category || aqiLabel(analysis.worst.average_aqi)}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">PM2.5 Concentration</span>
                    <span className="text-sm font-bold text-rose-700 mt-1 block">
                      {analysis.worst.average_pm25 != null ? `${analysis.worst.average_pm25} µg/m³` : 'Data unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Estimated Inhaled Mass</span>
                    <span className="text-sm font-bold text-rose-700 mt-1 block">
                      {analysis.worst.pm25_exposure_ug != null ? `${analysis.worst.pm25_exposure_ug.toFixed(1)} µg` : 'Data unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Route Distance</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {analysis.worst.distance != null ? fmtDistance(analysis.worst.distance) : 'Distance unavailable'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Travel Time</span>
                    <span className="text-sm font-bold text-slate-800 mt-1 block">
                      {analysis.worst.duration != null ? fmtDuration(analysis.worst.duration) : 'Travel time unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Timestamp & Source Footer */}
              <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate max-w-[180px]">Source: {analysis.worst.aqi_source || 'Open-Meteo'}</span>
                <span>Updated: {fmtTimestamp(analysis.worst.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

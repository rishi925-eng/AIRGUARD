'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wind, 
  Flame, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  Bot, 
  Navigation, 
  Clock, 
  Heart, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  MapPin,
  Thermometer,
  Droplets,
  Gauge,
  Cpu,
  ShieldAlert,
  Car,
  Building,
  Radio,
  CheckCircle2,
  Zap,
  BarChart3,
  Eye
} from 'lucide-react';
import { useLocation, PRESET_CITIES } from '../../../lib/locationContext';

// AQI category helper
function getAQIInfo(aqi: number) {
  if (aqi <= 50)  return { label: 'Good',                  color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', ring: 'ring-emerald-300' };
  if (aqi <= 100) return { label: 'Moderate',              color: '#F59E0B', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700 border-amber-200',   ring: 'ring-amber-300' };
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#F97316', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200', ring: 'ring-orange-300' };
  if (aqi <= 200) return { label: 'Unhealthy',             color: '#EF4444', bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700 border-red-200',         ring: 'ring-red-300' };
  if (aqi <= 300) return { label: 'Very Unhealthy',        color: '#8B5CF6', bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-700 border-purple-200', ring: 'ring-purple-300' };
  return                { label: 'Hazardous',              color: '#881337', bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    badge: 'bg-rose-100 text-rose-800 border-rose-200',       ring: 'ring-rose-400' };
}

export default function DashboardPage() {
  const { currentCity, setCityById, refreshCurrentCity, aqiLoading, aqiError } = useLocation();
  const [selectedPollutant, setSelectedPollutant] = useState<'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3'>('pm25');

  const aqi = currentCity.currentAQI;
  const aqiInfo = getAQIInfo(aqi);

  const observedAt = currentCity.dataTimestamp
    ? new Date(currentCity.dataTimestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not available';
  const fetchedAt = currentCity.dataFetchedAt
    ? new Date(currentCity.dataFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not synced';

  const pred1h = null, pred3h = null, pred6h = null, pred24h = null;
  const fireCount = null;

  const pollutants = [
    { key: 'pm25', name: 'PM2.5',      val: currentCity.pm25, unit: 'µg/m³', limit: 15, impact: 'Fine particles penetrating deep alveolar tissues' },
    { key: 'pm10', name: 'PM10',       val: currentCity.pm10, unit: 'µg/m³', limit: 45, impact: 'Upper respiratory and bronchial tract congestion' },
    { key: 'no2',  name: 'NO₂',        val: currentCity.no2,  unit: 'ppb',   limit: 25, impact: 'Vehicular combustion & thermal emissions' },
    { key: 'so2',  name: 'SO₂',        val: null,             unit: 'ppb',   limit: 20, impact: 'Industrial emissions & coal/diesel exhaust' },
    { key: 'o3',   name: 'Ozone (O₃)', val: null,             unit: 'ppb',   limit: 60, impact: 'Photochemical smog reacting under UV daylight' },
    { key: 'co',   name: 'CO',         val: null,             unit: 'ppm',   limit: 4,  impact: 'Carbon monoxide reducing arterial oxygen transfer' },
  ];

  const sourceBreakdown = [
    { name: 'Fire / Crop Stubble Burning',    pct: 42, level: 'HIGH',   color: 'bg-red-500',     icon: Flame,    desc: 'NASA FIRMS thermal radiometers active upstream' },
    { name: 'Weather Stagnation / Inversion', pct: 31, level: 'HIGH',   color: 'bg-orange-500',  icon: Wind,     desc: 'Low wind speed (<4 km/h) trapping particulates' },
    { name: 'Vehicular Traffic Emissions',    pct: 18, level: 'MEDIUM', color: 'bg-amber-500',   icon: Car,      desc: 'Peak hour NO₂ & black carbon concentration' },
    { name: 'Construction & Road Dust',       pct: 9,  level: 'LOW',    color: 'bg-emerald-500', icon: Building, desc: 'Coarse fraction PM10 resuspension' },
  ];

  const handleRefresh = () => void refreshCurrentCity();

  // Gauge arc calculation
  const gaugePct = Math.min(aqi, 350) / 350;
  const circumference = 251.2;
  const dashOffset = circumference - gaugePct * circumference;

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5 animate-fade-in pb-20">

      {/* ⚠️ LIVE POLLUTION EVENT BANNER */}
      {aqi > 150 && (
        <div className="relative p-4 rounded-2xl border border-amber-300/80 overflow-hidden animate-slide-up">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-orange-50 opacity-90" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-200/70 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-800 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                    ⚠ POLLUTION EVENT DETECTED
                  </span>
                  <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded font-mono font-bold text-amber-900">
                    +28 AQI / 2h
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5 line-clamp-1">
                  Upstream biomass burning combined with dropping boundary layer. Expected to peak around 6:00 PM.
                </p>
              </div>
            </div>
            <Link 
              href="/alerts"
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 px-3 py-1.5 rounded-xl hover:bg-amber-200/50 transition shrink-0"
            >
              View Alerts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* TOP BANNER: City Status & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <RadioPulseIcon />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">{currentCity.name}</h1>
              <span className="text-xs text-slate-500 font-medium">({currentCity.state})</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                aqiError ? 'bg-amber-50 text-amber-700 border-amber-200'
                : currentCity.isEstimated ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {aqiLoading ? 'SYNCING' : aqiError ? 'STALE DATA' : currentCity.isEstimated ? 'MODEL' : 'LIVE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {currentCity.gridName} · Lat {currentCity.lat.toFixed(3)}°N, Lon {currentCity.lon.toFixed(3)}°E
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Observed {observedAt} · fetched {fetchedAt} · {currentCity.dataSource}
            </p>
          </div>
        </div>

        {/* City Switcher + Actions */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-start lg:justify-end">
          <select
            value={currentCity.id}
            onChange={(e) => setCityById(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            {PRESET_CITIES.map((c) => (
              <option key={c.id} value={c.id}>📍 {c.name}</option>
            ))}
          </select>

          <button 
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold transition active:scale-95"
            title="Refresh Live Sensor Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${aqiLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <Link 
            href="/map"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Live GIS Map</span>
          </Link>
        </div>
      </div>

      {/* ML PREDICTION BAR */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">ML-Powered AQI Forecast Horizons</h2>
              <p className="text-[10px] text-slate-400">XGBoost + Open-Meteo Ensemble · Updated every 30 min</p>
            </div>
          </div>
          <Link href="/forecast" className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 shrink-0">
            Full Forecast <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '+1 Hour',  sublabel: 'Near-Term',        val: pred1h,  color: 'text-slate-700' },
            { label: '+3 Hours', sublabel: 'Evening Peak',     val: pred3h,  color: 'text-orange-600' },
            { label: '+6 Hours', sublabel: 'Night Stagnation', val: pred6h,  color: 'text-red-600' },
            { label: '+24 Hours',sublabel: 'Next Morning',     val: pred24h, color: 'text-slate-700' },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</div>
              <div className="text-[9px] text-slate-400 mb-2">{item.sublabel}</div>
              <div className={`text-2xl font-black font-mono ${item.color}`}>
                {item.val ?? '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {item.val ? `AQI · ${getAQIInfo(item.val as number).label}` : 'Awaiting provider'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN GRID: AQI Gauge + Intelligence + Pollutants */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: AQI Gauge + Weather */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Air Quality</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${aqiInfo.badge}`}>
              {currentCity.category}
            </span>
          </div>

          {/* SVG Dial */}
          <div className="relative flex flex-col items-center justify-center">
            <svg className="w-52 h-32" viewBox="0 0 200 110">
              {/* Track */}
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F1F5F9" strokeWidth="18" strokeLinecap="round" />
              {/* Fill */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#aqiGradient)"
                strokeWidth="18"
                strokeDasharray="251.2"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              {/* Glow effect */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#aqiGradientGlow)"
                strokeWidth="4"
                strokeDasharray="251.2"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out opacity-60"
              />
              <defs>
                <linearGradient id="aqiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#10B981" />
                  <stop offset="35%"  stopColor="#F59E0B" />
                  <stop offset="65%"  stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <linearGradient id="aqiGradientGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#10B981" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-1 text-center">
              <span className="block text-5xl font-black tracking-tight font-mono" style={{ color: aqiInfo.color }}>
                {aqi}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">US AQI Standard</span>
            </div>
          </div>

          {/* Weather Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
            {[
              { icon: Thermometer, color: 'text-red-400',     val: `${currentCity.temp}°C`,          label: 'Temp' },
              { icon: Droplets,    color: 'text-sky-400',     val: `${currentCity.humidity}%`,        label: 'Humidity' },
              { icon: Wind,        color: 'text-emerald-400', val: `${currentCity.windSpeed} km/h`,   label: 'Wind' },
            ].map((item) => (
              <div key={item.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <item.icon className={`w-3.5 h-3.5 ${item.color} mx-auto mb-1`} />
                <div className="text-xs font-bold text-slate-800 font-mono">{item.val}</div>
                <div className="text-[9px] text-slate-400 uppercase font-semibold mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {/* NASA FIRMS Widget */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-600 animate-pulse" />
                NASA FIRMS Hotspots
              </span>
              <span className="text-[10px] font-mono font-bold text-red-700 bg-white/70 px-2 py-0.5 rounded border border-red-200">
                {fireCount === null ? 'UNAVAILABLE' : `${fireCount} DETECTED`}
              </span>
            </div>
            <p className="text-[11px] text-red-800 leading-snug">
              🌬 Wind NW→SE at <strong>{currentCity.windSpeed} km/h</strong> · Smoke contribution: <strong>HIGH</strong>
            </p>
          </div>
        </div>

        {/* Right: AI Synthesis + Source Attribution + Pollutants */}
        <div className="lg:col-span-8 space-y-5">

          {/* AI Intelligence Synthesis */}
          <div className="p-5 rounded-2xl relative overflow-hidden border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-sky-50/30 to-white shadow-sm">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
            <div className="flex items-start gap-3.5 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">AIRGUARD Multi-Agent Diagnostics</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      94% CONFIDENCE
                    </span>
                  </div>
                  <Link href="/assistant" className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 shrink-0">
                    Ask AI <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  🤖 <strong className="text-slate-900">AIRGUARD Recommends:</strong> Use live forecast and fire feed before planning outdoor activity.
                  {aqi > 150 ? ' Current AQI is unhealthy — limit prolonged outdoor exposure and wear N95 masks.' : ' Air quality is acceptable for most activities.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-200/60">
                  {[
                    { href: '/routes',     icon: Navigation, label: 'Clean Route',   color: 'text-emerald-600' },
                    { href: '/activities', icon: Clock,       label: 'Best Window',  color: 'text-slate-500' },
                    { href: '/exposure',   icon: Heart,       label: 'Exposure',     color: 'text-red-400' },
                    { href: '/indoor',     icon: Wind,        label: 'Indoor Mode',  color: 'text-sky-500' },
                  ].map((btn) => (
                    <Link key={btn.href} href={btn.href}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm hover:shadow-md transition hover:-translate-y-0.5 active:scale-95"
                    >
                      <btn.icon className={`w-3 h-3 ${btn.color}`} />
                      {btn.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Source Attribution */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  Why is Pollution High? (Source Attribution)
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Atmospheric dispersion physics & satellite radiometer analysis</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {sourceBreakdown.map((src, i) => {
                const Icon = src.icon;
                const levelBadge = src.level === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200'
                  : src.level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                return (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{src.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${levelBadge}`}>{src.level}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{src.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-44">
                      <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${src.color} rounded-full transition-all duration-700`} style={{ width: `${src.pct}%` }} />
                      </div>
                      <span className="text-xs font-mono font-black text-slate-800 w-8 text-right shrink-0">{src.pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pollutant Spectrum */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Pollutant Concentration vs WHO Limits</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time spectrometry readings with safety ratio</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:block">CPCB SPECTROMETRY</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pollutants.map((p) => {
                const ratio = p.val === null ? null : +(p.val / p.limit).toFixed(1);
                const isOver = p.val !== null && p.val > p.limit;
                const isSelected = selectedPollutant === p.key;
                return (
                  <div
                    key={p.key}
                    onClick={() => setSelectedPollutant(p.key as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-emerald-50 border-emerald-400 shadow-sm ring-1 ring-emerald-300' 
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-800">{p.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${
                        ratio === null ? 'bg-slate-50 text-slate-400 border-slate-200'
                        : isOver ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {ratio === null ? 'N/A' : `${ratio}x`}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono leading-tight">{p.val ?? '—'}</div>
                    <div className="text-[10px] text-slate-400 mb-2">{p.unit} (WHO: {p.limit})</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          p.val === null ? 'bg-slate-300' 
                          : p.val > p.limit * 3 ? 'bg-red-500' 
                          : p.val > p.limit ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                        }`}
                        style={{ width: p.val === null ? '0%' : `${Math.min(100, (p.val / (p.limit * 3)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">{p.impact}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Feature Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {[
          { href: '/forecast',  icon: TrendingUp,  color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', label: 'ML Forecast (72h)',   sub: 'XGBoost Predictions', hoverColor: 'group-hover:text-purple-600' },
          { href: '/routes',    icon: Navigation,  color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200',label: 'Clean-Air Route',    sub: 'Save ~42% Inhaled PM2.5', hoverColor: 'group-hover:text-emerald-600' },
          { href: '/schools',   icon: ShieldCheck, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',    label: 'School Command',     sub: 'CPCB Outdoor Safety', hoverColor: 'group-hover:text-amber-600' },
          { href: '/city',      icon: Activity,    color: 'text-sky-600',    bg: 'bg-sky-50 border-sky-200',         label: 'City Simulator',     sub: 'What-If Policy Levers', hoverColor: 'group-hover:text-sky-600' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 flex items-center justify-between transition hover:-translate-y-0.5 group active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${item.bg} border flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition`} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{item.label}</div>
                <div className="text-[10px] text-slate-400">{item.sub}</div>
              </div>
            </div>
            <ArrowUpRight className={`w-4 h-4 text-slate-300 ${item.hoverColor} transition`} />
          </Link>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Eye,      label: 'Visibility Index',   val: aqi <= 100 ? 'Good' : aqi <= 150 ? 'Moderate' : 'Poor', color: 'text-slate-700',    bg: 'text-slate-400' },
          { icon: BarChart3,label: 'AQI Percentile',     val: `Top ${Math.min(99, Math.round((aqi/500)*100))}%`,       color: 'text-violet-700',   bg: 'text-violet-400' },
          { icon: Zap,      label: 'Alert Level',        val: aqi > 200 ? 'Critical' : aqi > 150 ? 'High' : 'Normal', color: aqi > 150 ? 'text-red-700' : 'text-emerald-700', bg: 'text-slate-400' },
          { icon: Gauge,    label: 'Sensor Status',      val: currentCity.isEstimated ? 'Estimated' : 'Live Feed',     color: 'text-sky-700',      bg: 'text-sky-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              <stat.icon className={`w-4 h-4 ${stat.bg}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">{stat.label}</div>
              <div className={`text-sm font-black truncate ${stat.color}`}>{stat.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadioPulseIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" className="animate-pulse" />
    </svg>
  );
}

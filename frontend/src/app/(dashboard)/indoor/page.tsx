'use client';

import React, { useState } from 'react';
import { 
  Wind, 
  Power, 
  Cpu,
  CheckCircle2,
  Gauge,
  Sparkles,
  ShieldCheck,
  Zap,
  Sliders,
  AlertTriangle,
  Fan,
  RefreshCw,
  Home
} from 'lucide-react';
import { useLocation } from '../../../lib/locationContext';

export default function IndoorPage() {
  const { currentCity } = useLocation();
  const [purifierOn, setPurifierOn] = useState(true);
  const [fanMode, setFanMode] = useState<'auto' | 'sleep' | 'turbo'>('auto');
  const [fanSpeed, setFanSpeed] = useState(75);

  const outdoorAQI = currentCity.currentAQI;
  const outdoorPM25 = currentCity.pm25;

  const indoorPM25 = purifierOn ? (fanMode === 'turbo' ? 7.4 : fanMode === 'sleep' ? 16.2 : 12.8) : outdoorPM25 * 0.72;
  const indoorAQI = Math.round(indoorPM25 * 2.1);
  const filterLifePct = 82;
  const cleanRatio = (outdoorPM25 / Math.max(1, indoorPM25)).toFixed(1);

  return (
    <div className="w-full min-w-0 space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                IOT HARDWARE TELEMETRY
              </span>
              <span className="text-[11px] text-slate-500 font-mono font-semibold">
                ESP32 • AWS IOT CORE MQTT (TLS 1.3)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1.5">
              Indoor Air Quality & Smart Purifier Automation
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live particulate spectrometry from your living room ESP32 node (PMS5003 + NDIR CO₂) and automated HEPA filtration controller in <strong className="text-slate-800">{currentCity.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch lg:self-auto justify-end">
            <button
              onClick={() => setPurifierOn(!purifierOn)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                purifierOn 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{purifierOn ? 'HEPA PURIFIER ON' : 'HEPA PURIFIER OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ⚖️ INDOOR VS OUTDOOR DIFFERENTIAL RADAR CARD */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>Indoor vs Outdoor Microclimate Differential</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time isolation ratio: Living Room Sensor Node #01 vs Ambient CPCB Node</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
            INDOOR AIR IS {cleanRatio}x CLEANER
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Indoor Card */}
          <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-emerald-600" />
                <span>Indoor Environment (ESP32)</span>
              </span>
              <div className="text-4xl font-black text-emerald-700 font-mono mt-2">
                {indoorAQI} <span className="text-sm font-bold text-emerald-600">AQI (Good 🟢)</span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 font-medium">
                PM2.5: <strong>{indoorPM25} µg/m³</strong> • WHO Annual Compliant
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
              ✓
            </div>
          </div>

          {/* Outdoor Card */}
          <div className="p-6 rounded-2xl bg-red-50/70 border border-red-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-red-600" />
                <span>Outdoor Ambient ({currentCity.name})</span>
              </span>
              <div className="text-4xl font-black text-red-700 font-mono mt-2">
                {outdoorAQI} <span className="text-sm font-bold text-red-600">AQI ({currentCity.category})</span>
              </div>
              <p className="text-xs text-red-800 mt-1 font-medium">
                PM2.5: <strong>{outdoorPM25} µg/m³</strong> • Keep windows sealed
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
              ⚠
            </div>
          </div>
        </div>

        {/* AI Action Directive */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-300">Smart Purifier Directive:</strong> Outdoor air is currently <strong>{cleanRatio}x more toxic</strong>. HEPA Purifier set to <strong>Auto-Boost Mode ({fanSpeed}% RPM)</strong>. Keep all windows and balcony doors sealed.
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Indoor PM2.5</span>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            {indoorPM25} <span className="text-xs font-normal text-slate-400">µg/m³</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            WHO Safe (&lt;15 µg/m³)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">NDIR CO₂ Sensor</span>
          <div className="text-3xl font-black text-slate-900 font-mono">
            580 <span className="text-xs font-normal text-slate-400">ppm</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
            Optimal Cognitive Focus
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">TVOC Gas Index</span>
          <div className="text-3xl font-black text-slate-900 font-mono">
            94 <span className="text-xs font-normal text-slate-400">ppb</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-medium bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
            Ultra-Clean Ambient
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">H13 HEPA Filter Life</span>
          <div className="text-3xl font-black text-sky-600 font-mono">{filterLifePct}%</div>
          <div className="inline-flex items-center gap-1.5 text-xs text-sky-700 font-medium bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
            Good for 1,420 operating hours
          </div>
        </div>
      </div>

      {/* Purifier Remote Console & RPM Calibration */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Fan className="w-4 h-4 text-emerald-600" />
            <span>Purifier Operating Preset</span>
          </h2>
          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            AWS IoT Shadow Sync
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['auto', 'sleep', 'turbo'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setFanMode(m);
                if (m === 'turbo') setFanSpeed(100);
                else if (m === 'sleep') setFanSpeed(25);
                else setFanSpeed(75);
              }}
              className={`p-4 rounded-2xl border text-center font-bold text-xs uppercase tracking-wider transition-all active:scale-95 ${
                fanMode === m 
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              Mode: {m} ({m === 'turbo' ? '100% RPM' : m === 'sleep' ? '25% RPM' : 'Auto 75% RPM'})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

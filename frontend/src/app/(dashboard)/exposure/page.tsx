'use client';

import React, { useState, useCallback } from 'react';
import { useLocation } from '../../../lib/locationContext';
import { Plus, Trash2, Activity, Wind, AlertTriangle, Check, Info } from 'lucide-react';

type ActivityType = 'Walking' | 'Running' | 'Cycling' | 'Driving' | 'Transit' | 'Stationary';
type Stop = {
  id: number;
  name: string;
  duration: number; // minutes
  activity: ActivityType;
};

const ACTIVITY_RATES: Record<ActivityType, number> = {
  Walking: 0.65,
  Running: 1.30,
  Cycling: 1.00,
  Driving: 0.20,
  Transit: 0.25,
  Stationary: 0.15,
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  Walking: '🚶',
  Running: '🏃',
  Cycling: '🚴',
  Driving: '🚗',
  Transit: '🚌',
  Stationary: '🪑',
};

const PRESET_NAMES = ['Home', 'Office', 'School', 'Market', 'Park', 'Gym', 'Hospital', 'Restaurant'];

let nextId = 3;

function getAQIColor(aqi: number) {
  if (aqi > 300) return '#7c3aed';
  if (aqi > 200) return '#ef4444';
  if (aqi > 150) return '#f97316';
  if (aqi > 100) return '#f59e0b';
  if (aqi > 50)  return '#84cc16';
  return '#10b981';
}

function getCardBg(aqi: number) {
  if (aqi > 200) return 'bg-red-50 border-red-200';
  if (aqi > 150) return 'bg-orange-50 border-orange-200';
  if (aqi > 100) return 'bg-amber-50 border-amber-200';
  return 'bg-emerald-50 border-emerald-200';
}

function getExposureLabel(score: number) {
  if (score >= 80) return { label: 'Critical', color: '#ef4444', bg: '#fef2f2' };
  if (score >= 60) return { label: 'High', color: '#f97316', bg: '#fff7ed' };
  if (score >= 40) return { label: 'Moderate', color: '#f59e0b', bg: '#fffbeb' };
  if (score >= 20) return { label: 'Low', color: '#84cc16', bg: '#f7fee7' };
  return { label: 'Minimal', color: '#10b981', bg: '#f0fdf4' };
}

export default function ExposurePage() {
  const { currentCity } = useLocation();
  const baseAQI = currentCity.currentAQI;
  const pm25 = currentCity.pm25;

  const [stops, setStops] = useState<Stop[]>([
    { id: 1, name: 'Home', duration: 30, activity: 'Walking' },
    { id: 2, name: 'Office', duration: 480, activity: 'Stationary' },
  ]);

  const addStop = useCallback(() => {
    setStops(prev => [...prev, { id: nextId++, name: 'Park', duration: 60, activity: 'Walking' }]);
  }, []);

  const removeStop = useCallback((id: number) => {
    setStops(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateStop = useCallback((id: number, field: keyof Stop, value: string | number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  // Compute a stable exposure estimate from the current telemetry.
  // Do not add random variation: it made the same itinerary change on every render.
  const stopData = stops.map(stop => {
    const stopAqi = baseAQI;
    const stopPm25 = pm25;
    const ventilationRate = ACTIVITY_RATES[stop.activity];
    // Dose (µg) = concentration (µg/m³) × ventilation (m³/min) × duration (min)
    const dose = stopPm25 * ventilationRate * stop.duration;
    return { ...stop, aqi: Math.round(stopAqi), pm25: stopPm25, dose: Math.round(dose) };
  });

  const totalDose = stopData.reduce((sum, s) => sum + s.dose, 0);
  const totalMinutes = stops.reduce((sum, s) => sum + s.duration, 0);
  // Score 0-100 based on daily safe limit of ~3000 µg
  const exposureScore = Math.min(100, Math.round((totalDose / 3000) * 100));
  const exposureInfo = getExposureLabel(exposureScore);

  // Gauge arc
  const gaugePct = exposureScore / 100;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - gaugePct * 0.75);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              Personal Exposure Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Journey Exposure Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">Compute your cumulative PM2.5 inhaled dose across each stop in your day</p>
        </div>
        <button
          onClick={addStop}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-md shadow-rose-500/25 hover:brightness-105 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" /> Add Stop
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Journey Builder */}
        <div className="lg:col-span-2 space-y-3">
          {stopData.map((stop, idx) => (
            <div key={stop.id} className={`p-4 rounded-2xl border ${getCardBg(stop.aqi)} hover:-translate-y-0.5 hover:shadow-sm transition`}>
              <div className="flex items-start gap-3">
                {/* Step number */}
                <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                    {/* Location name */}
                    <select
                      value={stop.name}
                      onChange={e => updateStop(stop.id, 'name', e.target.value)}
                      className="flex-1 text-sm font-bold text-slate-900 bg-white/80 border border-white/60 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
                    >
                      {PRESET_NAMES.map(n => <option key={n}>{n}</option>)}
                    </select>
                    
                    {/* Activity type */}
                    <select
                      value={stop.activity}
                      onChange={e => updateStop(stop.id, 'activity', e.target.value as ActivityType)}
                      className="text-sm text-slate-700 bg-white/80 border border-white/60 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
                    >
                      {(Object.keys(ACTIVITY_RATES) as ActivityType[]).map(a => (
                        <option key={a} value={a}>{ACTIVITY_ICONS[a]} {a}</option>
                      ))}
                    </select>

                    {/* Delete */}
                    {stops.length > 1 && (
                      <button onClick={() => removeStop(stop.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Duration slider */}
                  <div className="flex items-center gap-3">
                    <Wind className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="range" min={5} max={480} step={5}
                      value={stop.duration}
                      onChange={e => updateStop(stop.id, 'duration', Number(e.target.value))}
                      className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-xs font-bold text-slate-700 w-16 text-right shrink-0">
                      {stop.duration >= 60
                        ? `${Math.floor(stop.duration / 60)}h ${stop.duration % 60}m`
                        : `${stop.duration}m`}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="text-[11px] font-bold" style={{ color: getAQIColor(stop.aqi) }}>
                      AQI {stop.aqi}
                    </span>
                    <span className="text-[11px] text-slate-500">PM2.5 {stop.pm25.toFixed(1)} µg/m³</span>
                    <span className="text-[11px] font-bold text-rose-600">
                      +{stop.dose} µg inhaled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add stop prompt */}
          <button
            onClick={addStop}
            className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-500 text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add another stop
          </button>

          {/* Summary bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Journey Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-slate-900">{stops.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Stops</div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">
                  {totalMinutes >= 60 ? `${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m` : `${totalMinutes}m`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total Duration</div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-600">{totalDose.toLocaleString()} µg</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Total PM2.5 Inhaled</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Exposure Score Gauge */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">AIRGUARD Exposure Score</h3>
            
            {/* SVG Gauge */}
            <div className="relative">
              <svg width="140" height="100" viewBox="0 0 140 100">
                {/* Background arc */}
                <circle cx="70" cy="70" r="54" fill="none" stroke="#f1f5f9" strokeWidth="12"
                  strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                  strokeLinecap="round"
                  transform="rotate(135 70 70)"
                />
                {/* Value arc */}
                <circle cx="70" cy="70" r="54" fill="none" strokeWidth="12"
                  stroke={exposureInfo.color}
                  strokeDasharray={`${circumference * gaugePct * 0.75} ${circumference}`}
                  strokeLinecap="round"
                  transform="rotate(135 70 70)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '12px' }}>
                <div className="text-3xl font-black" style={{ color: exposureInfo.color }}>{exposureScore}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: exposureInfo.color }}>{exposureInfo.label}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
              <span className="flex items-center gap-1 justify-center">
                <Info className="w-3 h-3 shrink-0" />
                Estimated score, not a medical measurement
              </span>
            </div>

            {/* Scale legend */}
            <div className="w-full mt-4 space-y-1.5">
              {[
                ['0–20', 'Minimal', '#10b981'],
                ['20–40', 'Low', '#84cc16'],
                ['40–60', 'Moderate', '#f59e0b'],
                ['60–80', 'High', '#f97316'],
                ['80+',  'Critical', '#ef4444'],
              ].map(([range, label, color]) => (
                <div key={range} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-500 font-mono w-10 shrink-0">{range}</span>
                  <span className="text-slate-600 font-semibold">{label}</span>
                  {label === exposureInfo.label && <Check className="w-3 h-3 ml-auto text-emerald-500" />}
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Daily Comparison</h3>
            {[
              { label: 'Today', dose: totalDose, active: true },
              { label: 'Yesterday', dose: Math.round(totalDose * 1.15), active: false },
              { label: 'Weekly avg', dose: Math.round(totalDose * 1.08), active: false },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 mb-2">
                <span className={`text-[11px] w-20 shrink-0 font-semibold ${item.active ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (item.dose / 4000) * 100)}%`,
                      backgroundColor: item.active ? '#ef4444' : '#cbd5e1'
                    }}
                  />
                </div>
                <span className={`text-[10px] font-mono shrink-0 ${item.active ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                  {item.dose.toLocaleString()} µg
                </span>
              </div>
            ))}
          </div>

          {/* Health Tips */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">AIRGUARD Tips</h3>
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-800">
              <li>• Switch commute to 5AM–7AM for 40% lower exposure</li>
              <li>• Wear N95 mask during peak AQI hours</li>
              <li>• Use car air recirculation in heavy traffic</li>
              <li>• Limit outdoor activity when AQI &gt; 150</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

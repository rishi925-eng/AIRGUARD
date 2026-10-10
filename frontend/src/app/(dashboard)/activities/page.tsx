'use client';

import React, { useState, useMemo } from 'react';
import { useLocation } from '../../../lib/locationContext';
import { 
  PersonStanding, Bike, Footprints, Trophy, Dumbbell, Waves, 
  CheckCircle2, AlertTriangle, XCircle, Clock, Wind, Zap
} from 'lucide-react';

type Activity = 'Running' | 'Cycling' | 'Walking' | 'Football' | 'Outdoor Workout' | 'Swimming';
type HealthGroup = 'Healthy Adult' | 'Child' | 'Elderly' | 'Asthma';
type Intensity = 'Light' | 'Moderate' | 'Intense';

const ACTIVITIES: { id: Activity; icon: React.ComponentType<{ className?: string }>; emoji: string; aqiLimit: Record<Intensity, number> }[] = [
  { id: 'Running',         icon: PersonStanding, emoji: '🏃',  aqiLimit: { Light: 100, Moderate: 75, Intense: 50 } },
  { id: 'Cycling',         icon: Bike,          emoji: '🚴',  aqiLimit: { Light: 120, Moderate: 90, Intense: 60 } },
  { id: 'Walking',         icon: Footprints,    emoji: '🚶',  aqiLimit: { Light: 150, Moderate: 120, Intense: 90 } },
  { id: 'Football',        icon: Trophy,        emoji: '⚽',  aqiLimit: { Light: 100, Moderate: 75, Intense: 50 } },
  { id: 'Outdoor Workout', icon: Dumbbell,      emoji: '💪',  aqiLimit: { Light: 120, Moderate: 90, Intense: 60 } },
  { id: 'Swimming',        icon: Waves,         emoji: '🏊',  aqiLimit: { Light: 150, Moderate: 150, Intense: 100 } },
];

const HEALTH_SENSITIVITY: Record<HealthGroup, number> = {
  'Healthy Adult': 1.0,
  'Child': 0.7,
  'Elderly': 0.65,
  'Asthma': 0.5,
};

function getAQIColor(aqi: number) {
  if (aqi > 300) return '#7c3aed';
  if (aqi > 200) return '#ef4444';
  if (aqi > 150) return '#f97316';
  if (aqi > 100) return '#f59e0b';
  if (aqi > 50)  return '#84cc16';
  return '#10b981';
}

export default function ActivitiesPage() {
  const { currentCity } = useLocation();
  const baseAQI = currentCity.currentAQI;
  
  const [selectedActivity, setSelectedActivity] = useState<Activity>('Running');
  const [healthGroup, setHealthGroup] = useState<HealthGroup>('Healthy Adult');
  const [intensity, setIntensity] = useState<Intensity>('Moderate');

  // 24h AQI data
  const hourlyAQI = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const diurnal = Math.sin((i - 6) * (Math.PI / 12));
      return Math.max(10, Math.round(baseAQI + diurnal * 55));
    });
  }, [baseAQI]);

  const currentActivityDef = ACTIVITIES.find(a => a.id === selectedActivity)!;
  const sensitivityFactor = HEALTH_SENSITIVITY[healthGroup];
  const rawLimit = currentActivityDef.aqiLimit[intensity];
  const adjustedLimit = Math.round(rawLimit * sensitivityFactor);

  const isGolden = (aqi: number) => aqi <= adjustedLimit;

  const verdict = (() => {
    if (baseAQI <= adjustedLimit * 0.75) return { status: 'Safe', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600', message: `Great conditions for ${selectedActivity}! Air quality is within safe limits for ${healthGroup.toLowerCase()}.` };
    if (baseAQI <= adjustedLimit) return { status: 'Caution', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600', message: `Use caution. Consider wearing N95 mask and reducing duration for ${intensity.toLowerCase()} ${selectedActivity.toLowerCase()}.` };
    return { status: 'Not Recommended', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-600', message: `Air quality is too poor for ${selectedActivity} at ${intensity.toLowerCase()} intensity. Postpone or stay indoors.` };
  })();

  // Golden windows
  const goldenWindows = hourlyAQI
    .map((aqi, i) => ({ hour: i, aqi, golden: isGolden(aqi) }))
    .filter(h => h.golden)
    .reduce<{ start: number; end: number }[]>((acc, h) => {
      if (!acc.length || h.hour > acc[acc.length - 1].end + 1) {
        acc.push({ start: h.hour, end: h.hour });
      } else {
        acc[acc.length - 1].end = h.hour;
      }
      return acc;
    }, []);

  const bestWindow = goldenWindows[0];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Smart Activity Planner
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Outdoor Activity Safety Guide</h1>
        <p className="text-sm text-slate-500 mt-0.5">{currentCity.name} · Current AQI <span className="font-bold" style={{ color: getAQIColor(baseAQI) }}>{baseAQI}</span> · Find safe windows for your activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Selectors + Verdict */}
        <div className="space-y-4">
          {/* Activity Grid */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Select Activity</h2>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITIES.map(({ id, icon: Icon, emoji }) => (
                <button
                  key={id}
                  onClick={() => setSelectedActivity(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                    selectedActivity === id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-[10px] text-center leading-tight">{id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Health Group */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Health Group</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['Healthy Adult', 'Child', 'Elderly', 'Asthma'] as HealthGroup[]).map(g => (
                <button
                  key={g}
                  onClick={() => setHealthGroup(g)}
                  className={`p-2.5 rounded-xl border text-[11px] font-semibold transition active:scale-95 text-left ${
                    healthGroup === g
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {g === 'Healthy Adult' ? '💪 ' : g === 'Child' ? '🧒 ' : g === 'Elderly' ? '👴 ' : '🫁 '}{g}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Intensity Level</h2>
            <div className="flex gap-2">
              {(['Light', 'Moderate', 'Intense'] as Intensity[]).map(lv => (
                <button
                  key={lv}
                  onClick={() => setIntensity(lv)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    intensity === lv
                      ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  {lv === 'Light' ? '🌿' : lv === 'Moderate' ? '⚡' : '🔥'} {lv}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 24h Timeline + Verdict */}
        <div className="lg:col-span-2 space-y-4">
          {/* AIRGUARD Verdict Card */}
          <div className={`p-5 rounded-2xl border ${verdict.bg} ${verdict.border}`}>
            <div className="flex items-start gap-3">
              <verdict.icon className={`w-6 h-6 ${verdict.iconColor} mt-0.5 shrink-0`} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-base font-black ${verdict.color}`}>
                    {verdict.status}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-full">
                    AIRGUARD AI Verdict
                  </span>
                </div>
                <p className="text-sm text-slate-700">{verdict.message}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-500"><Zap className="w-3 h-3" /> Safe AQI limit for you: <strong>{adjustedLimit}</strong></span>
                  <span className="flex items-center gap-1 text-slate-500"><Wind className="w-3 h-3" /> Current AQI: <strong style={{ color: getAQIColor(baseAQI) }}>{baseAQI}</strong></span>
                  {bestWindow && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <Clock className="w-3 h-3" /> Best window: {String(bestWindow.start).padStart(2,'0')}:00 – {String(bestWindow.end + 1).padStart(2,'0')}:00
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 24h Timeline */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">24-Hour AQI Timeline</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Golden Windows</span> — AQI below your safe limit ({adjustedLimit})
                </p>
              </div>
            </div>

            {/* Timeline bars */}
            <div className="flex items-end gap-0.5 h-28">
              {hourlyAQI.map((aqi, i) => {
                const golden = isGolden(aqi);
                const heightPct = Math.min(100, (aqi / 400) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${String(i).padStart(2,'0')}:00 — AQI ${aqi}`}>
                    <div className="relative flex-1 w-full flex items-end">
                      <div
                        className={`w-full rounded-t transition ${golden ? 'opacity-100' : 'opacity-50'}`}
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: golden ? '#10b981' : getAQIColor(aqi),
                          minHeight: '4px'
                        }}
                      />
                      {golden && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-300 animate-pulse" />
                      )}
                    </div>
                    {i % 6 === 0 && (
                      <span className="text-[8px] text-slate-400 font-mono">{String(i).padStart(2,'0')}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Limit reference line indicator */}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
              <div className="w-6 border-t-2 border-dashed border-emerald-400" />
              <span>Safe AQI limit ({adjustedLimit}) for {healthGroup} at {intensity} intensity</span>
            </div>
          </div>

          {/* Golden Windows list */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              🌟 Golden Windows Today ({goldenWindows.length} found)
            </h2>
            {goldenWindows.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> No safe windows found today for your activity profile. Consider indoor alternatives.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {goldenWindows.map((w, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <Clock className="w-3 h-3" />
                    {String(w.start).padStart(2,'0')}:00 – {String(w.end + 1).padStart(2,'0')}:00
                    <span className="text-[10px] font-medium text-emerald-500 ml-1">AQI {hourlyAQI[w.start]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface AQICardProps {
  aqi: number;
  location: string;
}

export default function AQICard({ aqi, location }: AQICardProps) {
  const getAQIInfo = (aqi: number) => {
    if (aqi <= 50) {
      return { level: 'Good', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', numColor: 'text-emerald-600' };
    } else if (aqi <= 100) {
      return { level: 'Moderate', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200', numColor: 'text-amber-600' };
    } else if (aqi <= 150) {
      return { level: 'Sensitive Groups', badgeColor: 'bg-orange-50 text-orange-700 border-orange-200', numColor: 'text-orange-600' };
    } else if (aqi <= 200) {
      return { level: 'Unhealthy', badgeColor: 'bg-red-50 text-red-700 border-red-200', numColor: 'text-red-600' };
    } else if (aqi <= 300) {
      return { level: 'Very Unhealthy', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', numColor: 'text-purple-600' };
    } else {
      return { level: 'Hazardous', badgeColor: 'bg-rose-50 text-rose-800 border-rose-200', numColor: 'text-rose-700' };
    }
  };

  const info = getAQIInfo(aqi);

  return (
    <div className="rounded-2xl p-6 border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Current AQI</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.badgeColor}`}>
          {info.level}
        </span>
      </div>
      <div className={`text-5xl font-black font-mono mb-2 ${info.numColor}`}>{aqi}</div>
      <div className="text-xs text-slate-500 font-medium">{location}</div>
    </div>
  );
}

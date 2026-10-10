'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  MapPin, 
  Bot, 
  Navigation, 
  ShieldAlert, 
  TrendingUp, 
  Building2, 
  GraduationCap, 
  Activity, 
  X, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { useLocation, PRESET_CITIES } from '../lib/locationContext';

export default function CommandPalette() {
  const router = useRouter();
  const { isCommandPaletteOpen, setCommandPaletteOpen, setCityById, currentCity } = useLocation();
  const [query, setQuery] = useState('');

  if (!isCommandPaletteOpen) return null;

  const quickLinks = [
    { title: 'Live Pollution Map & Heatmap', path: '/map', icon: Navigation, badge: 'GIS View' },
    { title: 'ML Multi-Horizon Forecast (72h)', path: '/forecast', icon: TrendingUp, badge: 'XGBoost+LSTM' },
    { title: 'Clean-Air Navigation Routing', path: '/routes', icon: Navigation, badge: 'Inhaled Dose' },
    { title: 'Personal Inhaled Exposure Engine', path: '/exposure', icon: Activity, badge: 'Health Risk' },
    { title: 'Predictive AQI Spike Alerts', path: '/alerts', icon: ShieldAlert, badge: 'Early Warning' },
    { title: 'Ask AIRGUARD AI Assistant', path: '/assistant', icon: Bot, badge: 'Strands Orchestrator' },
    { title: 'School Safety Dashboard', path: '/schools', icon: GraduationCap, badge: 'Assembly Index' },
    { title: 'City Policy What-If Simulator', path: '/city', icon: Building2, badge: 'Municipal Deck' },
    { title: 'Citizen Incident Reports', path: '/reports', icon: ShieldAlert, badge: 'Crowdsourced' },
    { title: 'Indoor IoT Purifier Automation', path: '/indoor', icon: Activity, badge: 'ESP32 Stream' },
    { title: 'Big Data Atmospheric Analytics', path: '/analytics', icon: TrendingUp, badge: 'Diurnal Trends' },
  ];

  const filteredCities = PRESET_CITIES.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.state.toLowerCase().includes(query.toLowerCase()) ||
    c.gridName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredLinks = quickLinks.filter(l => 
    l.title.toLowerCase().includes(query.toLowerCase()) ||
    l.badge.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectCity = (cityId: string) => {
    setCityById(cityId);
    setCommandPaletteOpen(false);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setCommandPaletteOpen(false);
  };

  const handleAskAI = () => {
    router.push('/assistant?q=' + encodeURIComponent(query));
    setCommandPaletteOpen(false);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-white">
          <Search className="w-5 h-5 text-emerald-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, city (e.g. Delhi, Mumbai), or ask AIRGUARD AI..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto p-3 space-y-4">
          {query.trim().length > 2 && (
            <button
              onClick={handleAskAI}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-300 text-left transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    Ask AI Agent Orchestrator
                  </div>
                  <div className="text-xs text-slate-600 truncate max-w-md">
                    &ldquo;{query}&rdquo;
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
            </button>
          )}

          {filteredLinks.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Navigation & Features
              </div>
              <div className="space-y-1">
                {filteredLinks.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition text-slate-700 group border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                        <span className="text-sm font-medium text-slate-800">{item.title}</span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500">
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredCities.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Regional Stations & Grids
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredCities.map((city) => {
                  const isSelected = city.id === currentCity.id;
                  const aqiColor = city.currentAQI > 200 ? 'text-red-700 bg-red-50 border-red-200' : 
                                  city.currentAQI > 150 ? 'text-orange-700 bg-orange-50 border-orange-200' : 
                                  city.currentAQI > 100 ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                                  'text-emerald-700 bg-emerald-50 border-emerald-200';

                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city.id)}
                      className={'flex items-center justify-between p-2.5 rounded-xl border text-left transition ' + (
                        isSelected 
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <MapPin className={'w-3.5 h-3.5 ' + (isSelected ? 'text-emerald-600' : 'text-slate-400')} />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate">{city.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{city.state}</div>
                        </div>
                      </div>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded border font-mono ' + aqiColor}>
                        AQI {city.currentAQI}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="font-mono px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">ESC</kbd> to close</span>
          </div>
          <span className="text-emerald-600 font-mono font-bold">AIRGUARD v2.4</span>
        </div>
      </div>
    </div>
  );
}

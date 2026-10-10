'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  MapPin, 
  Search, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  Menu,
  Wifi,
  Bell,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useLocation, PRESET_CITIES } from '../lib/locationContext';

export default function Header({ onOpenMobileNav, sidebarCollapsed }: { 
  onOpenMobileNav: () => void; 
  sidebarCollapsed: boolean;
}) {
  const { 
    currentCity, 
    setCityById, 
    soundEnabled, 
    setSoundEnabled, 
    setCommandPaletteOpen,
    playSpikeChime,
    refreshCurrentCity,
    aqiLoading,
    aqiError
  } = useLocation();

  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState('Syncing...');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const aqi = currentCity.currentAQI;
  const aqiBadge =
    aqi > 200 ? 'bg-red-500/25 text-red-300 border-red-500/40' :
    aqi > 150 ? 'bg-orange-500/25 text-orange-300 border-orange-500/40' :
    aqi > 100 ? 'bg-amber-500/25 text-amber-300 border-amber-500/40' :
    aqi > 50  ? 'bg-sky-500/25 text-sky-300 border-sky-500/40' :
                'bg-emerald-500/25 text-emerald-300 border-emerald-500/40';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (currentCity.dataFetchedAt) {
      setLastSynced(new Date(currentCity.dataFetchedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }));
    } else if (aqiLoading) {
      setLastSynced('Syncing...');
    } else if (aqiError) {
      setLastSynced('Unavailable');
    }
  }, [currentCity.dataFetchedAt, aqiError, aqiLoading]);

  const handleSync = async () => {
    await refreshCurrentCity();
  };

  return (
    <header
      className={`
        border-b border-white/8 bg-[#0F172A]/95 backdrop-blur-md
        sticky top-0 z-40
        transition-[margin-left] duration-200 ease-in-out
        ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-64'}
      `}
    >
      <div className="px-4 sm:px-5 py-2 flex items-center justify-between gap-3 min-w-0 h-[60px]">

        {/* Mobile hamburger */}
        <button
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
          className="md:hidden shrink-0 p-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 transition"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Mobile brand mark */}
        <Link href="/dashboard" className="md:hidden shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-emerald-500/25">
            AG
          </div>
        </Link>

        {/* Search bar */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex-1 hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition min-w-0 group"
          style={{ maxWidth: '400px' }}
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:text-emerald-300 transition" />
          <span className="truncate text-slate-400">Search city, feature, or ask AI...</span>
          <div className="ml-auto shrink-0 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] font-mono text-slate-400">⌘K</kbd>
          </div>
        </button>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">

          {/* Last synced + sync button */}
          <button
            onClick={handleSync}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/6 border border-white/10 text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Sync live data"
          >
            <RefreshCw className={`w-3 h-3 text-emerald-400 ${aqiLoading ? 'animate-spin' : ''}`} />
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="font-mono">{lastSynced}</span>
          </button>

          {/* LIVE indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/6 border border-white/10 text-[11px] text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span
              className={`font-mono font-bold ${aqiError ? 'text-amber-400' : 'text-emerald-400'}`}
              title={aqiError || `${currentCity.dataSource}${currentCity.dataTimestamp ? ` · observed ${new Date(currentCity.dataTimestamp).toLocaleString()}` : ''}`}
            >
              {aqiLoading ? 'SYNCING' : aqiError ? 'STALE' : currentCity.isEstimated ? 'MODEL' : 'LIVE'}
            </span>
          </div>

          {/* City / AQI Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-xs text-white transition shadow-sm"
            >
              <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="font-semibold truncate max-w-[70px] sm:max-w-none">
                {currentCity.name}
              </span>
              <span className={`px-1.5 py-0.5 rounded-lg font-mono font-bold text-[10px] border shrink-0 ${aqiBadge}`}>
                {aqi}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCityDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#0F172A] border border-white/12 rounded-2xl shadow-2xl shadow-slate-950/80 p-2 z-[60] backdrop-blur-md">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 py-2 mb-1 border-b border-white/8">
                  🌍 Active Monitoring Grids
                </div>
                <div className="space-y-0.5 max-h-72 overflow-y-auto no-scrollbar">
                  {PRESET_CITIES.map((city) => {
                    const isActive = city.id === currentCity.id;
                    return (
                      <button
                        key={city.id}
                        onClick={() => {
                          setCityById(city.id);
                          setIsCityDropdownOpen(false);
                          setLastSynced('Syncing...');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition ${
                          isActive
                            ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-white/8 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate text-white">{city.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{city.state}</div>
                        </div>
                        {isActive && (
                          <span className="font-mono text-[11px] font-bold shrink-0 ml-2 px-1.5 py-0.5 rounded border text-emerald-300 bg-emerald-500/15 border-emerald-500/30">
                            AQI {currentCity.currentAQI}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <button
            className="relative p-2 rounded-xl bg-white/6 border border-white/10 text-slate-300 hover:text-white hover:bg-white/12 transition"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playSpikeChime();
            }}
            title={soundEnabled ? 'Sound Alerts Active' : 'Sound Muted'}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-white/6 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile Search */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="sm:hidden p-2 rounded-xl bg-white/6 border border-white/10 text-slate-200 hover:text-white transition"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Ask AI CTA */}
          <Link
            href="/assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 hover:brightness-105 active:scale-95 transition"
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Ask AI</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

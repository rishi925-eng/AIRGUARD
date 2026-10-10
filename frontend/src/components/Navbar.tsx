'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Map, 
  TrendingUp, 
  Navigation, 
  Activity, 
  Compass, 
  ShieldAlert, 
  Bot, 
  GraduationCap, 
  Building2, 
  Megaphone, 
  Wind, 
  LineChart,
  ChevronLeft,
  ChevronRight,
  Flame
} from 'lucide-react';
import { useLocation } from '../lib/locationContext';

const navItems = [
  { href: '/',           label: 'Overview',          icon: Home,          group: 'monitoring', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { href: '/map',        label: 'Live GIS Map',       icon: Map,           group: 'monitoring', color: 'text-sky-400',     bg: 'bg-sky-500/15',     badge: 'LIVE' },
  { href: '/forecast',   label: 'ML Forecast',        icon: TrendingUp,    group: 'monitoring', color: 'text-purple-400',  bg: 'bg-purple-500/15' },
  { href: '/routes',     label: 'Clean Routes',       icon: Navigation,    group: 'safety',     color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { href: '/exposure',   label: 'Exposure Engine',    icon: Activity,      group: 'safety',     color: 'text-rose-400',    bg: 'bg-rose-500/15' },
  { href: '/activities', label: 'Activity Planner',   icon: Compass,       group: 'safety',     color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  { href: '/alerts',     label: 'Predictive Alerts',  icon: ShieldAlert,   group: 'safety',     color: 'text-orange-400',  bg: 'bg-orange-500/15' },
  { href: '/assistant',  label: 'AI Assistant',       icon: Bot,           group: 'ai',         color: 'text-teal-400',    bg: 'bg-teal-500/15',    badge: 'AI' },
  { href: '/schools',    label: 'School Safety',      icon: GraduationCap, group: 'admin',      color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  { href: '/city',       label: 'City Command',       icon: Building2,     group: 'admin',      color: 'text-sky-400',     bg: 'bg-sky-500/15' },
  { href: '/reports',    label: 'Citizen Reports',    icon: Megaphone,     group: 'admin',      color: 'text-pink-400',    bg: 'bg-pink-500/15' },
  { href: '/indoor',     label: 'Indoor IoT',         icon: Wind,          group: 'admin',      color: 'text-cyan-400',    bg: 'bg-cyan-500/15',    badge: 'ESP32' },
  { href: '/analytics',  label: 'Analytics Hub',      icon: LineChart,     group: 'admin',      color: 'text-violet-400',  bg: 'bg-violet-500/15' },
];

const groupLabels: Record<string, string> = {
  monitoring: 'Monitoring',
  safety: 'Safety Tools',
  ai: 'Intelligence',
  admin: 'Command Centers',
};

export default function Navbar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { currentCity } = useLocation();

  const aqi = currentCity.currentAQI;
  const aqiBadgeColor =
    aqi > 200 ? 'bg-red-500 text-white' :
    aqi > 150 ? 'bg-orange-500 text-white' :
    aqi > 100 ? 'bg-amber-500 text-white' :
    'bg-emerald-500 text-white';

  // Group nav items
  const groups = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
        />
      )}

      <nav
        className={`
          fixed left-0 top-0 bottom-0 z-50 flex flex-col
          border-r border-white/8
          bg-[#0F172A] text-slate-200
          transition-all duration-200 ease-in-out
          ${collapsed ? 'w-[68px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo / Brand */}
        <div className={`flex items-center h-[60px] border-b border-white/8 px-3.5 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition">
              AG
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-black tracking-tight text-[15px] text-white leading-tight">AIRGUARD</div>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              aria-label="Collapse sidebar"
              onClick={onToggleCollapse}
              className="hidden md:flex shrink-0 w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            aria-label="Expand sidebar"
            onClick={onToggleCollapse}
            className="hidden md:flex mx-auto mt-2 shrink-0 w-8 h-8 rounded-lg items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-white/10 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* City AQI Quick Status (only when expanded) */}
        {!collapsed && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center gap-2.5">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${aqiBadgeColor} font-mono shrink-0`}>
              AQI {aqi}
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">{currentCity.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{currentCity.category}</div>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          </div>
        )}

        {/* Nav items with groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 no-scrollbar">
          {Object.entries(groups).map(([group, items], gi) => (
            <div key={group}>
              {!collapsed && (
                <div className={`px-4 pb-1 ${gi > 0 ? 'pt-4 mt-2 border-t border-white/5' : 'pt-1'}`}>
                  <span className="text-[9px] uppercase font-bold tracking-[0.16em] text-slate-500">
                    {groupLabels[group]}
                  </span>
                </div>
              )}
              {gi > 0 && collapsed && <div className="mx-4 my-2.5 border-t border-white/5" />}
              
              <div className="space-y-0.5 px-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <div key={item.href} className="relative group/nav">
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={onCloseMobile}
                        className={`
                          flex items-center gap-2.5 px-2.5 py-2 rounded-xl
                          text-[12.5px] font-medium
                          transition-all duration-150 relative
                          ${collapsed ? 'justify-center' : ''}
                          ${isActive
                            ? 'bg-white/10 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-white/6'
                          }
                        `}
                      >
                        {/* Active left accent */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                        )}

                        {/* Icon with colored bg */}
                        <div className={`shrink-0 ${collapsed ? 'w-8 h-8' : 'w-6 h-6'} rounded-lg flex items-center justify-center ${isActive ? item.bg : 'bg-transparent group-hover/nav:' + item.bg} transition`}>
                          <Icon className={`${collapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${isActive ? item.color : 'text-slate-400 group-hover/nav:' + item.color} transition`} />
                        </div>

                        {!collapsed && (
                          <span className="truncate flex-1">{item.label}</span>
                        )}

                        {/* Feature badge */}
                        {!collapsed && item.badge && (
                          <span className="ml-auto shrink-0 text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                            {item.badge}
                          </span>
                        )}

                        {/* Live dot for active */}
                        {isActive && !collapsed && !item.badge && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                      </Link>

                      {/* Tooltip for collapsed mode */}
                      {collapsed && (
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shadow-lg opacity-0 group-hover/nav:opacity-100 transition-opacity z-[200] border border-white/10">
                          {item.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-white/8 px-4 py-3 shrink-0">
            <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest leading-relaxed">
              AIRGUARD Platform · v2.4 PRO<br />
              OpenAQ v3 · NASA FIRMS · AWS Strands
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

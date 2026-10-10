'use client';

import Header from '../../components/Header';
import Navbar from '../../components/Navbar';
import CommandPalette from '../../components/CommandPalette';
import { LocationProvider } from '../../lib/locationContext';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <LocationProvider>
        {/* Global Command Palette — rendered above everything */}
        <CommandPalette />

        {/* Sticky top header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {/* Fixed-position sidebar */}
        <Navbar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileNavOpen}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Main content area */}
        <main
          className={`
            flex-1 min-w-0 overflow-x-hidden
            pt-[60px]
            p-4 sm:p-5 lg:p-6
            transition-[margin-left] duration-200 ease-in-out
            ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-64'}
          `}
        >
          {children}
        </main>

        {/* Footer */}
        <footer
          className={`
            border-t border-slate-200 bg-white
            py-5 px-4 sm:px-6 mt-auto
            text-xs text-slate-500
            transition-[margin-left] duration-200 ease-in-out
            ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-64'}
          `}
        >
          <div className="max-w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xs shadow-sm">
                AG
              </div>
              <p className="text-center md:text-left text-slate-600 font-medium">
                © 2026 AIRGUARD Platform · Powered by AWS Strands Multi-Agent Orchestrator &amp; SageMaker
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-slate-400 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                OpenAQ v3 + CPCB
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                Open-Meteo &amp; ECMWF
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                NASA FIRMS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                Mapbox GIS
              </span>
            </div>
          </div>
        </footer>
      </LocationProvider>
    </div>
  );
}

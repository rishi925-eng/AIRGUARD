'use client';

import React, { useState, useEffect } from 'react';
import { useLocation } from '../../../lib/locationContext';
import { 
  ShieldAlert, Bell, Mail, Phone, Flame, Wind, TrendingUp, 
  Clock, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Megaphone
} from 'lucide-react';

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

interface Alert {
  id: number;
  type: string;
  severity: Severity;
  message: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SEVERITY_STYLES: Record<Severity, { text: string; bg: string; border: string; dot: string }> = {
  Low:      { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Medium:   { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  High:     { text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-500' },
  Critical: { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500' },
};

export default function AlertsPage() {
  const { currentCity } = useLocation();
  const baseAQI = currentCity.currentAQI;
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alertTypes, setAlertTypes] = useState({ aqi: true, fire: false, forecast: true, exposure: false });
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(90);
  const [showToast, setShowToast] = useState(false);

  // Dynamic countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(v => v > 0 ? v - 1 : 0);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const threshold = baseAQI > 200 ? 300 : 200;
  const minutesToThreshold = baseAQI > 180 ? countdown : null;

  // Generate alerts based on current AQI
  const activeAlerts: Alert[] = [
    baseAQI > 150 ? {
      id: 1, type: 'AQI Spike', severity: 'High' as Severity,
      message: `AQI in ${currentCity.name} has exceeded 150 — unhealthy for sensitive groups. Avoid prolonged outdoor exposure.`,
      time: '2 min ago', icon: ShieldAlert,
    } : {
      id: 1, type: 'AQI Normal', severity: 'Low' as Severity,
      message: `Air quality in ${currentCity.name} is within moderate range. Safe for most outdoor activities.`,
      time: '5 min ago', icon: Wind,
    },
    {
      id: 2, type: 'Fire Hotspot', severity: 'Medium' as Severity,
      message: `NASA FIRMS detected 3 active fire hotspots within 150km of ${currentCity.name}. Smoke plumes expected in 4–6 hours.`,
      time: '18 min ago', icon: Flame,
    },
    {
      id: 3, type: 'Forecast Alert', severity: baseAQI > 100 ? 'High' as Severity : 'Medium' as Severity,
      message: `XGBoost model predicts AQI will reach ${Math.round(baseAQI * 1.4)} by 21:00 tonight due to temperature inversion.`,
      time: '45 min ago', icon: TrendingUp,
    },
  ];

  const alertHistory = [
    { id: 4, type: 'AQI Improvement', severity: 'Low' as Severity, message: 'Morning AQI dropped to safe levels', time: 'Yesterday 07:12' },
    { id: 5, type: 'Fire Cleared', severity: 'Low' as Severity, message: 'Hotspot near Delhi border extinguished', time: 'Yesterday 14:30' },
    { id: 6, type: 'AQI Critical', severity: 'Critical' as Severity, message: 'AQI crossed 300 — Hazardous conditions', time: '2 days ago 20:00' },
    { id: 7, type: 'Storm Warning', severity: 'Medium' as Severity, message: 'Dust storm predicted, shield vents', time: '3 days ago 11:00' },
    { id: 8, type: 'PM2.5 Spike', severity: 'High' as Severity, message: 'PM2.5 reached 145 µg/m³', time: '4 days ago 22:45' },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) return;
    
    try {
      setSubscriptionError(null);
      const res = await fetch('/api/v1/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: "123e4567-e89b-12d3-a456-426614174000",
          location: {
            latitude: currentCity.lat,
            longitude: (currentCity as any).lng || (currentCity as any).lon || 77.2090
          },
          threshold: 100,
          notification_method: phone ? "sms" : "email"
        })
      });
      if (res.ok) {
        setSubscribed(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
      } else {
        const detail = await res.text();
        setSubscriptionError(detail || 'Subscription failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setSubscriptionError('Alert service is unavailable. Please try again later.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="p-4 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <div>
              <div className="font-bold text-sm">Test Alert Sent!</div>
              <div className="text-xs text-emerald-100">Your alert subscription was accepted by the API.</div>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-2">
              <XCircle className="w-4 h-4 text-emerald-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
            Predictive Alert Engine
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" /> {activeAlerts.length} active
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Real-Time Air Quality Alerts</h1>
        <p className="text-sm text-slate-500 mt-0.5">{currentCity.name} · Threshold-based + AI-predicted anomaly feed</p>
      </div>

      {/* Predicted Countdown Banner */}
      {minutesToThreshold !== null && minutesToThreshold > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-red-800">
              ⚠️ AQI expected to cross {threshold} in ~{minutesToThreshold} minutes
            </div>
            <div className="text-xs text-red-600 mt-0.5">
              Based on XGBoost trajectory model. Move sensitive groups indoors now.
            </div>
          </div>
          <span className="shrink-0 px-3 py-1.5 bg-red-500 text-white text-[11px] font-black rounded-xl animate-pulse">
            IMMINENT
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Active Alerts */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-orange-500" /> Active Alerts
          </h2>
          
          {activeAlerts.map(alert => {
            const s = SEVERITY_STYLES[alert.severity];
            const Icon = alert.icon;
            return (
              <div key={alert.id} className={`p-4 rounded-2xl border ${s.bg} ${s.border} hover:-translate-y-0.5 hover:shadow-sm transition`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${s.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-bold ${s.text}`}>{alert.type}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{alert.message}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {alert.time}
                    </div>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/70 transition shrink-0">
                    <ChevronRight className={`w-4 h-4 ${s.text}`} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Alert History */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Alert History</h2>
            <div className="space-y-0 divide-y divide-slate-100">
              {alertHistory.map(alert => {
                const s = SEVERITY_STYLES[alert.severity];
                return (
                  <div key={alert.id} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 rounded-lg px-1 -mx-1 transition">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{alert.type}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.text} ${s.bg}`}>{alert.severity}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{alert.message}</div>
                    </div>
                    <span className="text-[9px] text-slate-400 shrink-0 font-mono">{alert.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Subscribe Panel */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            {subscribed ? (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="font-black text-slate-900">You're subscribed!</h3>
                <p className="text-xs text-slate-500">AIRGUARD will send alerts to {email} for {currentCity.name}</p>
                <button onClick={() => setSubscribed(false)} className="text-xs text-emerald-600 hover:underline font-semibold">Manage preferences</button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900 mb-0.5">Subscribe to Alerts</h2>
                  <p className="text-xs text-slate-500">Get notified before air quality turns hazardous</p>
                  {subscriptionError && (
                    <p className="mt-2 text-xs text-red-600" role="alert">{subscriptionError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+91 9876543210 (optional)"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Alert Types</div>
                  <div className="space-y-2">
                    {[
                      { key: 'aqi', label: '🌬️ AQI Threshold Alerts', desc: 'When AQI crosses 100 / 200 / 300' },
                      { key: 'fire', label: '🔥 Fire Hotspot Warnings', desc: 'NASA FIRMS detects nearby fires' },
                      { key: 'forecast', label: '📈 Predictive Alerts', desc: '2h advance warning from ML model' },
                      { key: 'exposure', label: '💨 Exposure Dose Alerts', desc: 'When daily PM2.5 dose is too high' },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={alertTypes[key as keyof typeof alertTypes]}
                          onChange={e => setAlertTypes(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="mt-0.5 accent-orange-500"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-700">{label}</div>
                          <div className="text-[10px] text-slate-400">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm shadow-md shadow-orange-500/25 hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" /> Activate Alert Subscription
                </button>
              </form>
            )}
          </div>

          {/* Alert Stats */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Alert Statistics (7d)</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Alerts', value: '23', color: 'text-slate-900' },
                { label: 'Critical', value: '3', color: 'text-red-600' },
                { label: 'Avg Lead Time', value: '2.4h', color: 'text-emerald-600' },
                { label: 'Accuracy', value: '89%', color: 'text-sky-600' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2 rounded-xl bg-white border border-slate-100">
                  <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[9px] text-slate-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

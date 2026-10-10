'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Wind, MapPin, Bell, Brain, Menu, X,
  CheckCircle, TrendingUp, Shield, Navigation, Flame, Star
} from 'lucide-react';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const AQI_CITIES = [
  { city: 'New Delhi', aqi: 187, status: 'Unhealthy', color: 'text-orange-500', dot: 'bg-orange-400', bar: 'from-orange-400 to-red-500', pct: 62 },
  { city: 'Mumbai', aqi: 68, status: 'Moderate', color: 'text-yellow-600', dot: 'bg-yellow-400', bar: 'from-yellow-300 to-yellow-500', pct: 23 },
  { city: 'Bangalore', aqi: 41, status: 'Good', color: 'text-emerald-600', dot: 'bg-emerald-400', bar: 'from-emerald-300 to-emerald-500', pct: 14 },
  { city: 'Kolkata', aqi: 134, status: 'Unhealthy', color: 'text-orange-500', dot: 'bg-orange-400', bar: 'from-orange-400 to-red-400', pct: 45 },
  { city: 'Chennai', aqi: 55, status: 'Moderate', color: 'text-yellow-600', dot: 'bg-yellow-400', bar: 'from-yellow-300 to-orange-400', pct: 18 },
  { city: 'Hyderabad', aqi: 48, status: 'Good', color: 'text-emerald-600', dot: 'bg-emerald-400', bar: 'from-emerald-300 to-teal-400', pct: 16 },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Mom of two, Delhi', text: 'I now check Airguard every morning before sending my kids to school. It\'s become part of our daily routine.', stars: 5 },
  { name: 'Rahul Verma', role: 'Cyclist, Bangalore', text: 'The clean routing feature changed how I commute. I arrive at work feeling much better than before.', stars: 5 },
  { name: 'Dr. Anjali Mehta', role: 'Pulmonologist, Mumbai', text: 'I recommend this to my asthma patients. The real-time data and alerts help them manage their condition better.', stars: 5 },
];

export default function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [city, setCity] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [activeCity, setActiveCity] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveCity(c => (c + 1) % AQI_CITIES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  const current = AQI_CITIES[activeCity];

  return (
    <div className="bg-white text-gray-900 antialiased font-sans min-h-screen overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[18px] text-gray-900">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm">
              <Wind className="w-4 h-4 text-white" />
            </div>
            Airguard
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-gray-500">
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#mission" className="hover:text-gray-900 transition-colors">Mission</a>
          </nav>

          <Link
            href="/dashboard"
            className="hidden md:flex bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[13px] font-bold px-5 py-2.5 rounded-xl transition-colors items-center gap-2 shadow-sm shadow-emerald-200"
          >
            Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button className="md:hidden p-2 text-gray-500 hover:text-gray-900" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-6 py-4 space-y-3 shadow-sm">
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-1">How it works</a>
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-1">Features</a>
            <a href="#mission" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-600 py-1">Mission</a>
            <Link href="/dashboard" className="block w-full text-center bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm mt-2">
              Open Dashboard
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-28 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_460px] gap-14 items-center">

          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Trusted by 50,000+ users across India
            </div>

            <h1 className="text-[42px] md:text-[58px] font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
              Know the air you're breathing.{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Before it hurts you.
              </span>
            </h1>

            <p className="text-[18px] text-gray-500 leading-relaxed mb-9 max-w-lg">
              Airguard gives you real-time AQI data, 72-hour AI forecasts, and clean-air navigation routes — so every breath you take is an informed one.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mb-8">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Delhi, Mumbai, Bangalore..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 text-[15px] rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white shadow-sm transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[14px] font-bold px-6 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 whitespace-nowrap"
              >
                Check AQI <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10">
              {['Free forever', 'No account needed', 'Updates every 5 min'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> {t}
                </span>
              ))}
            </div>

            {/* Social proof faces */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['bg-blue-400','bg-emerald-400','bg-orange-400','bg-purple-400','bg-rose-400'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold`}>
                    {['P','R','A','S','K'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[12px] text-gray-500"><span className="font-semibold text-gray-700">4.9/5</span> from 2,400+ reviews</p>
              </div>
            </div>
          </div>

          {/* Right — Live AQI card stack */}
          <div className="w-full space-y-3">

            {/* Main live card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${current.dot} animate-pulse`}></span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Air Quality</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  current.status === 'Good' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  current.status === 'Moderate' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  {current.status}
                </span>
              </div>

              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-sm text-gray-400 mb-1 font-medium">{current.city}, India</p>
                  <p className={`text-7xl font-black ${current.color} leading-none transition-all duration-500`}>{current.aqi}</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">AQI · US Standard</p>
                </div>
                <div className="text-right space-y-1.5 pb-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] text-gray-400">PM2.5</span>
                    <span className="text-[13px] font-bold text-gray-800">74 µg/m³</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] text-gray-400">PM10</span>
                    <span className="text-[13px] font-bold text-gray-800">138 µg/m³</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] text-gray-400">NO₂</span>
                    <span className="text-[13px] font-bold text-gray-800">42 ppb</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${current.bar} transition-all duration-700`}
                  style={{ width: `${current.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-4">
                <span>0 — Good</span><span>100 — Moderate</span><span>200+ — Hazardous</span>
              </div>

              <div className="flex gap-1.5 justify-center">
                {AQI_CITIES.map((_, i) => (
                  <button key={i} onClick={() => setActiveCity(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeCity ? 'w-5 bg-emerald-500' : 'w-1.5 bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>

            {/* Forecast mini card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">72-Hour AI Forecast</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">94% accurate</span>
              </div>
              <div className="flex items-end gap-1 h-14">
                {[187,175,162,145,158,172,165,150,142,138,145,155].map((v, i) => (
                  <div key={i}
                    className={`flex-1 rounded-sm transition-all ${i < 3 ? 'bg-orange-400' : 'bg-orange-200'}`}
                    style={{ height: `${(v / 200) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                {['Now','12h','24h','36h','48h','60h','72h'].map(t => <span key={t}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-gray-100 bg-slate-50 py-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: '+', label: 'Monitoring stations' },
            { value: 50000, suffix: '+', label: 'Active users' },
            { value: 200, suffix: '+', label: 'Cities covered' },
            { value: 94, suffix: '%', label: 'ML forecast accuracy' },
          ].map(({ value, suffix, label }) => (
            <div key={label}>
              <p className="text-4xl font-black text-gray-900 mb-1.5">
                <AnimatedNumber target={value} suffix={suffix} />
              </p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Works in seconds.</h2>
          <p className="text-[17px] text-gray-500 max-w-md mx-auto">No signup. No app to download. Just instant, accurate air quality information.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', icon: MapPin, color: 'bg-blue-50 text-blue-600 border-blue-100', title: 'Enter your city', desc: 'Type any city name. We cover 200+ cities in India with real government and private monitoring stations.' },
            { n: '02', icon: TrendingUp, color: 'bg-purple-50 text-purple-600 border-purple-100', title: 'See the full picture', desc: 'Get AQI, pollutant breakdown (PM2.5, NO₂, SO₂), a 72-hour ML forecast, and personalized health advice.' },
            { n: '03', icon: Navigation, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', title: 'Take action', desc: 'Find the cleanest walking route, set alerts for your threshold, or ask our AI assistant for advice.' },
          ].map(({ n, icon: Icon, color, title, desc }) => (
            <div key={n} className="relative bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300 group">
              <div className="absolute top-6 right-6 text-6xl font-black text-gray-50 group-hover:text-gray-100 transition-colors select-none">{n}</div>
              <div className={`w-12 h-12 rounded-2xl ${color} border flex items-center justify-center mb-5`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-gray-950 py-24 px-6 rounded-t-[2.5rem]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">Tools built for real life, not dashboards.</h2>
            <p className="text-[17px] text-gray-400">Not just a number. An entire system designed around keeping you and your family safe.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Wind, grad: 'from-emerald-500/10 border-emerald-900/50', ic: 'text-emerald-400', title: 'Real-time Pollution Heatmap', desc: 'Interactive map showing live AQI across your entire city — street by street, updated every few minutes.' },
              { icon: Brain, grad: 'from-violet-500/10 border-violet-900/50', ic: 'text-violet-400', title: 'AI Health Assistant', desc: 'Ask "Is it safe to run today?" or "What mask should I wear?" Get instant, context-aware health advice.' },
              { icon: Navigation, grad: 'from-blue-500/10 border-blue-900/50', ic: 'text-blue-400', title: 'Clean-Air Routing', desc: 'Walk, cycle, or commute on routes with the lowest PM2.5 exposure. Recalculates in real-time.' },
              { icon: Bell, grad: 'from-amber-500/10 border-amber-900/50', ic: 'text-amber-400', title: 'Smart Threshold Alerts', desc: 'Set your personal AQI limit. Get notified the moment local air quality crosses your safe zone.' },
              { icon: Flame, grad: 'from-red-500/10 border-red-900/50', ic: 'text-red-400', title: 'Wildfire & Smoke Tracking', desc: 'NASA FIRMS satellite data shows active fires so you know when smoke might affect your area today.' },
              { icon: Shield, grad: 'from-teal-500/10 border-teal-900/50', ic: 'text-teal-400', title: 'Personal Exposure Log', desc: 'Track your daily cumulative PM2.5 exposure and understand your long-term environmental health risk.' },
            ].map(({ icon: Icon, grad, ic, title, desc }) => (
              <div key={title} className={`bg-gradient-to-b ${grad} border rounded-2xl p-7 hover:border-gray-600 transition-all duration-300 group hover:-translate-y-0.5`}>
                <Icon className={`w-6 h-6 ${ic} mb-5 group-hover:scale-110 transition-transform`} />
                <h3 className="text-[15px] font-bold text-white mb-2">{title}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-950 py-20 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">What people are saying</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, role, text, stars }) => (
              <div key={name} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array(stars).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[14px] text-gray-300 leading-relaxed mb-5">&ldquo;{text}&rdquo;</p>
                <div>
                  <p className="text-[13px] font-bold text-white">{name}</p>
                  <p className="text-[12px] text-gray-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission / CTA ── */}
      <section id="mission" className="bg-gray-950 pb-24 px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-emerald-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1)_0,transparent_60%)]" />
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
          <p className="text-sm font-bold text-emerald-200 uppercase tracking-widest mb-5 relative z-10">Our Promise</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-6 relative z-10">
            Everyone deserves to know<br />what they're breathing.
          </h2>
          <p className="text-[16px] text-emerald-100 max-w-xl mx-auto leading-relaxed mb-10 relative z-10">
            Air pollution is the world's single largest environmental health risk. We built Airguard because information is the first step to protection — and everyone deserves that information for free.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-4 rounded-xl hover:bg-emerald-50 transition-colors text-[15px] relative z-10 shadow-xl"
          >
            Open Airguard — It's free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 border-t border-gray-800/50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2 font-bold text-white text-[16px]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Wind className="w-3.5 h-3.5 text-white" />
            </div>
            Airguard
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[13px] text-gray-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/map" className="hover:text-white transition-colors">Live Map</Link>
            <Link href="/forecast" className="hover:text-white transition-colors">Forecast</Link>
            <Link href="/routes" className="hover:text-white transition-colors">Clean Routing</Link>
            <Link href="/assistant" className="hover:text-white transition-colors">AI Assistant</Link>
            <Link href="/alerts" className="hover:text-white transition-colors">Alerts</Link>
          </div>
          <p className="text-[12px] text-gray-600">© 2026 Airguard. Made for cleaner cities.</p>
        </div>
      </footer>

    </div>
  );
}

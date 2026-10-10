'use client';

import React, { useState, useRef } from 'react';
import { useLocation } from '../../../lib/locationContext';
import { 
  Upload, MapPin, Flame, Building2, Factory, Trash2, Car, 
  Camera, Send, CheckCircle2, Clock, Shield, ChevronDown, Image
} from 'lucide-react';

type PollutionType = 'Fire/Stubble' | 'Construction' | 'Industry' | 'Waste Burning' | 'Traffic' | 'Other';
type ReportStatus = 'Reported' | 'Under Review' | 'Verified' | 'Rejected';

const POLLUTION_TYPES: { id: PollutionType; icon: React.ComponentType<{ className?: string }>; emoji: string; color: string }[] = [
  { id: 'Fire/Stubble',  icon: Flame,     emoji: '🔥', color: 'text-red-600' },
  { id: 'Construction', icon: Building2,  emoji: '🏗️', color: 'text-amber-600' },
  { id: 'Industry',     icon: Factory,    emoji: '🏭', color: 'text-slate-600' },
  { id: 'Waste Burning',icon: Trash2,     emoji: '🗑️', color: 'text-orange-600' },
  { id: 'Traffic',      icon: Car,        emoji: '🚗', color: 'text-sky-600' },
  { id: 'Other',        icon: MapPin,     emoji: '📍', color: 'text-purple-600' },
];

const STATUS_STYLES: Record<ReportStatus, { text: string; bg: string; border: string; dot: string }> = {
  Reported:    { text: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     dot: 'bg-sky-500' },
  'Under Review': { text: 'text-amber-700', bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  Verified:    { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  Rejected:    { text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500' },
};

const REPORTS: Array<{
  id: number;
  type: string;
  emoji: string;
  location: string;
  time: string;
  desc: string;
  status: ReportStatus;
  reporter: string;
}> = [];

export default function ReportsPage() {
  const { currentCity } = useLocation();
  const [selectedType, setSelectedType] = useState<PollutionType>('Fire/Stubble');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
            Citizen Science Network
          </span>
          <span className="text-[10px] text-slate-400">Powered by crowd-verified AI</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Report Pollution Incident</h1>
        <p className="text-sm text-slate-500 mt-0.5">{currentCity.name} · Help build India's largest community air quality database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Report Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-emerald-900">Report Submitted!</h2>
                <p className="text-sm text-emerald-700 mt-1">Thank you! Your {selectedType} report from {currentCity.name} has been received and is under review.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-200 text-xs text-emerald-700 font-semibold">
                <Clock className="w-3.5 h-3.5" /> Status: <strong>Pending server confirmation</strong>
              </div>
              <button onClick={() => { setSubmitted(false); setDescription(''); setImageFile(null); }} className="text-sm text-emerald-600 hover:underline font-semibold">
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pollution Type Selector */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Pollution Type</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POLLUTION_TYPES.map(({ id, emoji, color }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedType(id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                        selectedType === id
                          ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-pink-300 hover:bg-pink-50'
                      }`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="text-left text-[11px] leading-tight">{id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div
                className={`p-5 rounded-2xl border-2 border-dashed transition cursor-pointer ${
                  isDragging ? 'border-pink-400 bg-pink-50' : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/30'
                }`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />
                {imageFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                      <Image className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{imageFile.name}</div>
                      <div className="text-xs text-slate-400">{(imageFile.size / 1024).toFixed(0)} KB · Click to change</div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-3">
                    <Camera className="w-8 h-8 text-slate-300" />
                    <div className="text-sm font-semibold text-slate-600">Drag & drop a photo, or click to browse</div>
                    <div className="text-xs text-slate-400">JPG, PNG, HEIC up to 10MB</div>
                  </div>
                )}
              </div>

              {/* Location display */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-700">Auto-detected Location</div>
                  <div className="text-sm text-slate-900 font-semibold truncate">{currentCity.name}, {currentCity.state}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentCity.lat?.toFixed(4) ?? '28.6139'}°N, {currentCity.lon?.toFixed(4) ?? '77.2090'}°E
                  </div>
                </div>
                <button type="button" className="text-[10px] text-sky-600 font-bold hover:underline shrink-0">Change</button>
              </div>

              {/* Description */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Describe the Incident
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you see — source, direction, intensity, time of observation..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 resize-none"
                />
                <div className="text-[10px] text-slate-400 mt-1 text-right">{description.length}/500</div>
              </div>

              <button
                type="submit"
                disabled={!description.trim() || loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-sm shadow-md shadow-pink-500/25 hover:brightness-105 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Report to AIRGUARD</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right: Recent Reports */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recent Community Reports</h2>
            <div className="space-y-3">
              {REPORTS.map(report => {
                const s = STATUS_STYLES[report.status];
                return (
                  <div key={report.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm shrink-0 font-black text-slate-600">
                        {report.reporter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-[11px] font-bold text-slate-800">{report.emoji} {report.type}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${s.bg} ${s.border} ${s.text}`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 truncate">{report.desc}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400">
                          <MapPin className="w-2.5 h-2.5" /> {report.location} · {report.time}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Impact Stats */}
          <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-pink-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700">Community Impact</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: '1,248', label: 'Reports This Month' },
                { value: '73%',   label: 'Verified Accuracy' },
                { value: '34',    label: 'Actions Taken' },
                { value: '12',    label: 'Factories Alerted' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-2.5 rounded-xl bg-white/70 border border-pink-100">
                  <div className="text-base font-black text-pink-700">{stat.value}</div>
                  <div className="text-[9px] text-pink-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  Users, 
  Clock, 
  Wind, 
  CheckCircle2, 
  FileText,
  Search,
  MapPin,
  RefreshCw,
  Info,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Building2
} from 'lucide-react';
import { useLocation, PRESET_CITIES } from '../../../lib/locationContext';
import { 
  fetchSchools, 
  broadcastParentAdvisory, 
  SchoolAirReport, 
  SchoolSummary 
} from '../../../services/api';

export default function SchoolsPage() {
  const { currentCity, setCityById } = useLocation();

  // State
  const [schools, setSchools] = useState<SchoolAirReport[]>([]);
  const [summary, setSummary] = useState<SchoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<'ALL' | 'INDOOR' | 'OUTDOOR'>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // SMS Broadcast state
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);
  const [individualNotice, setIndividualNotice] = useState<{ [schoolId: string]: string }>({});

  // Request ID ref to prevent stale API responses from updating when city rapidly changes
  const activeRequestCityRef = useRef<string>(currentCity.id);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load schools for the currently selected city
  const loadSchools = useCallback(async (isInitial = true, targetPage = 1) => {
    // Cancel any ongoing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestCityId = currentCity.id;
    activeRequestCityRef.current = requestCityId;

    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const cityNameParam = currentCity.name;
      const resp = await fetchSchools({
        city: cityNameParam,
        search: searchQuery.trim() || undefined,
        page: targetPage,
        limit: 9,
      }, controller.signal);

      // Verify response belongs to active selected city
      if (activeRequestCityRef.current !== requestCityId) {
        return;
      }

      if (targetPage === 1) {
        setSchools(resp.schools || []);
      } else {
        setSchools(prev => [...prev, ...(resp.schools || [])]);
      }

      setSummary(resp.summary || null);
      setHasMore(Boolean(resp.has_more));
      setPage(targetPage);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      if (activeRequestCityRef.current === requestCityId) {
        setSchools([]);
        setSummary(null);
        setHasMore(false);
        setError(err instanceof Error ? err.message : 'School data is unavailable for this city');
      }
    } finally {
      if (activeRequestCityRef.current === requestCityId) {
        setLoading(false);
        setLoadingMore(false);
        setIsRefreshing(false);
      }
    }
  }, [currentCity.id, currentCity.name, searchQuery]);

  /* Removed local school fallback: school records must come from the API. */
  /*
  const handleOfflineFallback = (cityId: string, targetPage: number) => {
    const isDelhi = cityId === 'delhi';
    const isGorakhpur = cityId === 'gorakhpur';
    const isMumbai = cityId === 'mumbai';

    const citySchools = isDelhi ? [
      { name: 'Delhi Public School (DPS), R.K. Puram', campus: 'Sector 12 Senior Wing', area: 'R.K. Puram', lat: 28.5684, lon: 77.1837, students: 3400, aqiOffset: 0 },
      { name: 'Modern School, Barakhamba Road', campus: 'Main Heritage Campus', area: 'Connaught Place', lat: 28.6293, lon: 77.2284, students: 2500, aqiOffset: -4 },
      { name: 'The Mother\'s International School', campus: 'Sri Aurobindo Ashram Campus', area: 'Vijay Mandal Enclave', lat: 28.5393, lon: 77.2023, students: 2100, aqiOffset: -8 },
      { name: 'Springdales School, Pusa Road', campus: 'Upper Primary & Senior Wing', area: 'Karol Bagh', lat: 28.6439, lon: 77.1812, students: 1950, aqiOffset: 6 },
      { name: 'Sanskriti School, Chanakyapuri', campus: 'Diplomatic Enclave', area: 'Chanakyapuri', lat: 28.5878, lon: 77.1783, students: 2800, aqiOffset: -12 },
      { name: 'St. Columba\'s School', campus: 'Ashok Place Campus', area: 'Gole Market', lat: 28.6276, lon: 77.2078, students: 2900, aqiOffset: 2 },
      { name: 'Sardar Patel Vidyalaya', campus: 'Lodhi Estate Enclave', area: 'Lodhi Estate', lat: 28.5925, lon: 77.2256, students: 1500, aqiOffset: -6 },
      { name: 'Apeejay School, Sheikh Sarai', campus: 'Phase I Green Campus', area: 'Panchsheel Park', lat: 28.5369, lon: 77.2244, students: 1750, aqiOffset: -2 },
      { name: 'Convent of Jesus and Mary', campus: 'Ashok Road Campus', area: 'Connaught Place', lat: 28.6270, lon: 77.2088, students: 2000, aqiOffset: 0 },
      { name: 'Delhi Public School (DPS), Mathura Road', campus: 'Sunder Nagar Complex', area: 'Mathura Road', lat: 28.6015, lon: 77.2435, students: 3200, aqiOffset: 8 },
      { name: 'Kendriya Vidyalaya No. 1, Delhi Cantt', campus: 'Air Force Station Sector', area: 'Delhi Cantt', lat: 28.5956, lon: 77.1264, students: 2100, aqiOffset: -10 },
      { name: 'Bal Bharati Public School, Gangaram', campus: 'Sir Ganga Ram Hospital Marg', area: 'Old Rajinder Nagar', lat: 28.6412, lon: 77.1895, students: 2600, aqiOffset: 4 },
    ] : isGorakhpur ? [
      { name: 'St. Paul\'s School, Gorakhpur', campus: 'Civil Lines Main Campus', area: 'Civil Lines', lat: 26.7573, lon: 83.3752, students: 1650, aqiOffset: 0 },
      { name: 'Army Public School, Gorakhpur', campus: 'GRD Military Station', area: 'Kunraghat', lat: 26.7443, lon: 83.4285, students: 1950, aqiOffset: -6 },
      { name: 'Kendriya Vidyalaya No. 1, AFS Gorakhpur', campus: 'Air Force Station Campus', area: 'Air Force Station', lat: 26.7460, lon: 83.4320, students: 1400, aqiOffset: -12 },
      { name: 'Delhi Public School (DPS), Gorakhpur', campus: 'NH-28 Bypass Campus', area: 'GIDA', lat: 26.7645, lon: 83.2921, students: 1850, aqiOffset: 8 },
      { name: 'St. Joseph\'s School for Boys', campus: 'Cantt Road Campus', area: 'Civil Lines', lat: 26.7550, lon: 83.3730, students: 1550, aqiOffset: -2 },
      { name: 'Little Flower School, Rapti Nagar', campus: 'Phase 4 Campus', area: 'Chargawan', lat: 26.7904, lon: 83.3856, students: 2100, aqiOffset: 4 },
      { name: 'G.N. National Public School', campus: 'Gorakhnath Temple Road', area: 'Gorakhnath', lat: 26.7820, lon: 83.3512, students: 1750, aqiOffset: 2 },
      { name: 'Carmel Girls\' Inter College', campus: 'Park Road Heritage Wing', area: 'Civil Lines', lat: 26.7588, lon: 83.3764, students: 1900, aqiOffset: -4 },
      { name: 'Air Force School, Gorakhpur', campus: 'Kusmhi Air Base Wing', area: 'Kusmhi', lat: 26.7380, lon: 83.4420, students: 1200, aqiOffset: -10 },
      { name: 'Academic Heights Public School', campus: 'Medical College Road', area: 'Basharatpur', lat: 26.7885, lon: 83.3892, students: 1100, aqiOffset: 6 },
      { name: 'Saraswati Shishu Mandir Senior Secondary', campus: 'Surya Kund Sector', area: 'Subhash Chandra Bose Nagar', lat: 26.7725, lon: 83.3630, students: 1450, aqiOffset: 3 },
      { name: 'Maharana Pratap Senior Secondary School', campus: 'Civil Lines MP Enclave', area: 'Civil Lines', lat: 26.7538, lon: 83.3805, students: 1600, aqiOffset: -1 },
    ] : isMumbai ? [
      { name: 'The Cathedral and John Connon School', campus: 'Fort Heritage Campus', area: 'Fort', lat: 18.9328, lon: 72.8335, students: 1600, aqiOffset: -4 },
      { name: 'Bombay Scottish School', campus: 'Veer Savarkar Marg', area: 'Mahim', lat: 19.0305, lon: 72.8406, students: 1900, aqiOffset: 2 },
      { name: 'Dhirubhai Ambani International School', campus: 'Bandra Kurla Complex', area: 'BKC', lat: 19.0657, lon: 72.8687, students: 1400, aqiOffset: 6 },
      { name: 'Campion School, Mumbai', campus: 'Cooperage Road', area: 'Colaba', lat: 18.9242, lon: 72.8272, students: 1100, aqiOffset: -6 },
      { name: 'Don Bosco High School, Matunga', campus: 'Nathalal Parekh Marg', area: 'Matunga', lat: 19.0270, lon: 72.8572, students: 2200, aqiOffset: 4 },
    ] : [
      { name: 'Bishop Cotton Boys\' School', campus: 'St. Mark\'s Road Campus', area: 'Residency Road', lat: 12.9712, lon: 77.6015, students: 2100, aqiOffset: 0 },
      { name: 'National Public School (NPS)', campus: '12th Main Road', area: 'Indiranagar', lat: 12.9784, lon: 77.6408, students: 1800, aqiOffset: -3 },
      { name: 'The Frank Anthony Public School', campus: 'Halasuru Campus', area: 'Halasuru', lat: 12.9745, lon: 77.6212, students: 1650, aqiOffset: 2 },
      { name: 'Delhi Public School (DPS) Bangalore South', campus: 'Kanakapura Road Enclave', area: 'Kanakapura Road', lat: 12.8715, lon: 77.5512, students: 3100, aqiOffset: -8 },
    ];

    const fallbackList: SchoolAirReport[] = citySchools.map((s, idx) => {
      const aqi = Math.max(25, currentCity.currentAQI + s.aqiOffset);
      let decision = 'Hold Assembly Indoors';
      let rec_short = 'Shift Assembly Indoors';
      let recommendation = 'Morning assembly must be shifted indoors or into classrooms due to elevated particulate levels.';
      let action_level: SchoolAirReport['action_level'] = 'WARNING';
      let badge = 'bg-orange-50 text-orange-700 border-orange-200';
      let outdoor_allowed = false;

      if (aqi <= 50) {
        decision = 'Hold Assembly Outdoors';
        rec_short = 'Outdoor Assembly Safe';
        recommendation = 'Air quality is Satisfactory. Full outdoor activities and morning drills are safe.';
        action_level = 'SAFE';
        badge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        outdoor_allowed = true;
      } else if (aqi <= 100) {
        decision = 'Outdoor Assembly Permitted';
        rec_short = 'Normal Assembly Allowed';
        recommendation = 'Moderate air quality. Standard outdoor morning assembly permitted.';
        action_level = 'MODERATE';
        badge = 'bg-amber-50 text-amber-700 border-amber-200';
        outdoor_allowed = true;
      } else if (aqi <= 150) {
        decision = 'Limit Outdoor Exertion';
        rec_short = 'Brief Assembly Only (<15m)';
        recommendation = 'Unhealthy for sensitive groups. Keep assembly brief (<15 mins). Masks recommended for sensitive children.';
        action_level = 'CAUTION';
        badge = 'bg-orange-50 text-orange-700 border-orange-200';
        outdoor_allowed = true;
      } else if (aqi > 200) {
        decision = 'Strict Indoor Protocols';
        rec_short = 'Strict Indoor Protocols';
        recommendation = 'Very unhealthy air quality. Seal classroom windows and cancel all outdoor exposure.';
        action_level = 'SEVERE';
        badge = 'bg-red-50 text-red-700 border-red-200';
        outdoor_allowed = false;
      }

      return {
        id: `offline_${cityId}_${idx}`,
        name: s.name,
        campus: s.campus,
        area: s.area,
        city: currentCity.name,
        latitude: s.lat,
        longitude: s.lon,
        student_count: s.students,
        aqi: aqi,
        pm25: currentCity.pm25,
        category: aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive Groups' : aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy',
        decision,
        rec_short,
        recommendation,
        action_level,
        badge,
        outdoor_allowed,
        is_estimated: true,
        aqi_source: 'Open-Meteo Grid (Atmospheric Telemetry)',
        station_name: `${currentCity.name} Central Grid`,
        timestamp: new Date().toISOString()
      };
    /*
    });

    const filtered = searchQuery.trim() 
      ? fallbackList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.area.toLowerCase().includes(searchQuery.toLowerCase()))
      : fallbackList;

    setSchools(filtered);
    setSummary({
      total_schools: filtered.length,
      total_students: filtered.reduce((acc, curr) => acc + curr.student_count, 0),
      avg_aqi: Math.round(filtered.reduce((acc, curr) => acc + (curr.aqi || 0), 0) / (filtered.length || 1)),
      indoor_assembly_count: filtered.filter(s => !s.outdoor_allowed).length,
      outdoor_allowed_count: filtered.filter(s => s.outdoor_allowed).length,
    });
    setHasMore(false);
  };
  */

  // Trigger loading whenever the selected city changes
  useEffect(() => {
    loadSchools(true, 1);
  }, [loadSchools]);

  // Handle Load More pagination
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadSchools(false, page + 1);
  };

  // Broadcast advisory handler
  const handleBroadcastAdvisory = async () => {
    setBroadcasting(true);
    try {
      const resp = await broadcastParentAdvisory({
        city: currentCity.name,
        advisory_type: 'morning_assembly_indoor_shift',
      });
      setBroadcastNotice(
        `Broadcast accepted for ${resp.schools_targeted} schools in ${currentCity.name}. ${resp.recipient_status}.`
      );
    } catch (err) {
      setBroadcastNotice(err instanceof Error ? err.message : 'Broadcast service is unavailable');
    } finally {
      setBroadcasting(false);
      setTimeout(() => setBroadcastNotice(null), 6000);
    }
  };

  // Individual school advisory broadcast
  const handleIndividualSchoolBroadcast = async (school: SchoolAirReport) => {
    try {
      const resp = await broadcastParentAdvisory({
        city: currentCity.name,
        school_id: school.id,
        advisory_type: 'school_air_quality_advisory',
        custom_message: school.recommendation,
      });
      setIndividualNotice(prev => ({
        ...prev,
        [school.id]: `Broadcast accepted for ${school.name}: ${resp.recipient_status} ${school.decision}`,
      }));
    } catch (err) {
      setIndividualNotice(prev => {
        const next = { ...prev };
        next[school.id] = err instanceof Error ? err.message : 'Broadcast service is unavailable';
        return next;
      });
    }
  };

  // Filter schools by action level
  const displayedSchools = schools.filter(sc => {
    if (filterAction === 'INDOOR') return !sc.outdoor_allowed;
    if (filterAction === 'OUTDOOR') return sc.outdoor_allowed;
    return true;
  });

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5 animate-fade-in pb-16">

      {/* ══════════════════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="relative z-10 p-5 sm:p-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="label-tag bg-amber-50 text-amber-700 border-amber-200">
              <GraduationCap className="w-3 h-3" />
              Campus Health &amp; Child Safety
            </span>
            <span className="label-tag bg-emerald-50 text-emerald-700 border-emerald-200">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Real-Time AQI Station Matching
            </span>
          </div>

          {/* Title + Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                School Administrator Safety Hub
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
                Automated Morning Assembly AQI Index, coordinate-matched pollutant tracking &amp; parent
                broadcast for <span className="font-bold text-slate-800">{currentCity.name}</span>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => { setIsRefreshing(true); loadSchools(true, 1); }}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleBroadcastAdvisory}
                disabled={broadcasting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-sm active:scale-95 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {broadcasting ? 'Sending...' : 'Broadcast SMS Advisory'}
              </button>
            </div>
          </div>

          {/* City switcher pills */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3 text-emerald-600" /> City:
            </span>
            {PRESET_CITIES.map((city) => {
              const isActive = city.id === currentCity.id;
              return (
                <button
                  key={city.id}
                  onClick={() => setCityById(city.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {city.name}
                  <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {city.currentAQI}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BROADCAST SUCCESS BANNER
      ══════════════════════════════════════════════════════ */}
      {broadcastNotice && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold animate-subtle-pulse shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="min-w-0">{broadcastNotice}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          KPI STAT ROW
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Schools Monitored',  icon: <Building2 className="w-4 h-4 text-emerald-600" />,  value: summary ? summary.total_schools : schools.length, sub: `Active campuses in ${currentCity.name}`, valClass: 'text-slate-900' },
          { label: 'Children Covered',   icon: <Users className="w-4 h-4 text-sky-600" />,          value: (summary ? summary.total_students : schools.reduce((a, c) => a + (c.student_count ?? 0), 0)).toLocaleString(), sub: 'Verified enrollment data only', valClass: 'text-slate-900' },
          { label: 'Indoor Assembly',    icon: <ShieldAlert className="w-4 h-4 text-orange-600" />, value: summary ? summary.indoor_assembly_count : schools.filter((s) => !s.outdoor_allowed).length, sub: 'Campuses needing indoor shift', valClass: 'text-orange-600' },
          { label: 'Avg Campus AQI',     icon: <Wind className="w-4 h-4 text-amber-600" />,        value: summary?.avg_aqi ?? currentCity.currentAQI, sub: `Weighted across ${currentCity.name}`, valClass: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="min-w-0 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{stat.label}</span>
              <span className="shrink-0">{stat.icon}</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono ${stat.valClass}`}>{stat.value}</div>
            <p className="text-[11px] text-slate-500 truncate">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          SEARCH + FILTER TOOLBAR
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search schools or areas in ${currentCity.name}...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none transition"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar pb-0.5 sm:pb-0">
          {[
            { key: 'ALL',     label: `All (${schools.length})` },
            { key: 'INDOOR',  label: `Indoor (${schools.filter((s) => !s.outdoor_allowed).length})` },
            { key: 'OUTDOOR', label: `Outdoor (${schools.filter((s) => s.outdoor_allowed).length})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterAction(f.key as typeof filterAction)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                filterAction === f.key
                  ? f.key === 'INDOOR'  ? 'bg-orange-50 text-orange-800 border-orange-300 font-bold'
                  : f.key === 'OUTDOOR' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                  :                       'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCHOOL CARDS GRID
      ══════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="min-w-0 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-pulse">
              <div className="flex justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3.5 bg-slate-200 rounded w-4/5" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-10 w-12 bg-slate-100 rounded-xl shrink-0" />
              </div>
              <div className="h-14 bg-slate-50 rounded-xl" />
              <div className="h-2.5 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : displayedSchools.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No schools match your search</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Try adjusting your query or switch the active city.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedSchools.map((sc) => {
            const aqiVal = sc.aqi;
            const hasAQI = aqiVal !== null && aqiVal !== undefined;

            const aqiTheme =
              aqiVal === null || aqiVal === undefined
                ? { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400', strip: 'bg-slate-300' }
                : aqiVal <= 50
                ? { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', strip: 'bg-emerald-500' }
                : aqiVal <= 100
                ? { border: 'border-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   strip: 'bg-amber-500' }
                : aqiVal <= 150
                ? { border: 'border-orange-200',  bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  strip: 'bg-orange-500' }
                : aqiVal <= 200
                ? { border: 'border-red-200',     bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     strip: 'bg-red-500' }
                : { border: 'border-purple-200',  bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  strip: 'bg-purple-600' };

            return (
              <div
                key={sc.id}
                className="min-w-0 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md group overflow-hidden"
              >
                {/* Top accent strip */}
                <div className={`h-1 w-full ${aqiTheme.strip}`} />

                <div className="flex flex-col flex-1 p-4 gap-3">
                  {/* Name + AQI badge */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
                        {sc.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sc.area}</span>
                      </div>
                    </div>
                    <div className={`shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-xl border ${aqiTheme.border} ${aqiTheme.bg}`}>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">AQI</span>
                      <span className={`text-lg font-black font-mono leading-tight ${aqiTheme.text}`}>
                        {hasAQI ? aqiVal : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Category row */}
                  <div className="flex items-center justify-between gap-2 text-[11px] border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${aqiTheme.dot}`} />
                      <span className="text-slate-700 font-medium truncate">{sc.category}</span>
                      {sc.pm25 !== null && sc.pm25 !== undefined && (
                        <span className="text-slate-400 font-mono shrink-0">({sc.pm25} µg/m³)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{sc.latitude.toFixed(2)}°N</span>
                  </div>

                  {/* Assembly decision block */}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Assembly Rule</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 max-w-[140px] truncate ${sc.badge}`}>
                        {sc.rec_short}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{sc.recommendation}</p>
                  </div>

                  {/* Data source label */}
                  <div className="flex items-center justify-between gap-2 text-[10px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-1 text-slate-500 shrink-0">
                      <Info className="w-2.5 h-2.5 text-sky-500" />
                      Source:
                    </span>
                    <span className={`font-mono font-bold truncate ${sc.is_estimated ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {sc.is_estimated ? '⚠ ' : '✓ '}{sc.station_name ? `CPCB: ${sc.station_name}` : sc.aqi_source}
                    </span>
                  </div>

                  {/* Footer: students + alert button */}
                  <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Users className="w-3.5 h-3.5 shrink-0" /> Enrolled:
                      </span>
                      <span className="font-mono font-bold text-slate-800">{sc.student_count === null ? 'Not published' : sc.student_count.toLocaleString()}</span>
                    </div>
                    {individualNotice[sc.id] ? (
                      <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                        {individualNotice[sc.id]}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleIndividualSchoolBroadcast(sc)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-slate-900 transition"
                      >
                        <Send className="w-3 h-3 text-amber-500" />
                        Alert Campus Parents
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          LOAD MORE
      ══════════════════════════════════════════════════════ */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 transition shadow-sm disabled:opacity-50"
          >
            {loadingMore ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />Fetching campuses...</>
            ) : (
              <>Load more in {currentCity.name}<ChevronRight className="w-3.5 h-3.5 text-emerald-600" /></>
            )}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CPCB PROTOCOL REFERENCE PANEL
      ══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
            CPCB / AIRGUARD Morning Assembly Decision Framework
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { range: 'AQI 0–50',   label: 'Outdoors Safe',    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Full outdoor assembly, sports drills permitted without restriction.' },
            { range: 'AQI 51–100', label: 'Assembly Allowed', badge: 'bg-teal-50 text-teal-700 border-teal-200',       desc: 'Outdoor assembly permitted. Monitor sensitive students.' },
            { range: 'AQI 101–150',label: 'Limit Exertion',   badge: 'bg-amber-50 text-amber-700 border-amber-200',     desc: 'Keep assembly under 15 mins. High-intensity PE moved indoors.' },
            { range: 'AQI > 150',  label: 'Shift Indoors',    badge: 'bg-orange-50 text-orange-700 border-orange-200',   desc: 'Conduct assembly via intercom/classroom. Cancel outdoor sports entirely.' },
          ].map((item) => (
            <div key={item.range} className="min-w-0 p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1">
              <span className="text-[11px] font-bold text-slate-700 font-mono block">{item.range}</span>
              <p className={`text-xs font-bold inline-block px-1.5 py-0.5 rounded border ${item.badge}`}>{item.label}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

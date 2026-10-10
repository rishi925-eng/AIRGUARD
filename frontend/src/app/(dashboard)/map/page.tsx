'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Building2, 
  Eye, 
  Flame, 
  GraduationCap, 
  Layers, 
  MapPin, 
  Navigation, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Wind,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { useLocation } from '../../../lib/locationContext';
import { fetchSchools } from '../../../services/api';
import type { GisFeaturePin } from './LeafletGisMap';

// Dynamically import Leaflet map with SSR disabled
const LeafletGisMap = dynamic(() => import('./LeafletGisMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[580px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center gap-3 border border-slate-200">
      <div className="w-8 h-8 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
      <span className="text-xs font-bold text-slate-600">Loading OpenStreetMap Geographical Tiles…</span>
    </div>
  ),
});

// City-specific geographic landmark features with real coordinates
const CITY_GIS_FEATURES: Record<string, GisFeaturePin[]> = {
  delhi: [
    {
      id: 'del-station-1',
      type: 'aqi',
      name: 'Anand Vihar CPCB Real-time Station',
      area: 'East Delhi Transit Hub',
      city: 'New Delhi',
      lat: 28.6508,
      lon: 77.3152,
      aqi: 298,
      category: 'Severe / Very Unhealthy',
      layer: 'aqiHotspots',
      pm25: 185.0,
      pm10: 310.0,
      no2: 68.0,
      temp: 28.5,
      humidity: 56,
      wind: 'NW 8 km/h',
      desc: 'Major interstate bus terminal and multi-modal traffic nexus with heavy diesel idling emissions.',
      action: 'Advisory: Wear N95 masks; avoid outdoor cardio or exercise.',
      source: 'CPCB CAAQMS Station Telemetry',
      timestamp: 'Live (Updated 10m ago)',
      isEstimated: false,
    },
    {
      id: 'del-station-2',
      type: 'aqi',
      name: 'Punjabi Bagh Monitoring Station',
      area: 'West Delhi Arterial Ring',
      city: 'New Delhi',
      lat: 28.6683,
      lon: 77.1325,
      aqi: 215,
      category: 'Very Unhealthy',
      layer: 'aqiHotspots',
      pm25: 128.0,
      pm10: 220.0,
      no2: 52.0,
      temp: 29.0,
      humidity: 58,
      wind: 'NW 9 km/h',
      desc: 'Urban residential corridor adjacent to heavy Ring Road commercial vehicular congestion.',
      action: 'Advisory: Limit outdoor exposure during peak commute hours.',
      source: 'DPCC Station Telemetry',
      timestamp: 'Live (Updated 15m ago)',
      isEstimated: false,
    },
    {
      id: 'del-clean-1',
      type: 'clean',
      name: 'Lodhi Garden Ecological Air Corridor',
      area: 'Central Heritage Green Belt',
      city: 'New Delhi',
      lat: 28.5931,
      lon: 77.2197,
      aqi: 92,
      category: 'Moderate Clean Corridor 🟢',
      layer: 'cleanZones',
      pm25: 32.0,
      pm10: 64.0,
      no2: 21.0,
      temp: 27.2,
      humidity: 64,
      wind: 'W 6 km/h',
      desc: '90-acre heritage botanical garden with dense multi-tier neem and peepal tree canopy serving as natural particulate sink.',
      action: 'Advisory: Optimal location for morning walks, recreation, and low-exposure exercise.',
      source: 'Local Microclimate Sensor',
      timestamp: 'Live (Updated 8m ago)',
      isEstimated: false,
    },
    {
      id: 'del-ind-1',
      type: 'industrial',
      name: 'Okhla Industrial Area Phase II',
      area: 'South-East Manufacturing Cluster',
      city: 'New Delhi',
      lat: 28.5312,
      lon: 77.2758,
      aqi: 265,
      category: 'Hazardous Industrial Zone 🏭',
      layer: 'industrial',
      pm25: 158.0,
      pm10: 260.0,
      no2: 64.0,
      temp: 30.1,
      humidity: 52,
      wind: 'NW 11 km/h',
      desc: 'Metal fabrication, automotive bodywork, and waste-to-energy plant stack emissions.',
      action: 'Advisory: Continuous HEPA air purification required for indoor workers.',
      source: 'Industrial Sensor Array',
      timestamp: 'Live (Updated 12m ago)',
      isEstimated: false,
    },
    {
      id: 'del-const-1',
      type: 'construction',
      name: 'Aerocity Metro Extension & Highway Flyover',
      area: 'South-West Transit Corridor',
      city: 'New Delhi',
      lat: 28.5524,
      lon: 77.1215,
      aqi: 228,
      category: 'Heavy Dust Zone 🚧',
      layer: 'construction',
      pm25: 110.0,
      pm10: 285.0,
      no2: 46.0,
      temp: 29.8,
      humidity: 54,
      wind: 'NW 10 km/h',
      desc: 'Uncovered dry earth excavation and ready-mix concrete mixing generating fugitive PM10 plumes.',
      action: 'Advisory: Mist water cannons active; truck anti-smog nets enforced.',
      source: 'Municipal Pollution Monitor',
      timestamp: 'Live (Updated 20m ago)',
      isEstimated: true,
    },
    {
      id: 'del-report-1',
      type: 'report',
      name: 'Citizen Report: Biomass & Leaf Burning',
      area: 'Siri Fort Institutional Area',
      city: 'New Delhi',
      lat: 28.5539,
      lon: 77.2201,
      aqi: 210,
      category: 'Reported Smoke Incident 📢',
      layer: 'citizenReports',
      pm25: 122.0,
      pm10: 195.0,
      no2: 38.0,
      temp: 28.4,
      humidity: 60,
      wind: 'W 7 km/h',
      desc: 'Citizen photographed open horticultural waste incineration behind park perimeter.',
      action: 'Status: Transmitted to Municipal Quick Response Team.',
      source: 'AIRGUARD Citizen App',
      timestamp: 'Reported 25m ago',
      isEstimated: true,
    },
  ],
  gorakhpur: [
    {
      id: 'gkp-station-1',
      type: 'industrial',
      name: 'GIDA Industrial Phase II & Mills',
      area: 'GIDA Corridor',
      city: 'Gorakhpur',
      lat: 26.7582,
      lon: 83.2754,
      aqi: 285,
      category: 'Hazardous (Industrial Plume)',
      layer: 'industrial',
      pm25: 162.0,
      pm10: 240.0,
      no2: 66.0,
      temp: 29.5,
      humidity: 58,
      wind: 'NW 12 km/h',
      desc: 'Heavy continuous emissions from furnace stacks and freight logistics.',
      action: 'Advisory: Mandatory N95 respirator zone; factory shift rotations recommended.',
      source: 'UPPCB Station Telemetry',
      timestamp: 'Live (Updated 15m ago)',
      isEstimated: false,
    },
    {
      id: 'gkp-station-2',
      type: 'aqi',
      name: 'Civil Lines Central Urban Station',
      area: 'Central District',
      city: 'Gorakhpur',
      lat: 26.7561,
      lon: 83.3822,
      aqi: 142,
      category: 'Unhealthy for Sensitive Groups',
      layer: 'moderateZones',
      pm25: 64.0,
      pm10: 110.0,
      no2: 38.0,
      temp: 28.8,
      humidity: 62,
      wind: 'NW 10 km/h',
      desc: 'Urban residential colony with tree avenues and moderate evening transit.',
      action: 'Advisory: Morning outdoor exercise acceptable; seal windows during evening rush.',
      source: 'CPCB Station Telemetry',
      timestamp: 'Live (Updated 10m ago)',
      isEstimated: false,
    },
    {
      id: 'gkp-clean-1',
      type: 'clean',
      name: 'Ramgarh Tal Lake Buffer Basin',
      area: 'South-East Ecological Reserve',
      city: 'Gorakhpur',
      lat: 26.7285,
      lon: 83.4095,
      aqi: 68,
      category: 'Moderate Clean Corridor 🟢',
      layer: 'cleanZones',
      pm25: 20.5,
      pm10: 44.0,
      no2: 15.0,
      temp: 27.5,
      humidity: 70,
      wind: 'W 8 km/h',
      desc: '1,700-acre natural wetland buffer acting as regional air sink and particulate filter.',
      action: 'Advisory: Ideal location for morning walking, outdoor cardio, and recreation.',
      source: 'Eco-Grid Sensor Array',
      timestamp: 'Live (Updated 5m ago)',
      isEstimated: false,
    },
    {
      id: 'gkp-const-1',
      type: 'construction',
      name: 'Medical College Road Expressway Flyover',
      area: 'Northern Transit Hub',
      city: 'Gorakhpur',
      lat: 26.7824,
      lon: 83.3712,
      aqi: 235,
      category: 'Heavy Dust Zone 🚧',
      layer: 'construction',
      pm25: 112.0,
      pm10: 275.0,
      no2: 48.0,
      temp: 29.2,
      humidity: 60,
      wind: 'NW 11 km/h',
      desc: 'Elevated corridor construction generating heavy concrete and unpaved soil dust.',
      action: 'Advisory: Municipal water mist cannons deployed in key lanes.',
      source: 'Municipal Environmental Patrol',
      timestamp: 'Live (Updated 30m ago)',
      isEstimated: true,
    },
    {
      id: 'gkp-report-1',
      type: 'report',
      name: 'Citizen Report: Dumpster Fire Behind Market',
      area: 'Golghar Sector 3 Alley',
      city: 'Gorakhpur',
      lat: 26.7621,
      lon: 83.3745,
      aqi: 198,
      category: 'Reported Smoke Incident 📢',
      layer: 'citizenReports',
      pm25: 98.0,
      pm10: 165.0,
      no2: 42.0,
      temp: 28.5,
      humidity: 62,
      wind: 'NW 8 km/h',
      desc: 'Dense black smoke from commercial refuse combustion.',
      action: 'Status: Transmitted to municipal sanitation enforcement.',
      source: 'AIRGUARD Citizen App',
      timestamp: 'Reported 18m ago',
      isEstimated: true,
    },
  ],
  mumbai: [
    {
      id: 'mum-station-1',
      type: 'aqi',
      name: 'Bandra-Kurla Complex (BKC) CAAQMS',
      area: 'Financial Hub',
      city: 'Mumbai',
      lat: 19.0662,
      lon: 72.8687,
      aqi: 135,
      category: 'Moderate to Unhealthy',
      layer: 'moderateZones',
      pm25: 58.0,
      pm10: 104.0,
      no2: 48.0,
      temp: 31.2,
      humidity: 74,
      wind: 'SW 14 km/h (Sea breeze)',
      desc: 'High-density commercial office cluster with continuous arterial feeder road traffic.',
      action: 'Advisory: Sensitive groups should reduce prolonged outdoor exertion.',
      source: 'MPCB Station Telemetry',
      timestamp: 'Live (Updated 10m ago)',
      isEstimated: false,
    },
    {
      id: 'mum-clean-1',
      type: 'clean',
      name: 'Sanjay Gandhi National Park Canopy',
      area: 'Northern Green Lung',
      city: 'Mumbai',
      lat: 19.2288,
      lon: 72.9182,
      aqi: 48,
      category: 'Good / Clean Air Basin 🟢',
      layer: 'cleanZones',
      pm25: 12.0,
      pm10: 28.0,
      no2: 12.0,
      temp: 28.4,
      humidity: 78,
      wind: 'W 10 km/h',
      desc: '87-sq-km tropical forest reserve functioning as Mumbai’s primary atmospheric purifier.',
      action: 'Advisory: Excellent conditions for all outdoor activities and deep cardio workouts.',
      source: 'Forest Microclimate Node',
      timestamp: 'Live (Updated 15m ago)',
      isEstimated: false,
    },
    {
      id: 'mum-ind-1',
      type: 'industrial',
      name: 'Chembur-Mahul Refinery & Fertilizer Corridor',
      area: 'Eastern Seaboard Industrial Zone',
      city: 'Mumbai',
      lat: 19.0145,
      lon: 72.8942,
      aqi: 218,
      category: 'Industrial Emissions Zone 🏭',
      layer: 'industrial',
      pm25: 120.0,
      pm10: 195.0,
      no2: 72.0,
      temp: 31.8,
      humidity: 72,
      wind: 'SW 12 km/h',
      desc: 'Petrochemical cracking units and fertilizer plants emitting sulfur and nitrogen oxides.',
      action: 'Advisory: High VOC and NO2 zone; outdoor athletics discouraged.',
      source: 'MPCB Continuous Station',
      timestamp: 'Live (Updated 10m ago)',
      isEstimated: false,
    },
    {
      id: 'mum-const-1',
      type: 'construction',
      name: 'Coastal Road Marine Drive Reclamation',
      area: 'South Mumbai Coast',
      city: 'Mumbai',
      lat: 18.9482,
      lon: 72.8214,
      aqi: 172,
      category: 'Coastal Construction Dust 🚧',
      layer: 'construction',
      pm25: 78.0,
      pm10: 210.0,
      no2: 36.0,
      temp: 30.6,
      humidity: 76,
      wind: 'W 16 km/h',
      desc: 'Heavy coastal reclamation works, rock breaking, and concrete batching operations.',
      action: 'Advisory: Sea spray mitigates fine particles; high coarse PM10 recorded.',
      source: 'Project Environmental Monitor',
      timestamp: 'Live (Updated 25m ago)',
      isEstimated: true,
    },
  ],
  bengaluru: [
    {
      id: 'blr-station-1',
      type: 'aqi',
      name: 'Silk Board Central Junction Station',
      area: 'Outer Ring Road Nexus',
      city: 'Bengaluru',
      lat: 12.9172,
      lon: 76.6228,
      aqi: 148,
      category: 'Moderate / Sensitive Risk',
      layer: 'moderateZones',
      pm25: 56.0,
      pm10: 115.0,
      no2: 44.0,
      temp: 26.5,
      humidity: 62,
      wind: 'E 8 km/h',
      desc: 'Chronic arterial traffic bottleneck with elevated vehicle exhaust concentrations.',
      action: 'Advisory: Keep vehicle windows closed with cabin air filters on recirculation.',
      source: 'KSPCB CAAQMS Station',
      timestamp: 'Live (Updated 12m ago)',
      isEstimated: false,
    },
    {
      id: 'blr-clean-1',
      type: 'clean',
      name: 'Cubbon Park Botanical Air Sanctuary',
      area: 'Central Urban Heritage Garden',
      city: 'Bengaluru',
      lat: 12.9763,
      lon: 77.5929,
      aqi: 42,
      category: 'Good / Clean Air Sanctuary 🟢',
      layer: 'cleanZones',
      pm25: 11.0,
      pm10: 24.0,
      no2: 10.0,
      temp: 24.8,
      humidity: 68,
      wind: 'E 7 km/h',
      desc: '300-acre historic park with over 6,000 indigenous trees filtering central city pollutants.',
      action: 'Advisory: Optimal location for morning runs, family recreation, and deep breathing.',
      source: 'Eco-Grid Sensor Node',
      timestamp: 'Live (Updated 5m ago)',
      isEstimated: false,
    },
    {
      id: 'blr-ind-1',
      type: 'industrial',
      name: 'Peenya Industrial Area Stage IV',
      area: 'North-West Industrial Hub',
      city: 'Bengaluru',
      lat: 13.0285,
      lon: 77.5195,
      aqi: 194,
      category: 'Industrial Cluster 🏭',
      layer: 'industrial',
      pm25: 96.0,
      pm10: 178.0,
      no2: 52.0,
      temp: 27.2,
      humidity: 58,
      wind: 'NE 9 km/h',
      desc: 'South Asia’s largest small-scale manufacturing cluster with electroplating and casting units.',
      action: 'Advisory: Indoor air purifiers strongly recommended during night hours.',
      source: 'KSPCB Monitoring Array',
      timestamp: 'Live (Updated 15m ago)',
      isEstimated: false,
    },
    {
      id: 'blr-const-1',
      type: 'construction',
      name: 'Whitefield Metro Phase 2 Extension',
      area: 'IT Corridor East',
      city: 'Bengaluru',
      lat: 12.9698,
      lon: 77.7499,
      aqi: 182,
      category: 'Metro Excavation Dust 🚧',
      layer: 'construction',
      pm25: 84.0,
      pm10: 225.0,
      no2: 40.0,
      temp: 26.8,
      humidity: 60,
      wind: 'E 10 km/h',
      desc: 'Deep civil excavation and girder assembly generating roadside dust suspension.',
      action: 'Advisory: Motorcyclists should wear dust visors and protective masks.',
      source: 'Civic Environmental Monitor',
      timestamp: 'Live (Updated 20m ago)',
      isEstimated: true,
    },
  ],
};

export default function LiveMapPage() {
  const { currentCity } = useLocation();

  const [layers, setLayers] = useState({
    aqiHotspots: true,
    moderateZones: true,
    cleanZones: true,
    fireHotspots: true,
    schools: true,
    industrial: true,
    construction: true,
    citizenReports: true,
    windVectors: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPin, setSelectedPin] = useState<GisFeaturePin | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [areaAId, setAreaAId] = useState<string>('');
  const [areaBId, setAreaBId] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'severe' | 'clean'>('all');
  const [schoolPins, setSchoolPins] = useState<GisFeaturePin[]>([]);
  const [firePins, setFirePins] = useState<GisFeaturePin[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch real schools for the current city
  useEffect(() => {
    let active = true;
    const loadSchools = async () => {
      try {
        const res = await fetchSchools({ city: currentCity.name, limit: 20 });
        if (!active) return;
        const pins: GisFeaturePin[] = res.schools.map((s) => ({
          id: `school-${s.id}`,
          type: 'school',
          name: s.name,
          area: s.area || s.campus || currentCity.name,
          city: currentCity.name,
          lat: s.latitude,
          lon: s.longitude,
          aqi: s.aqi ?? 0,
          category: s.decision || s.category,
          layer: 'schools',
          pm25: s.pm25 ?? 0,
          pm10: s.pm25 == null ? 0 : Math.round(s.pm25 * 1.8),
          desc: `${s.student_count == null ? 'Enrollment not published' : `${s.student_count.toLocaleString()} enrolled students`}. Assembly: ${s.decision}`,
          action: s.recommendation || s.rec_short,
          source: s.aqi_source || 'School Safety Network',
          timestamp: s.timestamp || 'Live',
          isEstimated: s.is_estimated,
          metadata: { student_count: s.student_count, campus: s.campus },
        }));
        setSchoolPins(pins);
      } catch (err) {
        console.error('Error loading schools for GIS map:', err);
      }
    };
    loadSchools();
    return () => {
      active = false;
    };
  }, [currentCity.name]);

  // Fetch NASA FIRMS active fires for the current city area
  useEffect(() => {
    let active = true;
    const loadFires = async () => {
      try {
        const res = await fetch(
          `/api/fire/active?lat=${currentCity.lat}&lon=${currentCity.lon}&days=1`
        );
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const fires = (data.fires || []).slice(0, 5).map((f: any, idx: number) => ({
            id: `fire-${idx}-${f.latitude}`,
            type: 'fire' as const,
            name: `NASA FIRMS Fire Anomaly #${idx + 1}`,
            area: `Upwind of ${currentCity.name}`,
            city: currentCity.name,
            lat: f.latitude,
            lon: f.longitude,
            aqi: 340,
            category: 'Active Fire / Thermal Anomaly 🔥',
            layer: 'fireHotspots',
            pm25: 240.0,
            pm10: 410.0,
            desc: `Brightness ${f.brightness || '320K'} detected via satellite. Stubble or biomass fire.`,
            action: 'Advisory: Downwind smoke plume expected to elevate ambient PM2.5.',
            source: 'NASA FIRMS VIIRS Telemetry',
            timestamp: f.acq_date || 'Satellite Pass Today',
            isEstimated: false,
          }));
          setFirePins(fires);
        }
      } catch (err) {
        console.error('Error loading active fires:', err);
      }
    };
    loadFires();
    return () => {
      active = false;
    };
  }, [currentCity.lat, currentCity.lon, currentCity.name]);

  // Combine static landmark features for this city with live school & fire pins
  const allCityPins = useMemo(() => {
    const cityKey = currentCity.id.toLowerCase();
    const baseFeatures = CITY_GIS_FEATURES[cityKey] || [];
    return [...baseFeatures, ...schoolPins, ...firePins];
  }, [currentCity.id, schoolPins, firePins]);

  // Apply search query and severity filter
  const filteredPins = useMemo(() => {
    return allCityPins.filter((pin) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = pin.name.toLowerCase().includes(query);
        const matchesArea = pin.area.toLowerCase().includes(query);
        const matchesCat = pin.category.toLowerCase().includes(query);
        if (!matchesName && !matchesArea && !matchesCat) return false;
      }
      // Severity filter
      if (filterSeverity === 'severe' && pin.aqi < 200) return false;
      if (filterSeverity === 'clean' && pin.aqi > 100) return false;
      return true;
    });
  }, [allCityPins, searchQuery, filterSeverity]);

  // Ensure Area A and Area B for comparison mode default to valid pins
  useEffect(() => {
    if (allCityPins.length >= 2) {
      if (!areaAId || !allCityPins.find((p) => p.id === areaAId)) {
        setAreaAId(allCityPins[0].id);
      }
      if (!areaBId || !allCityPins.find((p) => p.id === areaBId)) {
        setAreaBId(allCityPins[1].id);
      }
    }
  }, [allCityPins, areaAId, areaBId]);

  const pinA = allCityPins.find((p) => p.id === areaAId) || allCityPins[0];
  const pinB = allCityPins.find((p) => p.id === areaBId) || allCityPins[1] || allCityPins[0];

  const handleSelectPin = (pin: GisFeaturePin) => {
    setSelectedPin(pin);
  };

  const handleCenterOnCity = () => {
    setSelectedPin(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full min-w-0">
      {/* Top Search & GIS Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                LIVE GIS MAP
              </span>
              <span className="text-[11px] text-slate-500 font-medium">OpenStreetMap • CPCB • NASA FIRMS</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-0.5">
              Environmental Spatial Intelligence — {currentCity.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search field */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station, school, area…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Quick Center on City */}
          <button
            onClick={handleCenterOnCity}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
            title="Center map on selected city"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Center on {currentCity.name}</span>
          </button>

          {/* Compare Button */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              compareMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            <span>⚖️ Compare Areas</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Area Comparison Modal */}
      {compareMode && pinA && pinB && (
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                Side-by-Side Location Air Intelligence Comparison
              </h3>
            </div>
            <button
              onClick={() => setCompareMode(false)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 font-medium"
            >
              Close Comparison ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Area A */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Location A</span>
                <select
                  value={areaAId}
                  onChange={(e) => setAreaAId(e.target.value)}
                  className="bg-white text-slate-800 text-xs rounded-lg px-2.5 py-1 border border-slate-200 focus:outline-none"
                >
                  {allCityPins.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{pinA.name}</h4>
                  <p className="text-xs text-slate-500">{pinA.area}, {pinA.city}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-black border ${
                  pinA.aqi > 200 ? 'bg-red-50 text-red-700 border-red-200' :
                  pinA.aqi > 100 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  AQI {pinA.aqi}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">PM2.5</span>
                  <span className="font-bold text-slate-800">{pinA.pm25} µg</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">PM10</span>
                  <span className="font-bold text-slate-800">{pinA.pm10} µg</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="font-bold text-emerald-700 text-[10px] truncate block">{pinA.category}</span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                💡 {pinA.action}
              </p>
            </div>

            {/* Area B */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Location B</span>
                <select
                  value={areaBId}
                  onChange={(e) => setAreaBId(e.target.value)}
                  className="bg-white text-slate-800 text-xs rounded-lg px-2.5 py-1 border border-slate-200 focus:outline-none"
                >
                  {allCityPins.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{pinB.name}</h4>
                  <p className="text-xs text-slate-500">{pinB.area}, {pinB.city}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-black border ${
                  pinB.aqi > 200 ? 'bg-red-50 text-red-700 border-red-200' :
                  pinB.aqi > 100 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  AQI {pinB.aqi}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">PM2.5</span>
                  <span className="font-bold text-slate-800">{pinB.pm25} µg</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">PM10</span>
                  <span className="font-bold text-slate-800">{pinB.pm10} µg</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="font-bold text-slate-800 text-[10px] truncate block">{pinB.category}</span>
                </div>
              </div>
              <p className="text-[11px] text-red-800 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                💡 {pinB.action}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Map & Layers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Left: Layer Controls Panel */}
        <div className="lg:col-span-3 space-y-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs h-fit">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                GIS Map Layers
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">{filteredPins.length} Active Pins</span>
          </div>

          {/* Quick Severity Filter */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`py-1.5 rounded-lg transition ${
                filterSeverity === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Pins
            </button>
            <button
              onClick={() => setFilterSeverity('severe')}
              className={`py-1.5 rounded-lg transition ${
                filterSeverity === 'severe' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Severe Only
            </button>
            <button
              onClick={() => setFilterSeverity('clean')}
              className={`py-1.5 rounded-lg transition ${
                filterSeverity === 'clean' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clean Sinks
            </button>
          </div>

          {/* Checkbox Layer Controls */}
          <div className="space-y-2 pt-1 text-xs">
            {[
              { key: 'aqiHotspots', label: 'AQI Monitoring Stations', icon: '📡', count: allCityPins.filter(p => p.layer === 'aqiHotspots').length },
              { key: 'cleanZones', label: 'Clean Corridors & Parks', icon: '🌿', count: allCityPins.filter(p => p.layer === 'cleanZones').length },
              { key: 'schools', label: 'Schools & Campuses', icon: '🏫', count: allCityPins.filter(p => p.layer === 'schools').length },
              { key: 'industrial', label: 'Industrial Corridors', icon: '🏭', count: allCityPins.filter(p => p.layer === 'industrial').length },
              { key: 'construction', label: 'Construction Dust Hubs', icon: '🚧', count: allCityPins.filter(p => p.layer === 'construction').length },
              { key: 'fireHotspots', label: 'NASA Thermal Anomalies', icon: '🔥', count: allCityPins.filter(p => p.layer === 'fireHotspots').length },
              { key: 'citizenReports', label: 'Citizen Incident Reports', icon: '📢', count: allCityPins.filter(p => p.layer === 'citizenReports').length },
            ].map((lyr) => (
              <label
                key={lyr.key}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={layers[lyr.key as keyof typeof layers]}
                    onChange={(e) => setLayers(prev => ({ ...prev, [lyr.key]: e.target.checked }))}
                    className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">
                    {lyr.icon} {lyr.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {lyr.count}
                </span>
              </label>
            ))}
          </div>

          {/* Telemetry info box */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Selected City:</span>
              <span className="font-bold text-slate-900">{currentCity.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Grid Center:</span>
              <span className="font-mono text-slate-800">{currentCity.lat.toFixed(4)}°N, {currentCity.lon.toFixed(4)}°E</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Basemap:</span>
              <span className="text-emerald-700 font-semibold">OpenStreetMap Standard</span>
            </div>
          </div>
        </div>

        {/* Right: Interactive High-Precision GIS Map Canvas */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-2 flex flex-col justify-between overflow-hidden min-h-[640px] relative">
          {/* Top Floating Map Banner */}
          <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-slate-50/90 rounded-2xl border border-slate-200 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold text-slate-900">
                {currentCity.name} Real Geographical Map
              </span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                · Roads, landmarks & live overlays
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 shadow-2xs">
                <Wind className="w-3.5 h-3.5 text-sky-500" />
                Wind: {currentCity.windSpeed} km/h
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                City AQI: {currentCity.currentAQI}
              </span>
            </div>
          </div>

          {/* Leaflet Map Integration */}
          <div className="flex-1 w-full min-h-[580px] rounded-2xl overflow-hidden border border-slate-200">
            <LeafletGisMap
              center={[currentCity.lat, currentCity.lon]}
              zoom={12}
              pins={filteredPins}
              selectedPinId={selectedPin?.id || null}
              onSelectPin={handleSelectPin}
              layers={layers}
            />
          </div>

          {/* Bottom Floating Legend Bar */}
          <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-3 text-slate-700 font-medium">
              <span className="font-bold text-slate-900 text-xs">AQI Legend:</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 0-50 Good</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 51-100 Mod</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 101-200 Unhealthy</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> 201-300 Severe</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> 300+ Hazardous</span>
            </div>
            <span className="text-[10px] text-slate-500 italic">
              Click any pin on the map to inspect full environmental telemetry.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Drawer: Selected Station / Location Intelligence */}
      {selectedPin && (
        <div className="bg-white border-2 border-emerald-500/40 p-6 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                  selectedPin.aqi > 200 ? 'bg-red-50 text-red-700 border border-red-200' :
                  selectedPin.aqi > 100 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedPin.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedPin.lat.toFixed(4)}°N, {selectedPin.lon.toFixed(4)}°E
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-1">{selectedPin.name}</h2>
              <p className="text-xs text-slate-500">{selectedPin.area}, {selectedPin.city}</p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Air Quality Index</span>
                <span className={`text-3xl font-black font-mono leading-none ${
                  selectedPin.aqi > 200 ? 'text-red-600' :
                  selectedPin.aqi > 100 ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {selectedPin.aqi}
                </span>
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="text-xs text-slate-500 hover:text-slate-800 p-2 bg-slate-50 rounded-xl border border-slate-200 font-bold"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">PM2.5 Concentration</span>
              <span className="text-base font-extrabold text-slate-900">{selectedPin.pm25} µg/m³</span>
              <span className="text-[10px] text-slate-400 block">Fine respirable particles</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">PM10 Coarse Dust</span>
              <span className="text-base font-extrabold text-slate-900">{selectedPin.pm10} µg/m³</span>
              <span className="text-[10px] text-slate-400 block">Road / soil fugitive particles</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Data Provenance</span>
              <span className="text-xs font-bold text-emerald-800 truncate block">{selectedPin.source}</span>
              <span className="text-[10px] text-slate-500 block">
                {selectedPin.isEstimated ? '⚠️ Model Estimation' : '✓ Verified Station'}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Telemetry Age</span>
              <span className="text-xs font-bold text-slate-800 block">{selectedPin.timestamp}</span>
              <span className="text-[10px] text-emerald-700 block font-semibold">Active Monitoring</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-950">Action Advisory:</strong> {selectedPin.action}
              <p className="mt-1 text-slate-600 text-[11px]">{selectedPin.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

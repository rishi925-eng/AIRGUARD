'use client';

/**
 * LeafletGisMap — Interactive GIS Map with OpenStreetMap tiles and environmental telemetry overlays.
 *
 * Dynamically loaded on the client side (SSR disabled) to prevent Next.js server-side issues.
 */

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface GisFeaturePin {
  id: string;
  type: 'aqi' | 'fire' | 'school' | 'industrial' | 'construction' | 'clean' | 'report';
  name: string;
  area: string;
  city: string;
  lat: number;
  lon: number;
  aqi: number;
  category: string;
  layer: string;
  pm25: number;
  pm10: number;
  no2?: number;
  temp?: number;
  humidity?: number;
  wind?: string;
  desc: string;
  action: string;
  source: string;
  timestamp: string;
  isEstimated: boolean;
  metadata?: Record<string, any>;
}

interface Props {
  center: [number, number];
  zoom: number;
  pins: GisFeaturePin[];
  selectedPinId: string | null;
  onSelectPin: (pin: GisFeaturePin) => void;
  layers: {
    aqiHotspots: boolean;
    moderateZones: boolean;
    cleanZones: boolean;
    fireHotspots: boolean;
    schools: boolean;
    industrial: boolean;
    construction: boolean;
    citizenReports: boolean;
    windVectors: boolean;
  };
}

export default function LeafletGisMap({
  center,
  zoom,
  pins,
  selectedPinId,
  onSelectPin,
  layers,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const overlaysLayerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center,
          zoom,
          zoomControl: false, // We'll add custom positioned zoom control
          attributionControl: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });

        // Add Leaflet zoom control at top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // OpenStreetMap crisp standard tiles with roads, city names, and landmarks
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors | AIRGUARD GIS',
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        overlaysLayerRef.current = L.layerGroup().addTo(map);

        mapRef.current = map;
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        const map = mapRef.current;
        map.stop();
        markersLayerRef.current?.clearLayers();
        overlaysLayerRef.current?.clearLayers();
        map.off();
        map.remove();
        markersLayerRef.current = null;
        overlaysLayerRef.current = null;
        mapRef.current = null;
      }
    };
  }, []); // Mount only once

  // Update map view when center coordinates change (e.g. city switched)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(center, zoom, { duration: 0, animate: false });
  }, [center, zoom]);

  // Keep schools discovered around the city visible, including campuses near
  // the edge of the provider search radius.
  useEffect(() => {
    if (!mapRef.current || !layers.schools) return;
    const schoolPoints = pins
      .filter((pin) => pin.type === 'school')
      .map((pin) => [pin.lat, pin.lon]);
    if (schoolPoints.length === 0) return;

    import('leaflet').then((L) => {
      const bounds = L.latLngBounds(schoolPoints as [number, number][]);
      mapRef.current.fitBounds(bounds, {
        padding: [32, 32],
        maxZoom: Math.min(zoom, 12),
        animate: false,
      });
    });
  }, [pins, layers.schools, zoom]);

  // Redraw pins and overlays when pins, layers, or selected pin changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    import('leaflet').then((L) => {
      const markersLayer = markersLayerRef.current;
      const overlaysLayer = overlaysLayerRef.current;
      if (!markersLayer || !overlaysLayer) return;

      markersLayer.clearLayers();
      overlaysLayer.clearLayers();

      pins.forEach((pin) => {
        // Check if pin's layer is currently active
        let shouldShow = false;
        if (pin.layer === 'aqiHotspots' && layers.aqiHotspots) shouldShow = true;
        if (pin.layer === 'moderateZones' && layers.moderateZones) shouldShow = true;
        if (pin.layer === 'cleanZones' && layers.cleanZones) shouldShow = true;
        if (pin.layer === 'fireHotspots' && layers.fireHotspots) shouldShow = true;
        if (pin.layer === 'schools' && layers.schools) shouldShow = true;
        if (pin.layer === 'industrial' && layers.industrial) shouldShow = true;
        if (pin.layer === 'construction' && layers.construction) shouldShow = true;
        if (pin.layer === 'citizenReports' && layers.citizenReports) shouldShow = true;

        if (!shouldShow) return;

        // Determine color & icon
        let colorHex = '#10B981'; // Green
        let iconSymbol = '●';
        let typeBadge = 'AQI';

        if (pin.type === 'fire') {
          colorHex = '#EF4444';
          iconSymbol = '🔥';
          typeBadge = 'FIRE';
        } else if (pin.type === 'school') {
          colorHex = pin.aqi > 200 ? '#EF4444' : pin.aqi > 100 ? '#F59E0B' : '#10B981';
          iconSymbol = '🏫';
          typeBadge = 'SCHOOL';
        } else if (pin.type === 'industrial') {
          colorHex = '#8B5CF6';
          iconSymbol = '🏭';
          typeBadge = 'IND';
        } else if (pin.type === 'construction') {
          colorHex = '#F59E0B';
          iconSymbol = '🚧';
          typeBadge = 'DUST';
        } else if (pin.type === 'clean') {
          colorHex = '#10B981';
          iconSymbol = '🌿';
          typeBadge = 'CLEAN';
        } else if (pin.type === 'report') {
          colorHex = '#EC4899';
          iconSymbol = '📢';
          typeBadge = 'REPORT';
        } else {
          // Standard AQI pin
          if (pin.aqi > 250) {
            colorHex = '#881337'; // Severe / Maroon
            iconSymbol = '☣️';
          } else if (pin.aqi > 200) {
            colorHex = '#EF4444'; // Red
            iconSymbol = '⚠️';
          } else if (pin.aqi > 150) {
            colorHex = '#F97316'; // Orange
            iconSymbol = '●';
          } else if (pin.aqi > 100) {
            colorHex = '#F59E0B'; // Amber
            iconSymbol = '●';
          } else {
            colorHex = '#10B981'; // Emerald
            iconSymbol = '●';
          }
        }

        const isSelected = selectedPinId === pin.id;

        // Custom DivIcon for Leaflet
        const markerHtml = `
          <div style="
            display: flex;
            align-items: center;
            background: #FFFFFF;
            border: 2px solid ${colorHex};
            padding: 2px 7px;
            border-radius: 9999px;
            box-shadow: ${isSelected ? '0 0 0 4px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.15)'};
            font-family: inherit;
            cursor: pointer;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: all 0.2s ease;
            white-space: nowrap;
          ">
            <span style="font-size: 11px; margin-right: 4px;">${iconSymbol}</span>
            <span style="font-size: 11px; font-weight: 800; color: #1E293B;">${pin.aqi}</span>
            <span style="font-size: 9px; font-weight: 700; color: ${colorHex}; margin-left: 3px; text-transform: uppercase;">${typeBadge}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'airguard-gis-pin',
          html: markerHtml,
          iconSize: [60, 24],
          iconAnchor: [30, 12],
          popupAnchor: [0, -14],
        });

        const marker = L.marker([pin.lat, pin.lon], { icon: customIcon });

        // Build popup content
        const popupContent = `
          <div style="font-family: inherit; min-width: 200px; padding: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${colorHex}15; color: ${colorHex}; text-transform: uppercase;">
                ${pin.category}
              </span>
              <span style="font-size: 9px; color: #64748B;">${pin.timestamp || 'Live'}</span>
            </div>
            <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; margin: 0 0 2px 0;">${pin.name}</h4>
            <p style="font-size: 11px; color: #64748B; margin: 0 0 8px 0;">${pin.area}, ${pin.city}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; background: #F8FAFC; padding: 6px; border-radius: 8px;">
              <div>
                <span style="font-size: 9px; color: #64748B; display: block;">Current AQI</span>
                <span style="font-size: 16px; font-weight: 900; color: ${colorHex};">${pin.aqi}</span>
              </div>
              <div>
                <span style="font-size: 9px; color: #64748B; display: block;">PM2.5 Conc.</span>
                <span style="font-size: 14px; font-weight: 800; color: #1E293B;">${pin.pm25} µg/m³</span>
              </div>
            </div>

            <p style="font-size: 10px; color: #334155; margin: 0 0 6px 0; line-height: 1.4;">${pin.desc}</p>
            <div style="font-size: 10px; font-weight: 700; color: #047857; margin-bottom: 6px;">💡 ${pin.action}</div>
            
            <div style="border-top: 1px solid #E2E8F0; padding-top: 4px; display: flex; justify-content: space-between; font-size: 9px; color: #94A3B8;">
              <span>Source: ${pin.source}</span>
              <span>${pin.isEstimated ? '⚠️ Model Estimate' : '✓ Verified Station'}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('click', () => {
          onSelectPin(pin);
        });

        marker.addTo(markersLayer);

        // Add soft spatial circles for specific layers (e.g. Clean Sink, Industrial Corridor, Fire Bloom)
        if (pin.type === 'clean') {
          L.circle([pin.lat, pin.lon], {
            radius: 1400,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 4',
          }).addTo(overlaysLayer);
        } else if (pin.type === 'industrial') {
          L.circle([pin.lat, pin.lon], {
            radius: 1800,
            color: '#8B5CF6',
            fillColor: '#8B5CF6',
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: '3, 3',
          }).addTo(overlaysLayer);
        } else if (pin.type === 'fire') {
          L.circle([pin.lat, pin.lon], {
            radius: 2000,
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(overlaysLayer);
        }
      });
    });
  }, [pins, layers, selectedPinId, onSelectPin]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-2xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full min-h-[580px] z-0" />
    </div>
  );
}

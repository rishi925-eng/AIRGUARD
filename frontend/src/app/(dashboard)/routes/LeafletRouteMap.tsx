'use client';

/**
 * LeafletRouteMap — interactive road-route map using Leaflet + OpenStreetMap tiles.
 *
 * Dynamically imported (SSR disabled) from the routes page to avoid
 * Next.js server-side rendering issues with browser-only Leaflet APIs.
 *
 * Coordinate convention: Leaflet uses [lat, lon], OSRM GeoJSON uses [lon, lat].
 * All conversions are handled explicitly in this file.
 */

import React, { useEffect, useRef } from 'react';
import type { RouteAlternative } from '../../../services/api';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

type Point = { lat: number; lon: number };

interface Props {
  routes: RouteAlternative[];
  selected: number;
  start: Point;
  end: Point;
  onSelect: (index: number) => void;
}

// Palette for route polylines
const ROUTE_COLORS = ['#2dd4bf', '#60a5fa', '#f472b6', '#facc15'];
const ROUTE_COLORS_DIM = ['#164e63', '#1e3a5f', '#701a75', '#713f12'];

export default function LeafletRouteMap({ routes, selected, start, end, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);

  // Initialize map on mount
  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    // Dynamic import to avoid SSR issues
    import('leaflet').then(L => {
      if (!isMounted || !containerRef.current) return;
      // Fix default icon paths (broken in webpack/Next.js by default)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current) return; // Already initialized

      const map = L.map(containerRef.current!, {
        center: [start.lat, start.lon],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });

      // OpenStreetMap tiles (free, usage policy: https://operations.osmfoundation.org/policies/tiles/)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
    }).catch((error: unknown) => {
      if (isMounted) {
        console.error('Unable to load the route map. Please refresh and try again.', error);
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        const map = mapRef.current;
        map.stop();
        polylinesRef.current.forEach((layer) => layer.remove());
        markersRef.current.forEach((layer) => layer.remove());
        polylinesRef.current = [];
        markersRef.current = [];
        map.off();
        map.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Redraw routes, markers, and fit bounds whenever routes/selected/endpoints change
  useEffect(() => {
    if (!mapRef.current) return;

    let isMounted = true;
    import('leaflet').then(L => {
      if (!isMounted) return;
      const map = mapRef.current;
      if (!map) return;

      // Clear existing layers
      polylinesRef.current.forEach(p => p.remove());
      polylinesRef.current = [];
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const allLatLngs: [number, number][] = [];

      // Draw routes (non-selected first, selected last so it renders on top)
      if (routes.length > 0) {
        const orderedRoutes = routes
          .map((r, i) => ({ r, i }))
          .sort((a, b) => (a.i === selected ? 1 : b.i === selected ? -1 : 0));

        for (const { r, i } of orderedRoutes) {
          const isSelected = i === selected;
          // GeoJSON coords are [lon, lat] — Leaflet wants [lat, lon]
          const latlngs: [number, number][] = r.geometry.coordinates.map(
            ([lon, lat]) => [lat, lon]
          );
          if (latlngs.length < 2) continue;

          const color = isSelected ? ROUTE_COLORS[i % ROUTE_COLORS.length] : ROUTE_COLORS_DIM[i % ROUTE_COLORS_DIM.length];

          // Invisible wide click target
          const clickTarget = L.polyline(latlngs, {
            weight: 20,
            opacity: 0,
            interactive: true,
          }).addTo(map);
          clickTarget.on('click', () => onSelect(i));
          polylinesRef.current.push(clickTarget);

          // Visible route line
          const line = L.polyline(latlngs, {
            color,
            weight: isSelected ? 5 : 3,
            opacity: isSelected ? 0.95 : 0.45,
            interactive: false,
          }).addTo(map);
          polylinesRef.current.push(line);

          latlngs.forEach(ll => allLatLngs.push(ll));
        }
      }

      // Start marker
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#34d399;border:3px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const startMarker = L.marker([start.lat, start.lon], { icon: startIcon })
        .bindTooltip('Start', { permanent: false })
        .addTo(map);
      markersRef.current.push(startMarker);
      allLatLngs.push([start.lat, start.lon]);

      // End marker
      const endIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#f87171;border:3px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const endMarker = L.marker([end.lat, end.lon], { icon: endIcon })
        .bindTooltip('Destination', { permanent: false })
        .addTo(map);
      markersRef.current.push(endMarker);
      allLatLngs.push([end.lat, end.lon]);

      // Fit map to all route coordinates with padding
      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
      }
    }).catch((error: unknown) => {
      console.error('Unable to update the route map.', error);
    });
    return () => {
      isMounted = false;
    };
  }, [routes, selected, start, end, onSelect]);

  return (
    <div
      ref={containerRef}
      id="leaflet-map"
      style={{ width: '100%', height: '100%', minHeight: 320 }}
      aria-label="Interactive road route map"
    />
  );
}

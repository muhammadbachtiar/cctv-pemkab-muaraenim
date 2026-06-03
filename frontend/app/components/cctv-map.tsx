"use client";

import React, { useEffect, useRef, useState } from "react";
import { CCTVItem } from "../config/cctv-data";

interface CCTVMapProps {
  cameras: CCTVItem[];
  onSelectCamera?: (cctv: CCTVItem) => void;
}

export default function CCTVMap({ cameras, onSelectCamera }: CCTVMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapInstance = useRef<any>(null);

  // Load Leaflet CDN dynamically to avoid Next.js SSR problems and React 19 mismatches
  useEffect(() => {
    const loadLeaflet = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).L) {
          resolve();
          return;
        }

        // CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);

        // JS
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat script Leaflet"));
        document.head.appendChild(script);
      });
    };

    loadLeaflet()
      .then(() => setLeafletLoaded(true))
      .catch((err) => setMapError(err.message));
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Muara Enim coordinates (Kabupaten)
    const defaultCenter = [-3.6509, 103.7782];
    const defaultZoom = 11;

    // Clean up existing map instance
    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    try {
      const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);
      mapInstance.current = map;

      // Add Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Custom icon
      const cctvIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Filter cameras that have valid coordinates and are active
      const mapCameras = cameras.filter(
        (cam) => cam.isActive && cam.latitude !== null && cam.longitude !== null
      );

      if (mapCameras.length > 0) {
        const markersGroup = L.featureGroup();

        mapCameras.forEach((camera) => {
          const marker = L.marker([camera.latitude, camera.longitude], {
            icon: cctvIcon,
          });

          // Build preview iframe and action button inside popup
          const popupContent = document.createElement("div");
          popupContent.className = "p-1 flex flex-col gap-2 max-w-[260px]";
          popupContent.innerHTML = `
            <div class="flex flex-col">
              <span class="font-bold text-slate-800 text-sm">${camera.name}</span>
              <span class="text-xs text-slate-500">${camera.locationName || "Lokasi tidak diset"}</span>
              <span class="text-[10px] text-slate-400 mt-0.5">Lat: ${camera.latitude}, Lng: ${camera.longitude}</span>
            </div>
            <div class="w-[240px] h-[135px] bg-slate-900 rounded overflow-hidden relative border border-slate-200">
              <iframe 
                src="${camera.url}" 
                class="w-full h-full border-none" 
                scrolling="no" 
                allow="autoplay; fullscreen"
              ></iframe>
            </div>
          `;

          // Add a button to monitor from map directly
          if (onSelectCamera) {
            const btn = document.createElement("button");
            btn.className = "w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors mt-1 cursor-pointer text-center";
            btn.textContent = "Tampilkan di Monitoring";
            btn.onclick = () => {
              onSelectCamera(camera);
            };
            popupContent.appendChild(btn);
          }

          marker.bindPopup(popupContent);
          markersGroup.addLayer(marker);
        });

        markersGroup.addTo(map);

        // Fit map bounds to display all markers nicely
        map.fitBounds(markersGroup.getBounds(), { padding: [40, 40] });
      }
    } catch (err: any) {
      setMapError("Gagal menginisialisasi peta Leaflet: " + err.message);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletLoaded, cameras, onSelectCamera]);

  if (mapError) {
    return (
      <div className="w-full h-[60vh] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 p-6 text-center">
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-semibold text-slate-800">Gagal Memuat Peta</span>
        <span className="text-sm text-slate-500">{mapError}</span>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="w-full h-[60vh] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-slate-500">Memuat peta interaktif...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-slate-800">Peta Lokasi CCTV</h2>
        <p className="text-sm text-slate-500">Visualisasi geografis seluruh kamera CCTV Kabupaten Muara Enim yang aktif.</p>
      </div>
      <div ref={mapRef} className="w-full h-[65vh] rounded-2xl border border-slate-200 shadow-sm overflow-hidden z-10" />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CCTVItem, LayoutType, layoutOptions } from "../config/cctv-data";
import { api } from "../utils/api";
import LayoutSelector from "../components/layout-selector";
import CCTVViewer from "../components/cctv-viewer";
import CCTVSelectorModal from "../components/cctv-selector-modal";
import CCTVFullscreenModal from "../components/cctv-fullscreen-modal";
import CCTVMap from "../components/cctv-map";

export default function PublicCCTVPage() {
  const [activeTab, setActiveTab] = useState<"monitoring" | "map">("monitoring");
  const [layout, setLayout] = useState<LayoutType>("3x3");
  const [selectedCCTVs, setSelectedCCTVs] = useState<(CCTVItem | null)[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [fullscreenCCTV, setFullscreenCCTV] = useState<CCTVItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [cameras, setCameras] = useState<CCTVItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load public cameras
  const loadPublicCameras = async () => {
    setIsLoading(true);
    try {
      const fetched = await api.get<any[]>("/api/v1/cameras/public");
      const domain = process.env.NEXT_PUBLIC_CCTV_DOMAIN;

      const mapped: CCTVItem[] = fetched.map((cam) => ({
        ...cam,
        location: cam.locationName,
        url: `${domain}/${cam.path}/`,
      }));

      setCameras(mapped);
    } catch (err) {
      console.error("Gagal memuat CCTV publik:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPublicCameras();
  }, []);

  const getSlotCount = () => {
    const option = layoutOptions.find((o) => o.value === layout);
    return option ? option.cols * option.cols : 4;
  };

  // Auto fill slots on layout change or camera fetch
  useEffect(() => {
    const slotCount = getSlotCount();
    setSelectedCCTVs((prev) => {
      const newSlots = [...prev];
      // Keep existing slots that are still available
      const cleanedSlots = newSlots.map((slot) =>
        slot && cameras.some((c) => c.id === slot.id) ? cameras.find((c) => c.id === slot.id) || slot : null
      );

      const filledSlots = [...cleanedSlots];
      while (filledSlots.length < slotCount) {
        const usedIds = filledSlots.filter((c) => c !== null).map((c) => c!.id);
        const availableCCTV = cameras.find((c) => !usedIds.includes(c.id));
        filledSlots.push(availableCCTV || null);
      }
      return filledSlots.slice(0, slotCount);
    });
  }, [layout, cameras]);

  const handleSelectCCTV = (cctv: CCTVItem) => {
    if (isFullscreen) {
      setFullscreenCCTV(cctv);
    }
    setSelectedCCTVs((prev) => {
      const newSlots = [...prev];
      newSlots[currentSlot] = cctv;
      return newSlots;
    });
  };

  const openSelector = (slotIndex: number) => {
    setCurrentSlot(slotIndex);
    setSelectorOpen(true);
  };

  const handleOpenFullscreen = (cctv: CCTVItem) => {
    setFullscreenCCTV(cctv);
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setFullscreenCCTV(null);
  };

  const handleChangeFullscreenCCTV = () => {
    const slotIndex = selectedCCTVs.findIndex(
      (c) => c !== null && fullscreenCCTV !== null && c.id === fullscreenCCTV.id
    );
    if (slotIndex !== -1) {
      setCurrentSlot(slotIndex);
    }
    setSelectorOpen(true);
  };

  const handleSelectCameraFromMap = (cctv: CCTVItem) => {
    setCurrentSlot(0);
    handleSelectCCTV(cctv);
    setActiveTab("monitoring");
  };

  const selectedIds = selectedCCTVs.filter((c) => c !== null).map((c) => c!.id);
  const currentLayoutOption = layoutOptions.find((o) => o.value === layout);
  const gridClass = currentLayoutOption?.responsiveClass || "grid-cols-1 md:grid-cols-2";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Public Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-5 flex-wrap shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <Image
              src="/logo_muara_enim.png"
              alt="Logo Muara Enim"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            className="text-blue-600 hidden sm:block"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-bold text-slate-800 leading-tight">Portal CCTV Publik</h1>
            <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">Kabupaten Muara Enim</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "monitoring" && (
            <LayoutSelector currentLayout={layout} onLayoutChange={setLayout} />
          )}

          <Link
            href="/login"
            className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login Operator
          </Link>
        </div>
      </header>

      {/* Navigation and Main Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Simple Navigation Sidebar (Only Tab control for public page) */}
        <aside className="w-full md:w-60 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 z-10">
          <div className="flex flex-col gap-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 hidden md:block">Menu Navigasi</div>
            <nav className="flex flex-row md:flex-col gap-1 w-full">
              <button
                onClick={() => setActiveTab("map")}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "map"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Peta CCTV
              </button>
              <button
                onClick={() => setActiveTab("monitoring")}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "monitoring"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Monitoring Grid
              </button>
            </nav>
          </div>
          <div className="text-[10px] text-slate-400 pl-1 mt-4 hidden md:block">
            v1.1.0 &bull; Muara Enim CCTV
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-slate-50 z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm text-slate-500 font-medium">Memuat CCTV Publik...</span>
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center p-6 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto my-12 shadow-sm">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="font-bold text-slate-800">Tidak Ada CCTV Publik</h3>
              <p className="text-xs text-slate-500">Saat ini tidak ada kamera CCTV publik yang aktif atau terdaftar di sistem.</p>
            </div>
          ) : (
            <>
              {activeTab === "monitoring" && (
                <div className="flex flex-col gap-4">
                  <div className={`grid ${gridClass} gap-4 w-full`}>
                    {selectedCCTVs.map((cctv, index) => (
                      <CCTVViewer
                        key={`slot-${index}`}
                        cctv={cctv}
                        onSelect={() => openSelector(index)}
                        onFullscreen={cctv ? () => handleOpenFullscreen(cctv) : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "map" && (
                <CCTVMap
                  cameras={cameras}
                  onSelectCamera={handleSelectCameraFromMap}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Select CCTV Modal */}
      <CCTVSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectCCTV}
        selectedIds={selectedIds}
        cameras={cameras}
      />

      {/* Fullscreen Video Modal */}
      <CCTVFullscreenModal
        isOpen={isFullscreen}
        cctv={fullscreenCCTV}
        onClose={handleCloseFullscreen}
        onChangeCCTV={handleChangeFullscreenCCTV}
      />
    </div>
  );
}

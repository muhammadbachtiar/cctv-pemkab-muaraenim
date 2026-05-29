"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "../context/auth-context";
import { CCTVItem, LayoutType, layoutOptions, cctvList } from "../config/cctv-data";
import LayoutSelector from "../components/layout-selector";
import CCTVViewer from "../components/cctv-viewer";
import CCTVSelectorModal from "../components/cctv-selector-modal";
import CCTVFullscreenModal from "../components/cctv-fullscreen-modal";

export default function DashboardPage() {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const [layout, setLayout] = useState<LayoutType>("2x2");
  const [selectedCCTVs, setSelectedCCTVs] = useState<(CCTVItem | null)[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [fullscreenCCTV, setFullscreenCCTV] = useState<CCTVItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get number of slots based on layout
  const getSlotCount = () => {
    const option = layoutOptions.find((o) => o.value === layout);
    return option ? option.cols * option.cols : 4;
  };

  // Initialize slots when layout changes
  useEffect(() => {
    const slotCount = getSlotCount();
    setSelectedCCTVs((prev) => {
      const newSlots = [...prev];
      // If we need more slots, add nulls
      while (newSlots.length < slotCount) {
        // Try to auto-fill with CCTVs that aren't already selected
        const usedIds = newSlots.filter((c) => c !== null).map((c) => c!.id);
        const availableCCTV = cctvList.find((c) => !usedIds.includes(c.id));
        newSlots.push(availableCCTV || null);
      }
      // If we have too many slots, trim
      return newSlots.slice(0, slotCount);
    });
  }, [layout]);

  const handleSelectCCTV = (cctv: CCTVItem) => {
    // If in fullscreen mode, update fullscreen CCTV
    if (isFullscreen) {
      setFullscreenCCTV(cctv);
    }
    
    // Update the grid slot
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
    // Find the current slot index for the fullscreen CCTV
    const slotIndex = selectedCCTVs.findIndex(
      (c) => c !== null && fullscreenCCTV !== null && c.id === fullscreenCCTV.id
    );
    if (slotIndex !== -1) {
      setCurrentSlot(slotIndex);
    }
    setSelectorOpen(true);
  };

  const selectedIds = selectedCCTVs.filter((c) => c !== null).map((c) => c!.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500 bg-slate-50">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin-slow"></div>
        <p>Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Get responsive grid class from layout option
  const currentLayoutOption = layoutOptions.find((o) => o.value === layout);
  const gridClass = currentLayoutOption?.responsiveClass || "grid-cols-1 md:grid-cols-2";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-5 flex-wrap shadow-sm shrink-0">
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            {/* Logo Muara Enim */}
            <div className="relative w-9 h-9">
              <Image
                src="/logo_muara_enim.png"
                alt="Logo Muara Enim"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            {/* Camera Icon */}
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="32"
              height="32"
              className="text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h1 className="text-lg font-bold text-slate-800">cctv.muaraenimkab.go.id</h1>
          </div>
        </div>

        <div className="flex items-center">
          <LayoutSelector currentLayout={layout} onLayoutChange={setLayout} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>{user}</span>
          </div>
          <button
            className="flex items-center gap-2 bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-red-500/10 transition-colors"
            onClick={logout}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* CCTV Grid - Fill remaining space with proper 16:9 aspect ratio */}
      <main className="flex-1 p-4 overflow-auto">
        <div className={`grid ${gridClass} gap-3 w-full max-w-full auto-rows-fr items-start`}>
          {selectedCCTVs.map((cctv, index) => (
            <CCTVViewer
              key={`slot-${index}`}
              cctv={cctv}
              onSelect={() => openSelector(index)}
              onFullscreen={cctv ? () => handleOpenFullscreen(cctv) : undefined}
            />
          ))}
        </div>
      </main>

      {/* CCTV Selector Modal */}
      <CCTVSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectCCTV}
        selectedIds={selectedIds}
      />

      {/* Fullscreen Modal */}
      <CCTVFullscreenModal
        isOpen={isFullscreen}
        cctv={fullscreenCCTV}
        onClose={handleCloseFullscreen}
        onChangeCCTV={handleChangeFullscreenCCTV}
      />
    </div>
  );
}

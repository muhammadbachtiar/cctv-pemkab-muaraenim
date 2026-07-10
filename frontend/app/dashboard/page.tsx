"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "../context/auth-context";
import { CCTVItem, LayoutType, layoutOptions } from "../config/cctv-data";
import { api } from "../utils/api";
import LayoutSelector from "../components/layout-selector";
import CCTVViewer from "../components/cctv-viewer";
import CCTVSelectorModal from "../components/cctv-selector-modal";
import CCTVFullscreenModal from "../components/cctv-fullscreen-modal";

import CCTVMap from "../components/cctv-map";
import CameraManagement from "../components/camera-mgmt";
import UserManagement from "../components/user-mgmt";
import RoleManagement from "../components/role-mgmt";
import Profile from "../components/profile";

export default function DashboardPage() {
  const { user, role, hasPermission, logout, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"monitoring" | "map" | "cameras" | "users" | "roles" | "profile">("monitoring");
  const [layout, setLayout] = useState<LayoutType>("3x3");
  const [selectedCCTVs, setSelectedCCTVs] = useState<(CCTVItem | null)[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [fullscreenCCTV, setFullscreenCCTV] = useState<CCTVItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [gridRows, setGridRows] = useState<string>("auto");
  const [cameras, setCameras] = useState<CCTVItem[]>([]);
  const [isCamerasLoading, setIsCamerasLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastLoadedCameraIdsRef = useRef<string>("");
  const currentLayoutOption = layoutOptions.find((o) => o.value === layout);

  const getSlotCount = () => {
    const option = layoutOptions.find((o) => o.value === layout);
    return option ? option.cols * option.cols : 9;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }

      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setGridRows(`repeat(${currentLayoutOption?.cols || 2}, minmax(0, 1fr))`);
        } else {
          setGridRows("auto");
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [currentLayoutOption?.cols]);

  const loadCameras = async (force = false) => {
    if (!isAuthenticated) return;
    setIsCamerasLoading(true);
    setCameraError(null);
    try {
      const fetched = await api.get<any[]>("/api/v1/cameras");
      const domain = process.env.NEXT_PUBLIC_CCTV_DOMAIN;
      const token = localStorage.getItem("accessToken");

      const currentIds = fetched.map((c) => c.id).sort().join(",");
      if (!force && currentIds === lastLoadedCameraIdsRef.current) {
        setIsCamerasLoading(false);
        return;
      }
      lastLoadedCameraIdsRef.current = currentIds;

      const mapped: CCTVItem[] = fetched.map((cam) => ({
        ...cam,
        location: cam.locationName,
        url: cam.isPublic
          ? `${domain}/${cam.path}/`
          : `${domain}/${cam.path}/?cookieCheck=1&token=${token}`,
      }));

      setCameras(mapped);
    } catch (err: any) {
      console.error("Gagal memuat daftar CCTV:", err);
      setCameraError(err?.message || "Gagal memuat daftar kamera. Silakan coba lagi.");
    } finally {
      setIsCamerasLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) {
      loadCameras(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && refreshKey > 0) {
      loadCameras(true);
    }
  }, [refreshKey]);

  useEffect(() => {
    if (!isAuthenticated || cameras.length === 0) return;
    const activeCameras = cameras.filter((c) => c.isActive);
    if (activeCameras.length === 0) return;

    const slotCount = getSlotCount();
    setSelectedCCTVs((prev) => {
      const newSlots = [...prev];
      const cleanedSlots = newSlots.map((slot) =>
        slot && activeCameras.some((c) => c.id === slot.id) ? activeCameras.find((c) => c.id === slot.id) || slot : null
      );

      const filledSlots = [...cleanedSlots];
      while (filledSlots.length < slotCount) {
        const usedIds = filledSlots.filter((c) => c !== null).map((c) => c!.id);
        const availableCCTV = activeCameras.find((c) => !usedIds.includes(c.id));
        filledSlots.push(availableCCTV || null);
      }
      return filledSlots.slice(0, slotCount);
    });
  }, [isAuthenticated, layout, cameras]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500 bg-slate-50">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin-slow"></div>
        <p>Memuat sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const gridClass = currentLayoutOption?.responsiveClass || "grid-cols-1 md:grid-cols-2";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-5 flex-wrap shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isSidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
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
              <h1 className="text-sm md:text-base font-bold text-slate-800 leading-tight">cctv.muaraenimkab.go.id</h1>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium">Kabupaten Muara Enim</span>
            </div>
          </div>
        </div>

        {/* Dynamic Controls based on Active Tab */}
        {activeTab === "monitoring" && (
          <div className="flex items-center">
            <LayoutSelector currentLayout={layout} onLayoutChange={setLayout} />
          </div>
        )}

        {/* User Badge & Logout */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className="flex flex-col text-right hover:opacity-80 transition-opacity cursor-pointer"
            title="Lihat Profil Saya"
          >
            <span className="text-xs md:text-sm font-semibold text-slate-800">{user}</span>
            <span className="text-[9px] md:text-[10px] text-slate-400 font-semibold uppercase">{role}</span>
          </button>
          <button
            className="flex items-center gap-1.5 bg-transparent border border-red-500 text-red-500 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-red-500/10 transition-colors"
            onClick={logout}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="14"
              height="14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Keluar
          </button>
        </div>
      </header>

      {/* Main Container - Sidebar + Content */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Navigation Sidebar */}
        <aside
          className={`bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 z-50 md:z-10 transition-all duration-300 
            ${isSidebarOpen
              ? "w-64 p-4 translate-x-0"
              : "w-0 p-0 border-r-0 -translate-x-full md:translate-x-0 overflow-hidden"
            } 
            fixed md:relative inset-y-0 left-0 h-full md:h-auto md:flex`}
        >
          <div className="flex flex-col gap-6 w-56 md:w-full">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-3">Menu Navigasi</div>
              {/* Mobile Close Button */}
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {/* Monitoring */}
              <button
                onClick={() => {
                  setActiveTab("monitoring");
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "monitoring"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Live Monitoring
              </button>

              {/* Map */}
              <button
                onClick={() => {
                  setActiveTab("map");
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "map"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Peta CCTV
              </button>

              {/* CCTV CRUD */}
              {(hasPermission("camera:create") || hasPermission("camera:update") || hasPermission("camera:delete")) && (
                <button
                  onClick={() => {
                    setActiveTab("cameras");
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "cameras"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Kelola Kamera
                </button>
              )}

              {/* User CRUD */}
              {hasPermission("user:read") && (
                <button
                  onClick={() => {
                    setActiveTab("users");
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "users"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Kelola User
                </button>
              )}

              {/* Role config */}
              {hasPermission("role:manage") && (
                <button
                  onClick={() => {
                    setActiveTab("roles");
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "roles"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Role & Hak Akses
                </button>
              )}
            </nav>
          </div>

          {/* Profile Nav at bottom of sidebar */}
          <div className="flex flex-col gap-2">
            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => {
                  setActiveTab("profile");
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${activeTab === "profile"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Profil Saya
              </button>
            </div>

            <div className="text-[10px] text-slate-400 pl-3 w-56 md:w-full">
              v1.1.0 &bull; Muara Enim CCTV
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-slate-50 z-10">
          {/* Tab 1: Live Monitoring Grid */}
          {activeTab === "monitoring" && (
            <div className="flex flex-col gap-4 h-full">
              {/* Monitoring toolbar */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {isCamerasLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-3 h-3 border border-slate-300 border-t-blue-500 rounded-full animate-spin-slow inline-block"></span>
                      Menyinkronkan data...
                    </span>
                  )}
                  {cameraError && !isCamerasLoading && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {cameraError}
                    </span>
                  )}
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    title="Refresh semua stream"
                    disabled={isCamerasLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" className={isCamerasLoading ? "animate-spin" : ""}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Stream
                  </button>
                </div>
              </div>

              {/* Loading skeleton */}
              {isCamerasLoading && cameras.length === 0 && (
                <div className={`grid ${gridClass} gap-4 w-full`}>
                  {Array.from({ length: getSlotCount() }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-video bg-slate-200 rounded-xl animate-pulse flex items-center justify-center"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32" className="text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}

              {/* Error state (fetch failed, no data) */}
              {!isCamerasLoading && cameraError && cameras.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32" className="text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Gagal Memuat Kamera</p>
                    <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
                  </div>
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Empty state (loaded but no cameras) */}
              {!isCamerasLoading && !cameraError && cameras.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32" className="text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Belum Ada Kamera Terdaftar</p>
                    <p className="text-xs text-slate-400 max-w-xs">Tambahkan kamera terlebih dahulu melalui menu Kelola Kamera untuk memulai monitoring.</p>
                  </div>
                  {(hasPermission("camera:create")) && (
                    <button
                      onClick={() => setActiveTab("cameras")}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Kamera
                    </button>
                  )}
                </div>
              )}

              {/* Camera grid — only when data loaded and no error */}
              {!isCamerasLoading && !cameraError && cameras.length > 0 && (
                <div className={`grid ${gridClass} gap-4 w-full`}>
                  {selectedCCTVs.map((cctv, index) => (
                    <CCTVViewer
                      key={`slot-${index}-${refreshKey}`}
                      cctv={cctv}
                      onSelect={() => openSelector(index)}
                      onFullscreen={cctv ? () => handleOpenFullscreen(cctv) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Leaflet Map */}
          {activeTab === "map" && (
            <CCTVMap
              cameras={cameras}
              onSelectCamera={handleSelectCameraFromMap}
            />
          )}

          {/* Tab 3: Cameras CRUD */}
          {activeTab === "cameras" && (hasPermission("camera:create") || hasPermission("camera:update") || hasPermission("camera:delete")) && (
            <CameraManagement />
          )}

          {/* Tab 4: Users CRUD */}
          {activeTab === "users" && hasPermission("user:read") && (
            <UserManagement />
          )}

          {/* Tab 5: Roles Config */}
          {activeTab === "roles" && hasPermission("role:manage") && (
            <RoleManagement />
          )}

          {/* Tab 6: Profile */}
          {activeTab === "profile" && (
            <Profile />
          )}
        </main>
      </div>

      {/* CCTV Selector Modal */}
      <CCTVSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectCCTV}
        selectedIds={selectedIds}
        cameras={cameras}
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

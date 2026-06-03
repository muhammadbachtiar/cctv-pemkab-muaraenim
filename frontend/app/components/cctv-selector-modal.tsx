"use client";

import React from "react";
import { CCTVItem } from "../config/cctv-data";

interface CCTVSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cctv: CCTVItem) => void;
  selectedIds: string[];
  cameras: CCTVItem[];
}

export default function CCTVSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedIds,
  cameras,
}: CCTVSelectorModalProps) {
  if (!isOpen) return null;

  // Filter only active cameras for selection
  const activeCameras = cameras.filter((cctv) => cctv.isActive);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-[60] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Pilih CCTV</h2>
          <button
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-3 flex flex-col gap-2">
          {activeCameras.length === 0 ? (
            <div className="text-sm text-slate-400 py-10 text-center">
              Tidak ada CCTV aktif tersedia.
            </div>
          ) : (
            activeCameras.map((cctv) => (
              <button
                key={cctv.id}
                className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedIds.includes(cctv.id)
                    ? "border-green-500 bg-green-500/10"
                    : "border-slate-200 bg-slate-50 hover:border-blue-600 hover:bg-blue-600/5"
                }`}
                onClick={() => {
                  onSelect(cctv);
                  onClose();
                }}
              >
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-sm text-slate-800 truncate">
                    {cctv.name}
                  </span>
                  {cctv.locationName && (
                    <span className="text-xs text-slate-500 truncate">
                      {cctv.locationName}
                    </span>
                  )}
                </div>
                {selectedIds.includes(cctv.id) && (
                  <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded shrink-0">
                    Aktif
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

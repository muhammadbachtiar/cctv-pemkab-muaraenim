"use client";

import React from "react";
import { CCTVItem } from "../config/cctv-data";

interface CCTVViewerProps {
  cctv: CCTVItem | null;
  onSelect?: () => void;
  onFullscreen?: () => void;
}

export default function CCTVViewer({ cctv, onSelect, onFullscreen }: CCTVViewerProps) {
  if (!cctv) {
    return (
      <div
        className="bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-blue-600 hover:bg-blue-600/5 w-full aspect-video"
        onClick={onSelect}
      >
        <div className="flex flex-col items-center gap-2 text-slate-500 p-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 002 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">Klik untuk memilih CCTV</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm w-full aspect-video">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-opacity shrink-0" />
          <span className="font-semibold text-xs text-slate-800 truncate">{cctv.name}</span>
          {cctv.location && (
            <span className="text-[10px] text-slate-500 truncate ml-1 hidden sm:inline">{cctv.location}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onFullscreen?.();
            }}
            title="Fullscreen"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
          <button
            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            onClick={onSelect}
            title="Ganti CCTV"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Stream Area using MediaMTX built-in Player iframe */}
      <div className="relative bg-slate-900 flex-1 min-h-0">
        <iframe
          src={cctv.url}
          className="absolute inset-0 w-full h-full border-none bg-black"
          scrolling="no"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}

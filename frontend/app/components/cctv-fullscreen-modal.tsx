"use client";

import React, { useEffect, useState, useRef } from "react";
import { CCTVItem } from "../config/cctv-data";

interface CCTVFullscreenModalProps {
  isOpen: boolean;
  cctv: CCTVItem | null;
  onClose: () => void;
  onChangeCCTV: () => void;
}

export default function CCTVFullscreenModal({
  isOpen,
  cctv,
  onClose,
  onChangeCCTV,
}: CCTVFullscreenModalProps) {
  const [showControls, setShowControls] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // HLS.js Player initialization
  useEffect(() => {
    if (!isOpen || !cctv || !cctv.url) return;

    let hls: any = null;

    const initPlayer = async () => {
      const video = videoRef.current;
      if (!video) return;

      let hlsUrl = cctv.url;
      if (hlsUrl.endsWith("/")) hlsUrl += "index.m3u8";
      if (!hlsUrl.includes(".m3u8")) hlsUrl += "/index.m3u8";

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.play().catch(() => {});
        return;
      }

      try {
        const Hls = (await import("hls.js")).default;
        if (!Hls.isSupported()) {
          video.src = hlsUrl;
          video.play().catch(() => {});
          return;
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 10,
          maxMaxBufferLength: 30,
          startLevel: -1,
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });

        hlsRef.current = hls;
      } catch {
        video.src = hlsUrl;
        video.play().catch(() => {});
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(timer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, cctv?.url]);

  // Handle ESC key to close fullscreen and manage body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle mouse move to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);

    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 2000);

    setHideTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  if (!isOpen || !cctv) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      {/* Video player - fills entire screen */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        autoPlay
        muted
        playsInline
      />

      {/* Floating controls - only visible on hover */}
      <div
        className={`absolute top-4 right-4 z-20 flex items-center gap-2 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Change CCTV button */}
        <button
          className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onChangeCCTV();
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Ganti CCTV
        </button>

        {/* Close button */}
        <button
          className="flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* CCTV info - only visible on hover */}
      <div
        className={`absolute bottom-4 left-4 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="font-semibold text-sm">{cctv.name}</span>
            {cctv.location && (
              <>
                <span className="text-white/50">•</span>
                <span className="text-xs text-white/80">{cctv.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

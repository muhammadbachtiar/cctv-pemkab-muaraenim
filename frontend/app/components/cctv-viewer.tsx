"use client";

import React, { useState, useRef, useEffect } from "react";
import { CCTVItem } from "../config/cctv-data";

interface CCTVViewerProps {
  cctv: CCTVItem | null;
  onSelect?: () => void;
  onFullscreen?: () => void;
}

export default function CCTVViewer({ cctv, onSelect, onFullscreen }: CCTVViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingState, setRetryingState] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMounted = useRef(true);
  const selectedCctvRef = useRef<CCTVItem | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersAttached = useRef(false);
  const hlsRef = useRef<any>(null);
  const manifestRetryCountRef = useRef(0);
  const manifestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const buildUrl = (url: string) => {
    if (url.endsWith("/")) return `${url}index.m3u8`;
    if (!url.includes(".m3u8")) return `${url}/index.m3u8`;
    return url;
  };

  const clearManifestRetry = () => {
    if (manifestTimeoutRef.current) {
      clearTimeout(manifestTimeoutRef.current);
      manifestTimeoutRef.current = null;
    }
  };

  const stopVideo = (video: HTMLVideoElement | null) => {
    clearManifestRetry();
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.error("Error destroying HLS instance:", e);
      }
      hlsRef.current = null;
    }
    if (!video) return;
    try {
      video.removeAttribute("src");
      video.load();
      video.pause();
    } catch (e) {
      console.error("Error stopping video element:", e);
    }
  };

  const clearRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const cleanup = () => {
    isMounted.current = false;
    clearRetry();
    clearManifestRetry();
    stopVideo(videoRef.current);
  };

  const loadStream = async () => {
    const video = videoRef.current;
    const cctv = selectedCctvRef.current;
    if (!video || !cctv?.url || !isMounted.current) return;

    setRetrying(false);
    setRetryingState(false);
    manifestRetryCountRef.current = 0;
    clearManifestRetry();

    const targetUrl = buildUrl(cctv.url);
    stopVideo(video);

    // If native HLS is supported (like Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = targetUrl;
      video.load();
      const tryPlay = () => {
        if (!isMounted.current) return;
        video.play().catch(() => {
          if (isMounted.current) setTimeout(tryPlay, 1000);
        });
      };
      tryPlay();
      return;
    }

    // Otherwise, use hls.js
    try {
      const Hls = (await import("hls.js")).default;
      if (!Hls.isSupported()) {
        video.src = targetUrl;
        video.load();
        const tryPlay = () => {
          if (!isMounted.current) return;
          video.play().catch(() => {
            if (isMounted.current) setTimeout(tryPlay, 1000);
          });
        };
        tryPlay();
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 5,        // Keep buffer small for grid layout memory usage
        maxMaxBufferLength: 15,
        startLevel: -1,            // Auto quality
      });

      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMounted.current) return;
        clearManifestRetry();      // Manifest parsed successfully, stop scheduled retries
        video.play().catch(() => {});
      });

      // Handle HLS.js errors
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        if (!isMounted.current) return;
        console.warn(`HLS Error on ${cctv.name}:`, data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Check if manifest loading failed (usually 404 while transcoding is starting)
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                  data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                
                if (manifestRetryCountRef.current < 10) { // Retry up to 10 times (20s)
                  manifestRetryCountRef.current += 1;
                  console.log(`Manifest not ready for ${cctv.name} (attempt ${manifestRetryCountRef.current}/10). Retrying in 2s...`);
                  clearManifestRetry();
                  manifestTimeoutRef.current = setTimeout(() => {
                    if (isMounted.current && hlsRef.current === hls) {
                      hls.loadSource(targetUrl);
                      hls.startLoad();
                    }
                  }, 2000);
                } else {
                  console.warn(`Manifest load failed after max retries for ${cctv.name}. Triggering component retry...`);
                  attemptRetry();
                }
              } else {
                console.log(`Fatal network error for ${cctv.name}, trying to reload segments...`);
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log(`Fatal media error for ${cctv.name}, trying to recover...`);
              hls.recoverMediaError();
              break;
            default:
              console.log(`Unrecoverable HLS error for ${cctv.name}, triggering retry...`);
              attemptRetry();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } catch (err) {
      console.error("Failed to load hls.js:", err);
      video.src = targetUrl;
      video.load();
      const tryPlay = () => {
        if (!isMounted.current) return;
        video.play().catch(() => {
          if (isMounted.current) setTimeout(tryPlay, 1000);
        });
      };
      tryPlay();
    }
  };

  const attemptRetry = () => {
    if (!isMounted.current || retryCountRef.current >= 5) {
      setHasError(true);
      setRetrying(false);
      setRetryingState(false);
      return;
    }

    retryCountRef.current += 1;
    setRetrying(true);
    setRetryingState(true);

    clearRetry();
    retryTimeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      loadStream();
    }, Math.min(retryCountRef.current * 1500, 6000));
  };

  useEffect(() => {
    if (!cctv || !cctv.url || !cctv.id) {
      cleanup();
      selectedCctvRef.current = null;
      return;
    }

    const sameCamera = selectedCctvRef.current?.id === cctv.id;
    if (sameCamera) return;

    selectedCctvRef.current = cctv;
    isMounted.current = true;
    retryCountRef.current = 0;
    setHasError(false);
    setRetrying(false);
    setRetryingState(false);
    clearRetry();

    const video = videoRef.current;
    if (!video) return;

    const onError = () => {
      if (!isMounted.current) return;
      if (hlsRef.current) return; // Ignore native errors if hls.js handles them
      attemptRetry();
    };

    const onStalled = () => {
      if (!isMounted.current) return;
      if (hlsRef.current) return; // Do not reload HLS video element from native stalled event
      video.load();
      video.play().catch(() => {});
    };

    const onWaiting = () => {
      if (!isMounted.current) return;
    };

    const onPlaying = () => {
      if (!isMounted.current) return;
      setHasError(false);
      setRetrying(false);
      setRetryingState(false);
      retryCountRef.current = 0;
      clearRetry();
      clearManifestRetry();    // Clear manifest retry timeouts when video starts playing
    };

    if (!listenersAttached.current) {
      video.addEventListener("error", onError);
      video.addEventListener("stalled", onStalled);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      listenersAttached.current = true;
    }

    loadStream();

    return () => {
      clearRetry();
      const video = videoRef.current;
      if (video && listenersAttached.current) {
        video.removeEventListener("error", onError);
        video.removeEventListener("stalled", onStalled);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        listenersAttached.current = false;
      }
    };
  }, [cctv?.id]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

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

      {/* Stream Area */}
      <div className="relative bg-slate-900 flex-1 min-h-0">
        {hasError && retryCountRef.current >= 5 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 p-4 text-center bg-slate-100">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm">Stream tidak tersedia</p>
            <button
              className="px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => {
                retryCountRef.current = 0;
                setHasError(false);
                loadStream();
              }}
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              autoPlay
              muted
              playsInline
              controls={false}
            />
            {retryingState && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-[10px]">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memuat ulang ({retryCountRef.current}/5)
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

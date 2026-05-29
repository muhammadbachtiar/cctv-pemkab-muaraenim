"use client";

import React from "react";
import { LayoutType, layoutOptions } from "../config/cctv-data";

interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

const getGridClass = (value: string) => {
  switch (value) {
    case "1x1":
      return "grid-cols-1";
    case "2x2":
      return "grid-cols-2";
    case "3x3":
      return "grid-cols-3";
    case "4x4":
      return "grid-cols-4";
    default:
      return "grid-cols-2";
  }
};

export default function LayoutSelector({
  currentLayout,
  onLayoutChange,
}: LayoutSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500">Layout:</span>
      <div className="flex gap-2">
        {layoutOptions.map((option) => (
          <button
            key={option.value}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs transition-all ${
              currentLayout === option.value
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-600 hover:text-slate-700"
            }`}
            onClick={() => onLayoutChange(option.value)}
            title={option.label}
          >
            <div className={`grid gap-0.5 w-6 h-6 ${getGridClass(option.value)}`}>
              {Array.from({ length: option.cols * option.cols }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[1px] ${
                    currentLayout === option.value
                      ? "bg-white"
                      : "bg-current opacity-50"
                  }`}
                ></div>
              ))}
            </div>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type LayoutType = "1x1" | "2x2" | "3x3" | "4x4";

export interface LayoutOption {
  value: LayoutType;
  label: string;
  cols: number;
  responsiveClass: string;
}

export const layoutOptions: LayoutOption[] = [
  {
    value: "1x1",
    label: "1x1",
    cols: 1,
    responsiveClass: "grid-cols-1",
  },
  {
    value: "2x2",
    label: "2x2",
    cols: 2,
    responsiveClass: "grid-cols-1 md:grid-cols-2",
  },
  {
    value: "3x3",
    label: "3x3",
    cols: 3,
    responsiveClass: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
  },
  {
    value: "4x4",
    label: "4x4",
    cols: 4,
    responsiveClass: "grid-cols-2 md:grid-cols-4",
  },
];

export interface CCTVItem {
  id: string;
  name: string;
  path: string;
  rtspUrl?: string;
  locationName?: string | null;
  location?: string | null; // Untuk kompatibilitas komponen lama
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  isPublic: boolean;
  url: string; // HTTP HLS Stream URL
}

// Fallback list kosong saat inisialisasi awal
export const cctvList: CCTVItem[] = [];

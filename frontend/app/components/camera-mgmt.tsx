"use client";

import React, { useState, useEffect } from "react";
import { CCTVItem } from "../config/cctv-data";
import { api } from "../utils/api";
import { useAuth } from "../context/auth-context";

interface CameraAccess {
  id: string;
  userId: string;
  cameraId: string;
  canView: boolean;
  user: {
    username: string;
    fullName?: string;
  };
}

interface UserSummary {
  id: string;
  username: string;
  fullName?: string;
}

export default function CameraManagement() {
  const { hasPermission } = useAuth();
  const [cameras, setCameras] = useState<CCTVItem[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CCTVItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    path: "",
    rtspUrl: "",
    locationName: "",
    latitude: "",
    longitude: "",
    isActive: true,
    isPublic: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Access modal states
  const [accessList, setAccessList] = useState<CameraAccess[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isAccessLoading, setIsAccessLoading] = useState(false);

  // Load cameras & users
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cams = await api.get<CCTVItem[]>("/api/v1/cameras");
      setCameras(cams);

      if (hasPermission("camera:manage-access")) {
        const usrs = await api.get<UserSummary[]>("/api/v1/users");
        setUsers(usrs);
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data kamera");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form handlers
  const handleOpenAdd = () => {
    setSelectedCamera(null);
    setFormData({
      name: "",
      path: "",
      rtspUrl: "",
      locationName: "",
      latitude: "",
      longitude: "",
      isActive: true,
      isPublic: false,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (camera: CCTVItem) => {
    setSelectedCamera(camera);
    setFormData({
      name: camera.name,
      path: camera.path,
      rtspUrl: camera.rtspUrl || "",
      locationName: camera.locationName || "",
      latitude: camera.latitude !== null && camera.latitude !== undefined ? String(camera.latitude) : "",
      longitude: camera.longitude !== null && camera.longitude !== undefined ? String(camera.longitude) : "",
      isActive: camera.isActive,
      isPublic: camera.isPublic,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsFormSubmitting(true);

    // Path validation: alphanumeric and hyphens only (only for new cameras)
    if (!selectedCamera) {
      const pathRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!pathRegex.test(formData.path)) {
        setFormError("Path hanya boleh huruf kecil, angka, dan tanda hubung (-). Contoh: simpang-kepur-01");
        setIsFormSubmitting(false);
        return;
      }
    }

    const payload: any = {
      name: formData.name,
      rtspUrl: formData.rtspUrl,
      locationName: formData.locationName || null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      isActive: formData.isActive,
      isPublic: formData.isPublic,
    };

    if (!selectedCamera) {
      payload.path = formData.path;
    }

    try {
      if (selectedCamera) {
        // Update
        await api.put(`/api/v1/cameras/${selectedCamera.id}`, payload);
      } else {
        // Create
        await api.post("/api/v1/cameras", payload);
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data kamera");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kamera ini dari sistem?")) return;
    try {
      await api.delete(`/api/v1/cameras/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kamera");
    }
  };

  // Access Control handlers
  const handleOpenAccess = async (camera: CCTVItem) => {
    setSelectedCamera(camera);
    setIsAccessOpen(true);
    setIsAccessLoading(true);
    setSelectedUserId("");
    try {
      const access = await api.get<CameraAccess[]>(`/api/v1/cameras/${camera.id}/access`);
      setAccessList(access);
    } catch (err: any) {
      alert("Gagal memuat hak akses kamera: " + err.message);
    } finally {
      setIsAccessLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera || !selectedUserId) return;
    setIsAccessLoading(true);
    try {
      await api.post(`/api/v1/cameras/${selectedCamera.id}/access`, {
        userId: selectedUserId,
        canView: true,
      });
      // reload access list
      const access = await api.get<CameraAccess[]>(`/api/v1/cameras/${selectedCamera.id}/access`);
      setAccessList(access);
      setSelectedUserId("");
    } catch (err: any) {
      alert("Gagal memberikan hak akses: " + err.message);
    } finally {
      setIsAccessLoading(false);
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    if (!selectedCamera) return;
    if (!confirm("Cabut hak akses menonton untuk user ini?")) return;
    setIsAccessLoading(true);
    try {
      await api.delete(`/api/v1/cameras/${selectedCamera.id}/access/${userId}`);
      // reload access list
      const access = await api.get<CameraAccess[]>(`/api/v1/cameras/${selectedCamera.id}/access`);
      setAccessList(access);
    } catch (err: any) {
      alert("Gagal mencabut hak akses: " + err.message);
    } finally {
      setIsAccessLoading(false);
    }
  };

  const filteredCameras = cameras.filter(
    (cam) =>
      cam.name.toLowerCase().includes(search.toLowerCase()) ||
      (cam.locationName && cam.locationName.toLowerCase().includes(search.toLowerCase())) ||
      cam.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Kamera CCTV</h2>
          <p className="text-sm text-slate-500">Kelola pendaftaran CCTV, koordinat peta, setting publik, dan izin akses user.</p>
        </div>
        {hasPermission("camera:create") && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kamera
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Cari berdasarkan nama, lokasi, atau path..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
        />
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500">Memuat data kamera...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/5 border border-red-500/20 text-red-600 rounded-2xl text-center">
          {error}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="px-6 py-4">Nama CCTV</th>
                  <th className="px-6 py-4">Path / Stream URL</th>
                  <th className="px-6 py-4">Lokasi / Koordinat</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCameras.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      Tidak ada data kamera ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredCameras.map((camera) => (
                    <tr key={camera.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{camera.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]" title={camera.rtspUrl}>
                          {camera.rtspUrl || "URL disembunyikan"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <div>/{camera.path}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">MediaMTX HLS</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{camera.locationName || "-"}</div>
                        {camera.latitude !== null && camera.longitude !== null ? (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {camera.latitude}, {camera.longitude}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-500 mt-0.5">Koordinat tidak diset</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {camera.isPublic ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                            Publik
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-semibold">
                            Privat
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {camera.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!camera.isPublic && hasPermission("camera:manage-access") && (
                            <button
                              onClick={() => handleOpenAccess(camera)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Kelola Izin Akses User"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("camera:update") && (
                            <button
                              onClick={() => handleOpenEdit(camera)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Ubah Kamera"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("camera:delete") && (
                            <button
                              onClick={() => handleDelete(camera.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Kamera"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CCTV Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedCamera ? "Ubah Kamera CCTV" : "Tambah Kamera CCTV"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-600 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Nama Kamera <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Simpang Kepur PTZ"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Path Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={!!selectedCamera} // Path tidak boleh diubah jika edit
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="Contoh: simpang-kepur-ptz"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors disabled:opacity-60"
                  />
                  {!selectedCamera && (
                    <span className="text-[10px] text-slate-400">Gunakan huruf kecil, angka, dan tanda hubung (-).</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">URL RTSP Kamera <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                  placeholder="rtsp://username:password@ip:port/live"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Nama Lokasi / Jalan</label>
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  placeholder="Contoh: Jl. Lintas Sumatra, Simpang Kepur"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="Contoh: -3.6509"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="Contoh: 103.7782"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-2 border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4.5 h-4.5 accent-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">Kamera Aktif</span>
                    <span className="text-[10px] text-slate-400">Jalur stream akan didaftarkan ke MediaMTX</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4.5 h-4.5 accent-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">Kamera Publik</span>
                    <span className="text-[10px] text-slate-400">Siapapun bisa menonton tanpa token JWT</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isFormSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {isAccessOpen && selectedCamera && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsAccessOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Izin Akses CCTV</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kamera: <strong className="text-slate-700">{selectedCamera.name}</strong></p>
              </div>
              <button onClick={() => setIsAccessOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Form to Grant Access */}
              <form onSubmit={handleGrantAccess} className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Pilih User untuk Diberikan Izin</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    <option value="">-- Pilih User --</option>
                    {users
                      // Filter user yang sudah ada izin di daftar saat ini
                      .filter((u) => !accessList.some((a) => a.userId === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName ? `${u.fullName} (${u.username})` : u.username}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isAccessLoading || !selectedUserId}
                  className="px-4 py-2.2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                >
                  Beri Akses
                </button>
              </form>

              {/* List of Users with Access */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">User yang Memiliki Akses</h4>
                
                {isAccessLoading ? (
                  <div className="flex justify-center p-6">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                ) : accessList.length === 0 ? (
                  <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                    Belum ada user yang diberikan akses khusus. Kamera ini hanya dapat dilihat oleh Admin dan Operator.
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                    {accessList.map((access) => (
                      <div key={access.id} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-sm">
                            {access.user.fullName || access.user.username}
                          </span>
                          <span className="text-xs text-slate-400">@{access.user.username}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(access.userId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Cabut Izin Akses"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

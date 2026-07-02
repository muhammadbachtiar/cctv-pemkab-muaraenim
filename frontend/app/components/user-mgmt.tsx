"use client";

import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/auth-context";

interface RoleSummary {
  id: string;
  name: string;
  description?: string;
}

interface UserProfile {
  id: string;
  username: string;
  fullName?: string;
  isActive: boolean;
  roleId: string;
  createdAt: string;
  role: RoleSummary;
}

interface CameraSummary {
  id: string;
  name: string;
  path: string;
  locationName?: string;
  isPublic: boolean;
  isActive: boolean;
}

export default function UserManagement() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isCameraAccessOpen, setIsCameraAccessOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    roleId: "",
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Password reset states
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // Camera access states
  const [userCameraAccessList, setUserCameraAccessList] = useState<string[]>([]);
  const [allCameras, setAllCameras] = useState<CameraSummary[]>([]);
  const [isCameraAccessLoading, setIsCameraAccessLoading] = useState(false);
  const [cameraSearch, setCameraSearch] = useState("");

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usrs = await api.get<UserProfile[]>("/api/v1/users");
      setUsers(usrs);

      const rls = await api.get<RoleSummary[]>("/api/v1/roles");
      setRoles(rls);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data pengguna");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData({
      username: "",
      password: "",
      fullName: "",
      roleId: roles.find((r) => r.name === "viewer")?.id || roles[0]?.id || "",
      isActive: true,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "",
      fullName: user.fullName || "",
      roleId: user.roleId,
      isActive: user.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsFormSubmitting(true);

    try {
      if (selectedUser) {
        // Edit User
        await api.put(`/api/v1/users/${selectedUser.id}`, {
          fullName: formData.fullName || null,
          roleId: formData.roleId,
          isActive: formData.isActive,
        });
      } else {
        // Add User (Register)
        if (formData.password.length < 6) {
          setFormError("Password minimal harus 6 karakter");
          setIsFormSubmitting(false);
          return;
        }
        await api.post("/api/v1/auth/register", {
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName || null,
          roleId: formData.roleId,
        });
      }
      setIsFormOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data user");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleOpenPassword = (user: UserProfile) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordError(null);
    setIsPasswordOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setPasswordError(null);
    setIsPasswordSubmitting(true);

    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal harus 6 karakter");
      setIsPasswordSubmitting(false);
      return;
    }

    try {
      await api.patch(`/api/v1/users/${selectedUser.id}/reset-password`, {
        password: newPassword,
      });
      setIsPasswordOpen(false);
      alert(`Password untuk user "${selectedUser.username}" berhasil di-reset.`);
    } catch (err: any) {
      setPasswordError(err.message || "Gagal mereset password");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleDelete = async (user: UserProfile) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user "${user.username}"?`)) return;
    try {
      await api.delete(`/api/v1/users/${user.id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus user");
    }
  };

  const handleOpenCameraAccess = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsCameraAccessOpen(true);
    setIsCameraAccessLoading(true);
    setCameraSearch("");
    try {
      // Fetch all cameras
      const cams = await api.get<CameraSummary[]>("/api/v1/cameras");
      setAllCameras(cams);

      // Fetch user's current camera access list
      const accesses = await api.get<any[]>(`/api/v1/users/${user.id}/cameras`);
      setUserCameraAccessList(accesses.map((a) => a.cameraId));
    } catch (err: any) {
      alert("Gagal memuat data akses kamera: " + err.message);
    } finally {
      setIsCameraAccessLoading(false);
    }
  };

  const handleSaveCameraAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsCameraAccessLoading(true);
    try {
      await api.post(`/api/v1/users/${selectedUser.id}/cameras`, {
        cameraIds: userCameraAccessList,
      });
      setIsCameraAccessOpen(false);
      alert(`Akses kamera untuk user "${selectedUser.username}" berhasil diperbarui.`);
    } catch (err: any) {
      alert("Gagal memperbarui akses kamera: " + err.message);
    } finally {
      setIsCameraAccessLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
      u.role.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Pengguna</h2>
          <p className="text-sm text-slate-500">Kelola akun operator, viewer, pengubahan role, blokir akun, dan reset sandi.</p>
        </div>
        {hasPermission("user:create") && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Tambah User
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
          placeholder="Cari user berdasarkan username, nama, atau role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
        />
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500">Memuat data user...</span>
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
                  <th className="px-6 py-4">Nama Lengkap / Username</th>
                  <th className="px-6 py-4">Role / Deskripsi</th>
                  <th className="px-6 py-4">Tanggal Dibuat</th>
                  <th className="px-6 py-4">Status Akun</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      Tidak ada data user ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{user.fullName || "-"}</div>
                        <div className="text-xs text-slate-400">@{user.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.role.name === "admin"
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : user.role.name === "operator"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {user.role.name.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={user.role.description}>
                          {user.role.description || "Tidak ada deskripsi"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            Diblokir
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission("camera:manage-access") && user.role.name !== "admin" && (
                            <button
                              onClick={() => handleOpenCameraAccess(user)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Kelola Akses Kamera"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("user:update") && (
                            <button
                              onClick={() => handleOpenPassword(user)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("user:update") && (
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Ubah Info Pengguna"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission("user:delete") && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus User"
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

      {/* User Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {selectedUser ? "Ubah Pengguna" : "Tambah Pengguna Baru"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-600 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Username <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  disabled={!!selectedUser}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Masukkan username unik"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors disabled:opacity-60"
                />
              </div>

              {!selectedUser && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Kata Sandi <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nama lengkap user"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Role Pengguna <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4.5 h-4.5 accent-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700">Akun Aktif</span>
                    <span className="text-[10px] text-slate-400">Nonaktifkan untuk memblokir login user ini</span>
                  </div>
                </label>
              )}

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

      {/* Reset Password Modal */}
      {isPasswordOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4" onClick={() => setIsPasswordOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Reset Sandi</h3>
                <p className="text-xs text-slate-500 mt-0.5">User: <strong className="text-slate-700">@{selectedUser.username}</strong></p>
              </div>
              <button onClick={() => setIsPasswordOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 flex flex-col gap-4">
              {passwordError && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-600 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Kata Sandi Baru <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isPasswordSubmitting ? "Memproses..." : "Reset Sandi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Camera Access Modal */}
      {isCameraAccessOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsCameraAccessOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Kelola Akses Kamera</h3>
                <p className="text-xs text-slate-500 mt-0.5">User: <strong className="text-slate-700">@{selectedUser.username}</strong> ({selectedUser.fullName || "Tanpa Nama"})</p>
              </div>
              <button onClick={() => setIsCameraAccessOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari kamera berdasarkan nama atau lokasi..."
                  value={cameraSearch}
                  onChange={(e) => setCameraSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Selection helper buttons */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  Terpilih: {userCameraAccessList.length} dari {allCameras.filter(c => !c.isPublic).length} Kamera Privat
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const privateIds = allCameras.filter(c => !c.isPublic).map(c => c.id);
                      setUserCameraAccessList(privateIds);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setUserCameraAccessList([])}
                    className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              {/* Camera List with Scroll */}
              {isCameraAccessLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {allCameras.filter(cam => 
                    cam.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
                    (cam.locationName && cam.locationName.toLowerCase().includes(cameraSearch.toLowerCase()))
                  ).length === 0 ? (
                    <div className="text-sm text-slate-400 py-8 text-center bg-white rounded-xl">
                      Tidak ada kamera ditemukan.
                    </div>
                  ) : (
                    allCameras
                      .filter(cam => 
                        cam.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
                        (cam.locationName && cam.locationName.toLowerCase().includes(cameraSearch.toLowerCase()))
                      )
                      .map((cam) => {
                        const isChecked = userCameraAccessList.includes(cam.id);
                        return (
                          <label
                            key={cam.id}
                            className={`flex items-start gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none ${
                              cam.isPublic ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={cam.isPublic || isChecked}
                              disabled={cam.isPublic}
                              onChange={(e) => {
                                if (cam.isPublic) return;
                                if (e.target.checked) {
                                  setUserCameraAccessList([...userCameraAccessList, cam.id]);
                                } else {
                                  setUserCameraAccessList(userCameraAccessList.filter(id => id !== cam.id));
                                }
                              }}
                              className="mt-0.5 w-4.5 h-4.5 accent-purple-600 shrink-0"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                {cam.name}
                                {cam.isPublic && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold">
                                    Publik
                                  </span>
                                )}
                                {!cam.isActive && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-semibold">
                                    Nonaktif
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">/{cam.path}</span>
                              {cam.locationName && (
                                <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12" className="text-slate-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {cam.locationName}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })
                  )}
                </div>
              )}

              {/* Modal actions */}
              <div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCameraAccessOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCameraAccess}
                  disabled={isCameraAccessLoading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isCameraAccessLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

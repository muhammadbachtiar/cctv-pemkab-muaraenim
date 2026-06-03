"use client";

import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/auth-context";

interface RoleDetails {
  id: string;
  name: string;
  description?: string;
  permissions: any; // Can be array of string or stringified JSON
}

export default function RoleManagement() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDetails | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Helper to parse permissions
  const parsePermissions = (perms: any): string[] => {
    if (!perms) return [];
    if (Array.isArray(perms)) return perms;
    if (typeof perms === "string") {
      try {
        return JSON.parse(perms);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Load roles & available permissions
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rls = await api.get<RoleDetails[]>("/api/v1/roles");
      setRoles(rls);

      const permsData = await api.get<any>("/api/v1/roles/permissions");
      const perms = Array.isArray(permsData)
        ? permsData
        : permsData && Array.isArray(permsData.permissions)
        ? permsData.permissions
        : [];
      setAvailablePermissions(perms);
    } catch (err: any) {
      setError(err.message || "Gagal memuat konfigurasi role & permission");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (role: RoleDetails) => {
    setSelectedRole(role);
    setDescription(role.description || "");
    setSelectedPermissions(parsePermissions(role.permissions));
    setModalError(null);
    setIsEditOpen(true);
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.put(`/api/v1/roles/${selectedRole.id}`, {
        description: description || null,
        permissions: selectedPermissions,
      });
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || "Gagal memperbarui role");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group permissions for better UI
  const getPermissionGroup = (perm: string) => {
    if (perm.startsWith("camera:")) return "Kamera (CCTV)";
    if (perm.startsWith("user:")) return "Pengguna (User)";
    if (perm.startsWith("role:")) return "Hak Akses (Role)";
    return "Lainnya";
  };

  const groups = Array.from(new Set(availablePermissions.map(getPermissionGroup)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Manajemen Peran & Hak Akses (RBAC)</h2>
        <p className="text-sm text-slate-500">Konfigurasi set izin (permissions) untuk role sistem admin, operator, dan viewer.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-3 bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500">Memuat konfigurasi hak akses...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/5 border border-red-500/20 text-red-600 rounded-2xl text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roles.map((role) => {
            const rolePerms = parsePermissions(role.permissions);
            return (
              <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      role.name === "admin"
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : role.name === "operator"
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {role.name.toUpperCase()}
                    </span>
                    {hasPermission("role:manage") && (
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                        title="Edit Permissions"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 capitalize">{role.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{role.description || "Tidak ada deskripsi"}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Hak Akses Aktif ({rolePerms.length})
                    </div>
                    {rolePerms.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Tidak ada izin aktif</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1">
                        {rolePerms.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-mono"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {isEditOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/45 z-[70] flex items-center justify-center p-4 overflow-y-auto" onClick={() => setIsEditOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ubah Hak Akses Peran</h3>
                <p className="text-xs text-slate-500 mt-0.5">Mengubah Peran: <strong className="text-slate-700 font-bold">{selectedRole.name.toUpperCase()}</strong></p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500 text-red-600 rounded-lg text-sm">
                  {modalError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Deskripsi Role</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan fungsi role ini"
                  rows={2}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Permission Groups Checkboxes */}
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                <span className="text-sm font-bold text-slate-700">Daftar Hak Akses (Permissions)</span>
                
                {groups.map((group) => {
                  const groupPerms = availablePermissions.filter(
                    (p) => getPermissionGroup(p) === group
                  );
                  return (
                    <div key={group} className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {groupPerms.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm)}
                              onChange={() => handlePermissionToggle(perm)}
                              className="w-4 h-4 accent-blue-600 shrink-0"
                            />
                            <span className="font-mono text-slate-600 break-all">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

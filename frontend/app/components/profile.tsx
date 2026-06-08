"use client";

import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/auth-context";

interface ProfileData {
  id: string;
  username: string;
  fullName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description?: string | null;
  };
}

export default function Profile() {
  const { role, updateUserDisplayName } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit profile form
  const [fullName, setFullName] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const loadProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<ProfileData>("/api/v1/auth/profile");
      setProfile(data);
      setFullName(data.fullName || "");
    } catch (err: any) {
      setLoadError(err.message || "Gagal memuat data profil");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsProfileSubmitting(true);
    try {
      const updated = await api.put<ProfileData>("/api/v1/auth/profile", { fullName: fullName || null });
      setProfile(updated);
      setFullName(updated.fullName || "");
      updateUserDisplayName(updated.fullName || updated.username);
      setProfileSuccess("Profil berhasil diperbarui!");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || "Gagal memperbarui profil");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal harus 6 karakter");
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Kata sandi berhasil diubah!");
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Gagal mengubah kata sandi");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const getRoleBadgeClass = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "admin":
        return "bg-red-50 text-red-700 border-red-100";
      case "operator":
        return "bg-blue-50 text-blue-700 border-blue-100";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const displayName = profile?.fullName || profile?.username || "";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm">Memuat profil...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 bg-red-500/5 border border-red-500/20 text-red-600 rounded-2xl text-center">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Profil Saya</h2>
        <p className="text-sm text-slate-500">Kelola informasi akun dan ubah kata sandi Anda.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Avatar Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30 shrink-0">
            {displayName ? getInitials(displayName) : "?"}
          </div>
          <div className="text-white min-w-0">
            <div className="text-lg font-bold truncate">{displayName || "—"}</div>
            <div className="text-blue-200 text-sm">@{profile?.username}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  profile?.role.name ? getRoleBadgeClass(profile.role.name) : ""
                } bg-white/90`}
              >
                {profile?.role.name?.toUpperCase()}
              </span>
              {profile?.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-400/20 text-green-100 border border-green-400/30">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-400/20 text-red-100 border border-red-400/30">
                  <span className="w-1.5 h-1.5 bg-red-300 rounded-full" />
                  Diblokir
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-t border-slate-100">
          <div className="px-6 py-4 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</span>
            <span className="text-sm font-semibold text-slate-800 font-mono">@{profile?.username}</span>
          </div>
          <div className="px-6 py-4 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role Akses</span>
            <span className="text-sm font-semibold text-slate-800 capitalize">{profile?.role.name}</span>
            {profile?.role.description && (
              <span className="text-[10px] text-slate-400 truncate">{profile.role.description}</span>
            )}
          </div>
          <div className="px-6 py-4 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bergabung Sejak</span>
            <span className="text-sm font-semibold text-slate-800">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Edit Informasi Profil</h3>
            <p className="text-[11px] text-slate-400">Perbarui nama lengkap yang ditampilkan di sistem</p>
          </div>
        </div>
        <form onSubmit={handleProfileSubmit} className="p-6 flex flex-col gap-4">
          {profileError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {profileSuccess}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-600">Username</label>
              <input
                type="text"
                value={profile?.username || ""}
                disabled
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed font-mono"
              />
              <span className="text-[10px] text-slate-400">Username tidak dapat diubah</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-600">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap Anda"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isProfileSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer"
            >
              {isProfileSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Ubah Kata Sandi</h3>
            <p className="text-[11px] text-slate-400">Untuk keamanan akun, gunakan kata sandi yang kuat</p>
          </div>
        </div>
        <form onSubmit={handlePasswordSubmit} className="p-6 flex flex-col gap-4">
          {passwordError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {passwordSuccess}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-600">Kata Sandi Saat Ini <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPasswords.current ? "text" : "password"}
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Masukkan kata sandi saat ini"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showPasswords.current ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-600">Kata Sandi Baru <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-600">Konfirmasi Sandi Baru <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi kata sandi baru"
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-all ${
                    passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                      ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                      : "border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                <span className="text-[10px] text-red-500">Kata sandi tidak cocok</span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isPasswordSubmitting || (!!passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer"
            >
              {isPasswordSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Ubah Kata Sandi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

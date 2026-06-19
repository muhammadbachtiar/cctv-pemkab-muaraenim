"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/auth-context";

interface FieldErrors {
  username?: string;
  password?: string;
}

function validateForm(username: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    errors.username = "Username tidak boleh kosong";
  } else if (trimmedUsername.length < 3) {
    errors.username = "Username minimal 3 karakter";
  } else if (trimmedUsername.length > 50) {
    errors.username = "Username maksimal 50 karakter";
  } else if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
    errors.username = "Username hanya boleh huruf, angka, titik, underscore, atau tanda hubung";
  }

  if (!password) {
    errors.password = "Password tidak boleh kosong";
  } else if (password.length < 6) {
    errors.password = "Password minimal 6 karakter";
  }

  return errors;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ username: boolean; password: boolean }>({
    username: false,
    password: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading: authLoading } = useAuth();

  const handleBlur = (field: "username" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validateForm(username, password);
    setFieldErrors(currentErrors);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (touched.username) {
      const currentErrors = validateForm(e.target.value, password);
      setFieldErrors((prev) => ({ ...prev, username: currentErrors.username }));
    }
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (touched.password) {
      const currentErrors = validateForm(username, e.target.value);
      setFieldErrors((prev) => ({ ...prev, password: currentErrors.password }));
    }
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Mark all fields as touched
    setTouched({ username: true, password: true });

    // Run validation
    const errors = validateForm(username, password);
    setFieldErrors(errors);

    // Abort if there are validation errors
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Username atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

  const isUsernameInvalid = touched.username && !!fieldErrors.username;
  const isPasswordInvalid = touched.password && !!fieldErrors.password;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-50">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin-slow"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Logos side by side */}
          <div className="flex items-center justify-center gap-4 mb-5">
            {/* Logo Muara Enim */}
            <div className="relative w-16 h-16">
              <Image
                src="/logo_muara_enim.png"
                alt="Logo Muara Enim"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">cctv.muaraenimkab.go.id</h1>
          <p className="text-sm text-slate-500">Silakan login untuk mengakses sistem</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {/* Global error (from server) */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg text-sm animate-fade-in">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                className="flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Username field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-slate-500">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => handleBlur("username")}
              placeholder="Masukkan username"
              autoComplete="username"
              aria-invalid={isUsernameInvalid}
              aria-describedby={isUsernameInvalid ? "username-error" : undefined}
              className={`bg-slate-50 border rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                isUsernameInvalid
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15 bg-red-50/40"
                  : touched.username && !fieldErrors.username
                  ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/15"
                  : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/15"
              }`}
            />
            {isUsernameInvalid && (
              <p id="username-error" className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12" className="flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-500">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur("password")}
                placeholder="Masukkan password"
                autoComplete="current-password"
                aria-invalid={isPasswordInvalid}
                aria-describedby={isPasswordInvalid ? "password-error" : undefined}
                className={`w-full bg-slate-50 border rounded-lg px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  isPasswordInvalid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/15 bg-red-50/40"
                    : touched.password && !fieldErrors.password
                    ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/15"
                    : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/15"
                }`}
              />
              {/* Toggle show/hide password */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {isPasswordInvalid && (
              <p id="password-error" className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12" className="flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-none rounded-lg px-6 py-3.5 text-base font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-md hover:translate-y-[-1px] hover:shadow-lg hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow"></span>
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-slate-500 text-xs">
          <Link href="/public" className="text-blue-600 hover:underline font-semibold flex items-center justify-center gap-1">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Portal Publik
          </Link>
        </div>
      </div>
    </div>
  );
}

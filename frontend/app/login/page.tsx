"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/auth-context";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isLoading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.message || "Username atau password salah");
    } finally {
      setIsLoading(false);
    }
  };

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
            {/* Camera Icon */}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">cctv.muaraenimkab.go.id</h1>
          <p className="text-sm text-slate-500">Silakan login untuk mengakses sistem</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg text-sm">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
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

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-medium text-slate-500">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoComplete="username"
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-500">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all"
            />
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-none rounded-lg px-6 py-3.5 text-base font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-md hover:translate-y-[-1px] hover:shadow-lg hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
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

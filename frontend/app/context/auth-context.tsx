"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../utils/api";

interface UserRole {
  id: string;
  name: string;
  permissions: string[] | string;
}

interface UserProfile {
  id: string;
  username: string;
  fullName?: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  role: string | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserDisplayName: (name: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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

  // Load session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("cctv_user");
      const storedRole = localStorage.getItem("cctv_role");
      const storedPerms = localStorage.getItem("cctv_permissions");

      if (token && storedUser) {
        setUser(storedUser);
        setRole(storedRole);
        setPermissions(parsePermissions(storedPerms));
        setIsAuthenticated(true);

        // Fetch fresh profile from server in background to sync state
        try {
          const profile = await api.get<UserProfile>("/api/v1/auth/profile");
          const displayName = profile.fullName || profile.username;
          const userPerms = parsePermissions(profile.role.permissions);

          localStorage.setItem("cctv_user", displayName);
          localStorage.setItem("cctv_role", profile.role.name);
          localStorage.setItem("cctv_permissions", JSON.stringify(userPerms));

          setUser(displayName);
          setRole(profile.role.name);
          setPermissions(userPerms);
        } catch (err) {
          console.error("Gagal sinkronisasi profil:", err);
          // Jika token tidak valid / kedaluwarsa, api client akan otomatis me-logout
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!isLoading) {
      const publicPaths = ["/login", "/publik", "/public", "/"];
      const isPublicPath = publicPaths.includes(pathname);

      if (!isAuthenticated && !isPublicPath) {
        router.push("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await api.post<{
        accessToken: string;
        user: UserProfile;
      }>("/api/v1/auth/login", { username, password });

      const displayName = response.user.fullName || response.user.username;
      const userPerms = parsePermissions(response.user.role.permissions);

      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("cctv_user", displayName);
      localStorage.setItem("cctv_role", response.user.role.name);
      localStorage.setItem("cctv_permissions", JSON.stringify(userPerms));

      setUser(displayName);
      setRole(response.user.role.name);
      setPermissions(userPerms);
      setIsAuthenticated(true);

      router.push("/dashboard");
      return true;
    } catch (err: any) {
      throw new Error(err?.message || "Gagal masuk ke sistem. Silakan periksa koneksi Anda.");
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("cctv_user");
    localStorage.removeItem("cctv_role");
    localStorage.removeItem("cctv_permissions");
    
    setUser(null);
    setRole(null);
    setPermissions([]);
    setIsAuthenticated(false);
    
    router.push("/login");
  };

  const hasPermission = (permission: string): boolean => {
    // Admin bypasses all permission checks
    if (role === "admin") return true;
    return permissions.includes(permission);
  };

  const updateUserDisplayName = (name: string) => {
    localStorage.setItem("cctv_user", name);
    setUser(name);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        role,
        permissions,
        hasPermission,
        login,
        logout,
        updateUserDisplayName,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/auth-context";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/public");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="login-container">
      <div className="loading-spinner"></div>
    </div>
  );
}

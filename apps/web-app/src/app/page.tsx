"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is authenticated
    const token = getAccessToken();
    
    if (token) {
      // Decode JWT token to get user role and redirect accordingly
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const roles = payload.roles || [];
        
        if (process.env.NODE_ENV === "development") {
          console.log("[HomePage] Decoded token roles:", roles);
        }
        
        // Check for both "ReadOnly" and case variations
        const isReadOnly = roles.some((role: string) => 
          role === "ReadOnly" || role === "READ_ONLY" || role.toLowerCase() === "readonly"
        );
        
        // Redirect ReadOnly users to client portal, others to accountant dashboard
        if (isReadOnly) {
          if (process.env.NODE_ENV === "development") {
            console.log("[HomePage] Redirecting ReadOnly user to client dashboard");
          }
          router.push("/client/dashboard");
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log("[HomePage] Redirecting non-ReadOnly user to accountant dashboard");
          }
          router.push("/anasayfa");
        }
      } catch (error) {
        // If token decoding fails, fallback to accountant dashboard
        if (process.env.NODE_ENV === "development") {
          console.error("[HomePage] Failed to decode token:", error);
        }
        router.push("/anasayfa");
      }
    } else {
      // Redirect to login if not logged in
      router.push("/auth/login");
    }
  }, [router]);

  // Return null during SSR to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <h1>AI Muhasebi</h1>
        <p>Yönlendiriliyor...</p>
      </div>
    </main>
  );
}


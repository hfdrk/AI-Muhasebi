"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is authenticated
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    
    if (token) {
      // Redirect to dashboard if logged in
      router.push("/anasayfa");
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


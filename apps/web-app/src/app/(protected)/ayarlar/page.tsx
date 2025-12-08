"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@repo/api-client";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to office settings by default (or profile if user doesn't have permission)
    const checkAndRedirect = async () => {
      try {
        const userData = await getCurrentUser();
        const currentTenant = userData?.data?.tenants?.find((t: any) => t.status === "active");
        const userRole = currentTenant?.role;

        // Redirect based on role
        if (userRole === "TenantOwner" || userRole === "Accountant") {
          router.push("/ayarlar/ofis");
        } else {
          router.push("/ayarlar/profil");
        }
      } catch (error) {
        // Default to profile if error
        router.push("/ayarlar/profil");
      }
    };

    checkAndRedirect();
  }, [router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
      <p>Yönlendiriliyor...</p>
    </div>
  );
}



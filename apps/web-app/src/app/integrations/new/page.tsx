"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useEffect } from "react";
import IntegrationModal from "@/components/integration-modal";

function NewIntegrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as "accounting" | "bank") || undefined;

  const handleClose = () => {
    // Restore body overflow before navigation to prevent DOM manipulation errors
    document.body.style.overflow = "unset";
    // Use setTimeout to ensure cleanup completes before navigation
    setTimeout(() => {
      router.push("/entegrasyonlar");
    }, 0);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      // Ensure cleanup happens on unmount
      if (document.body) {
        document.body.style.overflow = "unset";
      }
    };
  }, []);

  return (
    <IntegrationModal
      isOpen={true}
      onClose={handleClose}
      type={type}
    />
  );
}

export default function NewIntegrationPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <NewIntegrationPageContent />
    </Suspense>
  );
}


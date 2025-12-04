"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import IntegrationModal from "@/components/integration-modal";

export default function NewIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as "accounting" | "bank") || undefined;

  const handleClose = () => {
    router.push("/integrations");
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
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


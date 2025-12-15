"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getIntegration } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { spacing } from "@/styles/design-system";
import IntegrationModal from "@/components/integration-modal";

export default function EditIntegrationPage() {
  const router = useRouter();
  const params = useParams();
  const integrationId = params.id as string;

  const { data: integrationData, isLoading } = useQuery({
    queryKey: ["integration", integrationId],
    queryFn: () => getIntegration(integrationId),
  });

  const handleClose = () => {
    // Restore body overflow before navigation to prevent DOM manipulation errors
    document.body.style.overflow = "unset";
    // Use setTimeout to ensure cleanup completes before navigation
    setTimeout(() => {
      router.push(`/entegrasyonlar/${integrationId}`);
    }, 0);
  };

  const handleSuccess = () => {
    // Navigate back to detail page after successful update
    router.push(`/entegrasyonlar/${integrationId}`);
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

  if (isLoading) {
    return (
      <PageTransition>
        <Card>
          <div style={{ padding: spacing.xxl }}>
            <Skeleton height="40px" width="300px" style={{ marginBottom: spacing.md }} />
            <Skeleton height="200px" width="100%" />
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (!integrationData?.data) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Entegrasyon bulunamadı.
      </div>
    );
  }

  const integration = integrationData.data;

  return (
    <IntegrationModal
      isOpen={true}
      onClose={handleClose}
      integrationId={integrationId}
      initialData={{
        providerId: integration.providerId,
        displayName: integration.displayName,
        config: (integration.config as Record<string, unknown>) || {},
      }}
      type={integration.provider.type as "accounting" | "bank"}
      onSuccess={handleSuccess}
    />
  );
}


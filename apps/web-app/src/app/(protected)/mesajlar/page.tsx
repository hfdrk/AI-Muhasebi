"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { messagingClient, getCurrentUser } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessageThreadList } from "@/components/message-thread-list";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

export default function MessagesPage() {
  const [selectedClientCompanyId, setSelectedClientCompanyId] = useState<string | undefined>();

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUser = userData?.data;
  const userRole = currentUser?.tenants?.find((t: any) => t.status === "active")?.role;
  const isReadOnly = userRole === "ReadOnly";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <PageHeader title="Mesajlar" />
        {!isReadOnly && (
          <Link href="/mesajlar/yeni">
            <Button>+ Yeni Konuşma Başlat</Button>
          </Link>
        )}
      </div>

      <MessageThreadList clientCompanyId={selectedClientCompanyId} />
    </div>
  );
}




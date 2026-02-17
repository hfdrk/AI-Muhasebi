"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { messagingClient, listClientCompanies, getCurrentUser } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { toast } from "@/lib/toast";

function NewMessagePageContent() {
  const { themeColors } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientCompanyIdFromQuery = searchParams.get("clientCompanyId");
  const [selectedClientCompanyId, setSelectedClientCompanyId] = useState<string>(clientCompanyIdFromQuery || "");
  const [subject, setSubject] = useState("");
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Set client company from query param
  useEffect(() => {
    if (clientCompanyIdFromQuery) {
      setSelectedClientCompanyId(clientCompanyIdFromQuery);
    }
  }, [clientCompanyIdFromQuery]);

  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUserId = userData?.data?.user?.id;

  // Fetch client companies for selection
  const { data: clientsData } = useQuery({
    queryKey: ["client-companies"],
    queryFn: () => listClientCompanies({ page: 1, pageSize: 100 }),
  });

  const clients = clientsData?.data?.data || [];
  
  // When client company is selected, automatically include ReadOnly users for that company
  useEffect(() => {
    if (selectedClientCompanyId) {
      const selectedClient = clients.find((c: any) => c.id === selectedClientCompanyId);
      if (selectedClient?.contactEmail) {
        // The backend will automatically include ReadOnly users when creating the thread
        // based on the clientCompanyId, so we don't need to manually add them here
        // Just ensure current user is included
        if (currentUserId && !participantUserIds.includes(currentUserId)) {
          setParticipantUserIds([currentUserId]);
        }
      }
    }
  }, [selectedClientCompanyId, clients, currentUserId]);

  const createThreadMutation = useMutation({
    mutationFn: () =>
      messagingClient.createThread({
        clientCompanyId: selectedClientCompanyId || null,
        subject: subject || null,
        participantUserIds: participantUserIds.length > 0 ? participantUserIds : [currentUserId!],
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      router.push(`/mesajlar/${data.data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientCompanyId && participantUserIds.length === 0) {
      toast.warning("Lütfen bir müşteri seçin veya katılımcı ekleyin.");
      return;
    }
    createThreadMutation.mutate();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
        <Link href="/mesajlar" style={{ color: colors.primary, textDecoration: "none", fontSize: "18px" }}>
          ←
        </Link>
        <PageHeader title="Yeni Konuşma" />
      </div>

      <Card style={{ maxWidth: "600px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.lg }}>
            <label style={{ display: "block", marginBottom: spacing.sm, fontWeight: "medium" }}>
              Müşteri (Opsiyonel)
            </label>
            <select
              value={selectedClientCompanyId}
              onChange={(e) => setSelectedClientCompanyId(e.target.value)}
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              <option value="">Müşteri seçin (opsiyonel)</option>
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: spacing.lg }}>
            <label style={{ display: "block", marginBottom: spacing.sm, fontWeight: "medium" }}>
              Konu (Opsiyonel)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Örn: Fatura sorusu"
              style={{
                width: "100%",
                padding: spacing.sm,
                border: `1px solid ${themeColors.gray[300]}`,
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: spacing.md, justifyContent: "flex-end" }}>
            <Link href="/mesajlar">
              <Button type="button" style={{ backgroundColor: themeColors.gray[300], color: themeColors.text.primary }}>
                İptal
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createThreadMutation.isPending}
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
              }}
            >
              {createThreadMutation.isPending ? "Oluşturuluyor..." : "Konuşmayı Başlat"}
            </Button>
          </div>

          {createThreadMutation.isError && (
            <div style={{ marginTop: spacing.md, color: colors.error, fontSize: "14px" }}>
              {(createThreadMutation.error as Error)?.message || "Konuşma oluşturulurken bir hata oluştu."}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <NewMessagePageContent />
    </Suspense>
  );
}



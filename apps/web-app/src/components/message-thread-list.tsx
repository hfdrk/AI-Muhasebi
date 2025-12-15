"use client";

import { useQuery } from "@tanstack/react-query";
import { messagingClient, type MessageThread } from "@repo/api-client";
import { Card } from "@/components/ui/Card";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { colors, spacing } from "@/styles/design-system";
import Link from "next/link";

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Şimdi";
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(d);
}

interface MessageThreadListProps {
  clientCompanyId?: string;
  onThreadSelect?: (threadId: string) => void;
  selectedThreadId?: string;
}

export function MessageThreadList({ clientCompanyId, onThreadSelect, selectedThreadId }: MessageThreadListProps) {
  const { data: threadsData, isLoading, error, refetch } = useQuery({
    queryKey: ["message-threads", clientCompanyId],
    queryFn: () => messagingClient.listThreads({ clientCompanyId, limit: 50 }),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // The API returns { data: MessageThread[], meta: {...} }
  const threads = threadsData?.data || [];

  if (isLoading) {
    return (
      <Card>
        <SkeletonTable rows={5} columns={2} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ padding: spacing.xl, textAlign: "center", color: colors.error }}>
          <div style={{ fontSize: "48px", marginBottom: spacing.md }}>⚠️</div>
          <div>Mesajlar yüklenirken bir hata oluştu.</div>
          <div style={{ marginTop: spacing.sm, fontSize: "14px" }}>
            {(error as Error)?.message || "Bilinmeyen hata"}
          </div>
          <button
            onClick={() => refetch()}
            style={{
              marginTop: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </Card>
    );
  }

  if (threads.length === 0) {
    return (
      <Card>
        <div style={{ padding: spacing.xl, textAlign: "center", color: colors.text.secondary }}>
          <div style={{ fontSize: "48px", marginBottom: spacing.md }}>💬</div>
          <div>Henüz mesaj konuşması bulunmuyor.</div>
          <button
            onClick={() => refetch()}
            style={{
              marginTop: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.gray[200],
              color: colors.text.primary,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Yenile
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div>
        {threads.map((thread: MessageThread) => {
          const isSelected = selectedThreadId === thread.id;
          const otherParticipants = thread.participants.filter((p) => p.userId !== thread.participants[0]?.userId);
          const displayName = thread.subject || otherParticipants.map((p) => p.userName).join(", ") || "Konuşma";

          return (
            <Link
              key={thread.id}
              href={`/mesajlar/${thread.id}`}
              onClick={(e) => {
                if (onThreadSelect) {
                  e.preventDefault();
                  onThreadSelect(thread.id);
                }
              }}
              style={{
                display: "block",
                padding: spacing.md,
                borderBottom: `1px solid ${colors.gray[200]}`,
                textDecoration: "none",
                color: "inherit",
                backgroundColor: isSelected ? colors.primaryLighter : "transparent",
                transition: "background-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = colors.gray[50];
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
                    <div style={{ fontWeight: "semibold", color: colors.text.primary, fontSize: "15px" }}>
                      {displayName}
                    </div>
                    {thread.unreadCount && thread.unreadCount > 0 && (
                      <span
                        style={{
                          backgroundColor: colors.primary,
                          color: colors.white,
                          borderRadius: "12px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "14px", color: colors.text.secondary }}>
                    {otherParticipants.map((p) => p.userName).join(", ") || "Konuşma"}
                  </div>
                  {thread.lastMessageAt && (
                    <div style={{ fontSize: "12px", color: colors.text.secondary, marginTop: spacing.xs }}>
                      {formatRelativeTime(thread.lastMessageAt)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}



"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingClient } from "@repo/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessageComposer } from "@/components/message-composer";
import { MessageBubble } from "@/components/message-bubble";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageTransition } from "@/components/ui/PageTransition";
import { colors, spacing } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useEventStream } from "@/hooks/useEventStream";

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function MessageThreadPage() {
  const { themeColors } = useTheme();
  const params = useParams();
  const threadId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: threadData, isLoading } = useQuery({
    queryKey: ["message-thread", threadId],
    queryFn: () => messagingClient.getThread(threadId),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => messagingClient.markAsRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
    },
  });

  const thread = threadData?.data;
  const messages = thread?.messages || [];

  // Mark as read when thread is loaded
  useEffect(() => {
    if (thread && !thread.messages.some((m) => m.readAt)) {
      markAsReadMutation.mutate();
    }
  }, [thread]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Use SSE for real-time message updates
  useEventStream({
    enabled: !!threadId,
    onMessage: (event) => {
      // Invalidate queries when new message event is received
      if (event.payload.threadId === threadId || event.payload.action === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
        queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      }
    },
  });

  if (isLoading) {
    return (
      <PageTransition>
        <div>
          <PageHeader title="Mesajlar" />
          <Card>
            <div style={{ padding: spacing.xl }}>
              <Skeleton height="40px" width="100%" style={{ marginBottom: spacing.sm }} />
              <Skeleton height="200px" width="100%" />
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!thread) {
    return (
      <div>
        <PageHeader title="Mesajlar" />
        <Card>
          <div style={{ padding: spacing.xl, textAlign: "center", color: themeColors.text.secondary }}>
            <div style={{ fontSize: "48px", marginBottom: spacing.md }}>❌</div>
            <div>Konuşma bulunamadı.</div>
            <Link href="/mesajlar" style={{ color: colors.primary, textDecoration: "none", marginTop: spacing.md, display: "inline-block" }}>
              ← Mesajlara Dön
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const otherParticipants = thread.participants.filter((p) => p.userId !== thread.participants[0]?.userId);
  const displayName = thread.subject || otherParticipants.map((p) => p.userName).join(", ") || "Konuşma";

  return (
    <PageTransition>
      <div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
        <Link href="/mesajlar" style={{ color: colors.primary, textDecoration: "none", fontSize: "18px" }}>
          ←
        </Link>
        <PageHeader title={displayName} />
      </div>

      <Card style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 250px)", maxHeight: "700px" }}>
        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: spacing.md,
            backgroundColor: themeColors.gray[50],
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: themeColors.text.secondary, padding: spacing.xl }}>
              <div style={{ fontSize: "48px", marginBottom: spacing.md }}>💬</div>
              <div>Henüz mesaj yok. İlk mesajı gönderin!</div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showDateSeparator =
                  !prevMessage ||
                  new Date(message.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div
                        style={{
                          textAlign: "center",
                          color: themeColors.text.secondary,
                          fontSize: "12px",
                          margin: `${spacing.md} 0`,
                          padding: spacing.xs,
                        }}
                      >
                        {formatDate(message.createdAt)}
                      </div>
                    )}
                    <MessageBubble message={message} />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: spacing.md, backgroundColor: themeColors.white, borderTop: `1px solid ${themeColors.gray[200]}` }}>
          <MessageComposer
            threadId={threadId}
            onMessageSent={() => {
              // Scroll to bottom after sending
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          />
        </div>
      </Card>
    </div>
    </PageTransition>
  );
}




"use client";

import { getCurrentUser } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing } from "@/styles/design-system";
import type { Message } from "@repo/api-client";

interface MessageBubbleProps {
  message: Message;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const currentUserId = userData?.data?.user?.id;
  const isOwnMessage = message.senderId === currentUserId;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        marginBottom: spacing.md,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: "12px",
          backgroundColor: isOwnMessage ? colors.primary : colors.gray[100],
          color: isOwnMessage ? colors.white : colors.text.primary,
        }}
      >
        {!isOwnMessage && (
          <div style={{ fontSize: "12px", fontWeight: "medium", marginBottom: spacing.xs, opacity: 0.8 }}>
            {message.senderName}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.content}</div>
        <div
          style={{
            fontSize: "11px",
            marginTop: spacing.xs,
            opacity: 0.7,
            textAlign: isOwnMessage ? "right" : "left",
          }}
        >
          {formatTime(message.createdAt)}
          {message.readAt && isOwnMessage && " ✓✓"}
        </div>
      </div>
    </div>
  );
}



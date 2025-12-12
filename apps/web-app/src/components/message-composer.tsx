"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingClient } from "@repo/api-client";
import { colors, spacing } from "@/styles/design-system";

interface MessageComposerProps {
  threadId: string;
  onMessageSent?: () => void;
}

export function MessageComposer({ threadId, onMessageSent }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: (messageContent: string) =>
      messagingClient.sendMessage(threadId, { content: messageContent }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["message-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      if (onMessageSent) {
        onMessageSent();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMessageMutation.isPending) {
      return;
    }
    sendMessageMutation.mutate(content.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${colors.gray[200]}`, padding: spacing.md }}>
      <div style={{ display: "flex", gap: spacing.sm, alignItems: "flex-end" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Mesajınızı yazın... (Enter ile gönder, Shift+Enter ile yeni satır)"
          style={{
            flex: 1,
            minHeight: "60px",
            maxHeight: "120px",
            padding: spacing.sm,
            border: `1px solid ${colors.gray[300]}`,
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "inherit",
            resize: "vertical",
          }}
          disabled={sendMessageMutation.isPending}
        />
        <button
          type="submit"
          disabled={!content.trim() || sendMessageMutation.isPending}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: content.trim() ? colors.primary : colors.gray[300],
            color: colors.white,
            border: "none",
            borderRadius: "6px",
            cursor: content.trim() && !sendMessageMutation.isPending ? "pointer" : "not-allowed",
            fontSize: "14px",
            fontWeight: "medium",
            opacity: sendMessageMutation.isPending ? 0.6 : 1,
          }}
        >
          {sendMessageMutation.isPending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </div>
      {sendMessageMutation.isError && (
        <div style={{ marginTop: spacing.sm, color: colors.error, fontSize: "14px" }}>
          {(sendMessageMutation.error as Error)?.message || "Mesaj gönderilirken bir hata oluştu."}
        </div>
      )}
    </form>
  );
}



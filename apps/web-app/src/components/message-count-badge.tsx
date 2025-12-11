"use client";

import { useQuery } from "@tanstack/react-query";
import { messagingClient } from "@repo/api-client";
import { colors } from "../styles/design-system";

export function MessageCountBadge() {
  const { data: threadsData } = useQuery({
    queryKey: ["message-threads", "unread-count"],
    queryFn: () => messagingClient.listThreads({ limit: 100 }),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const threads = threadsData?.data?.data || [];
  const totalUnread = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);

  if (totalUnread === 0) {
    return null;
  }

  return (
    <span
      style={{
        backgroundColor: colors.error,
        color: colors.white,
        borderRadius: "10px",
        padding: "2px 6px",
        fontSize: "11px",
        fontWeight: "bold",
        minWidth: "18px",
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {totalUnread > 99 ? "99+" : totalUnread}
    </span>
  );
}


"use client";

import { useQuery } from "@tanstack/react-query";
import { messagingClient } from "@repo/api-client";
import { colors } from "../styles/design-system";
import { useEventStream } from "@/hooks/useEventStream";

export function MessageCountBadge() {
  // Use SSE for real-time updates instead of polling
  useEventStream({
    onMessage: () => {
      // Queries will be invalidated automatically by the hook
    },
  });

  const { data: threadsData } = useQuery({
    queryKey: ["message-threads", "unread-count"],
    queryFn: () => messagingClient.listThreads({ limit: 100 }),
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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



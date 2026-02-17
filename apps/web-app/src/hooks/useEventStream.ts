"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth";

export type EventType = "message" | "notification" | "document_status" | "contract_expiration" | "ping";

export interface EventData {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface UseEventStreamOptions {
  enabled?: boolean;
  onMessage?: (event: EventData) => void;
  onNotification?: (event: EventData) => void;
  onError?: (error: Error) => void;
}

export function useEventStream(options: UseEventStreamOptions = {}) {
  const { enabled = true, onMessage, onNotification, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled) {
      return;
    }

    // Get API URL and token
    const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const token = getAccessToken();

    if (!API_URL || !token) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[useEventStream] API URL or token not available");
      }
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create SSE connection
    const url = `${API_URL}/api/v1/events/stream`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    // Set authorization header (EventSource doesn't support custom headers, so we use query param or cookie)
    // Since we're using cookies for auth, this should work if cookies are set
    // For token-based auth, we might need to use a different approach

    eventSource.onopen = () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[useEventStream] Connected to event stream");
      }
      setIsConnected(true);
      setError(null);
      
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data: EventData = JSON.parse(event.data);
        
        // Handle ping events (keep-alive)
        if (data.type === "ping") {
          return;
        }

        // Handle message events
        if (data.type === "message") {
          // Invalidate message queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["message-threads"] });
          queryClient.invalidateQueries({ queryKey: ["message-thread"] });
          
          if (onMessage) {
            onMessage(data);
          }
        }

        // Handle notification events
        if (data.type === "notification") {
          // Invalidate notification queries
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notification-count"] });
          
          if (onNotification) {
            onNotification(data);
          }
        }

        // Handle other event types
        if (data.type === "document_status" || data.type === "contract_expiration") {
          // Invalidate relevant queries
          if (data.type === "document_status") {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
          }
          if (data.type === "contract_expiration") {
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
          }
        }
      } catch (err: any) {
        if (process.env.NODE_ENV === "development") {
          console.error("[useEventStream] Error parsing event data:", err);
        }
      }
    };

    eventSource.onerror = (err) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[useEventStream] EventSource error:", err);
      }
      setIsConnected(false);
      
      // Close the connection
      eventSource.close();
      eventSourceRef.current = null;

      const error = new Error("Event stream connection failed");
      setError(error);
      
      if (onError) {
        onError(error);
      }

      // Attempt to reconnect after 3 seconds
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (process.env.NODE_ENV === "development") {
            console.log("[useEventStream] Attempting to reconnect...");
          }
          connect();
        }, 3000);
      }
    };

    eventSourceRef.current = eventSource;
  }, [enabled, onMessage, onNotification, onError, queryClient]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}



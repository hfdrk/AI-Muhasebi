"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 401 (authentication errors)
              if (error?.message?.includes("401") || error?.message?.includes("Yetkilendirme")) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            onError: (error: any) => {
              // Suppress console errors for 401 (expected when not authenticated)
              if (error?.message?.includes("401") || error?.message?.includes("Yetkilendirme")) {
                return; // Don't log expected auth errors
              }
              // Log other errors
              console.error("Query error:", error);
            },
          },
          mutations: {
            onError: (error: any) => {
              // Suppress console errors for 401
              if (error?.message?.includes("401") || error?.message?.includes("Yetkilendirme")) {
                return;
              }
              console.error("Mutation error:", error);
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}


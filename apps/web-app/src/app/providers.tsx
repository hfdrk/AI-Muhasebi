"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "../components/ui/Toast";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";

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
              const errorMessage = typeof error?.message === "string" ? error.message : String(error?.message || "");
              if (errorMessage.includes("401") || errorMessage.includes("Yetkilendirme")) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            onError: (error: any) => {
              // Suppress console errors for 401 (expected when not authenticated)
              const errorMessage = typeof error?.message === "string" ? error.message : String(error?.message || "");
              if (errorMessage.includes("401") || errorMessage.includes("Yetkilendirme")) {
                return; // Don't log expected auth errors
              }
              // Log other errors
              console.error("Query error:", error);
            },
          },
          mutations: {
            onError: (error: any) => {
              // Suppress console errors for 401
              const errorMessage = typeof error?.message === "string" ? error.message : String(error?.message || "");
              if (errorMessage.includes("401") || errorMessage.includes("Yetkilendirme")) {
                return;
              }
              console.error("Mutation error:", error);
            },
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider />
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}


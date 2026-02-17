"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "../components/ui/Toast";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { ThemeProvider } from "../contexts/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 401 (authentication errors) or 429 (rate limit)
              const errorMessage = typeof error?.message === "string" ? error.message : String(error?.message || "");
              const statusCode = error?.status || error?.response?.status;
              if (
                errorMessage.includes("401") || 
                errorMessage.includes("Yetkilendirme") ||
                statusCode === 401 ||
                statusCode === 429 ||
                errorMessage.includes("429") ||
                errorMessage.includes("Too many requests")
              ) {
                return false;
              }
              // Retry up to 1 time for other errors (reduced from 2)
              return failureCount < 1;
            },
          },
          mutations: {
            onError: (error: any) => {
              // Suppress console errors for expected errors
              const statusCode = error?.status || error?.statusCode || error?.response?.status;
              const errorMessage = typeof error?.message === "string" ? error.message : String(error?.message || "");
              
              if (
                statusCode === 401 ||
                statusCode === 429 ||
                errorMessage.includes("401") ||
                errorMessage.includes("429") ||
                errorMessage.includes("Too many requests") ||
                errorMessage.includes("Yetkilendirme")
              ) {
                return;
              }
              
              // Only log in development
              if (process.env.NODE_ENV === "development") {
                console.error("Mutation error:", error);
              }
            },
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}


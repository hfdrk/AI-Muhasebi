"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { colors, spacing, shadows } from "../../../styles/design-system";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

async function sendChatMessage(question: string, type?: "GENEL" | "RAPOR" | "RISK") {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch("/api/v1/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    credentials: "include",
    body: JSON.stringify({ question, type }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Bir hata oluştu." } }));
    throw new Error(error.error?.message || "Şu anda AI servisine ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
  }

  return response.json();
}

export default function AIAsistanPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const chatMutation = useMutation({
    mutationFn: (question: string) => sendChatMessage(question),
    onSuccess: (response, question) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: question,
        isUser: true,
        timestamp: new Date(),
      };
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, aiMessage]);
      setInputText("");
    },
    onError: (error: any) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: error.message || "Şu anda AI yanıtı oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || chatMutation.isPending) {
      return;
    }

    chatMutation.mutate(inputText.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: spacing.xl,
        minHeight: "calc(100vh - 200px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h1 style={{ marginBottom: spacing.xl, color: colors.text.primary }}>AI Asistan</h1>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.white,
          borderRadius: "8px",
          boxShadow: shadows.md,
          overflow: "hidden",
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: spacing.lg,
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: colors.text.secondary,
              }}
            >
              <p>Muhasebe ile ilgili sorunuzu yazın...</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: message.isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: spacing.md,
                    borderRadius: "12px",
                    backgroundColor: message.isUser ? colors.primary : colors.gray[100],
                    color: message.isUser ? colors.white : colors.text.primary,
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message.text}</p>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  padding: spacing.md,
                  borderRadius: "12px",
                  backgroundColor: colors.gray[100],
                  color: colors.text.secondary,
                }}
              >
                <p style={{ margin: 0 }}>Yanıt oluşturuluyor...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: spacing.md,
            display: "flex",
            gap: spacing.md,
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Muhasebe ile ilgili sorunuzu yazın..."
            style={{
              flex: 1,
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "none",
              minHeight: "60px",
              maxHeight: "150px",
            }}
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || chatMutation.isPending}
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.white,
              border: "none",
              borderRadius: "8px",
              cursor: chatMutation.isPending || !inputText.trim() ? "not-allowed" : "pointer",
              opacity: chatMutation.isPending || !inputText.trim() ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {chatMutation.isPending ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}



"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { spacing, typography, borderRadius, shadows } from "../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ["⌘", "K"],
    description: "Global arama",
    category: "Genel",
  },
  {
    keys: ["Esc"],
    description: "Modal/dialog kapat",
    category: "Genel",
  },
  {
    keys: ["/"],
    description: "Arama odağını aç",
    category: "Genel",
  },
  {
    keys: ["⌘", "B"],
    description: "Sidebar'ı göster/gizle",
    category: "Navigasyon",
  },
  {
    keys: ["⌘", "N"],
    description: "Yeni öğe oluştur",
    category: "Hızlı İşlemler",
  },
  {
    keys: ["⌘", "S"],
    description: "Kaydet",
    category: "Hızlı İşlemler",
  },
  {
    keys: ["⌘", "Enter"],
    description: "Form gönder",
    category: "Hızlı İşlemler",
  },
];

export function KeyboardShortcuts() {
  const { themeColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !e.shiftKey && !e.altKey) {
        // Don't open if we're in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const formatKey = (key: string) => {
    if (key === "⌘") {
      return isMac ? "⌘" : "Ctrl";
    }
    return key;
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Klavye Kısayolları" size="md">
        <div style={{ padding: spacing.md }}>
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} style={{ marginBottom: spacing.xl }}>
              <h3
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: themeColors.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: spacing.md,
                  marginTop: 0,
                }}
              >
                {category}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: spacing.sm,
                      borderRadius: borderRadius.md,
                      backgroundColor: themeColors.gray[50],
                    }}
                  >
                    <span style={{ fontSize: typography.fontSize.sm, color: themeColors.text.primary }}>
                      {shortcut.description}
                    </span>
                    <div style={{ display: "flex", gap: spacing.xs, alignItems: "center" }}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd
                            style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              backgroundColor: themeColors.white,
                              border: `1px solid ${themeColors.border}`,
                              borderRadius: borderRadius.sm,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.medium,
                              color: themeColors.text.primary,
                              boxShadow: shadows.sm,
                              fontFamily: typography.fontFamily.sans,
                            }}
                          >
                            {formatKey(key)}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span style={{ margin: `0 ${spacing.xs}`, color: themeColors.text.muted }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}



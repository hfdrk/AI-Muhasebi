"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { colors, spacing } from "../../styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "info",
  loading = false,
}: ConfirmDialogProps) {
  const { themeColors } = useTheme();
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantColors = {
    danger: colors.danger,
    warning: colors.warning,
    info: colors.primary,
  };

  const variantIcons = {
    danger: "alert",
    warning: "warning",
    info: "info",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={true}
      closeOnOverlayClick={!loading}
    >
      <div style={{ padding: spacing.md }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: `${variantColors[variant]}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon
              name={variantIcons[variant] as any}
              size={24}
              color={variantColors[variant]}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                marginBottom: spacing.sm,
                fontSize: "18px",
                fontWeight: 600,
                color: themeColors.text.primary,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: themeColors.text.secondary,
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: spacing.sm,
            justifyContent: "flex-end",
            marginTop: spacing.lg,
          }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}



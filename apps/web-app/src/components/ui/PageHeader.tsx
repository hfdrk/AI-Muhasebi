"use client";

import React from "react";
import { spacing } from "../../styles/design-system";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: subtitle ? "flex-start" : "center",
        marginBottom: spacing.xl,
      }}
    >
      <div>
        <h1 style={{ margin: 0, marginBottom: subtitle ? spacing.xs : 0, fontSize: "28px", fontWeight: 600 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: 0, color: "#6c757d", fontSize: "14px" }}>{subtitle}</p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}





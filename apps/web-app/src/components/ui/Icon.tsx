"use client";

import * as LucideIcons from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export type IconName = keyof typeof LucideIcons;

interface IconProps {
  name: IconName;
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

// Icon mapping for common use cases
export const iconMap: Record<string, IconName> = {
  // Navigation
  home: "Home",
  users: "Users",
  fileText: "FileText",
  invoice: "Receipt",
  archive: "Archive",
  book: "BookOpen",
  briefcase: "Briefcase",
  folder: "Folder",
  checkCircle: "CheckCircle",
  
  // Actions
  search: "Search",
  bell: "Bell",
  settings: "Settings",
  logout: "LogOut",
  user: "User",
  building: "Building2",
  mail: "Mail",
  creditCard: "CreditCard",
  file: "File",
  crown: "Crown",
  
  // Status
  alert: "AlertTriangle",
  info: "Info",
  success: "CheckCircle2",
  error: "XCircle",
  warning: "AlertCircle",
  
  // Other
  robot: "Bot",
  chart: "BarChart3",
  chartLine: "TrendingUp",
  plug: "Plug",
  message: "MessageSquare",
  lock: "Lock",
  shield: "Shield",
  analytics: "LineChart",
  report: "FileBarChart",
  contract: "FileText",
  notification: "Bell",
  tax: "Receipt",
  security: "ShieldCheck",
};

export function Icon({
  name,
  size = 20,
  color,
  className = "",
  strokeWidth = 2,
  style
}: IconProps) {
  const { themeColors } = useTheme();
  const resolvedColor = color ?? themeColors.text.secondary;
  // Handle icon name mapping
  const iconKey = iconMap[name] || name;
  const IconComponent = (LucideIcons as any)[iconKey] as React.ComponentType<{
    size?: number | string;
    color?: string;
    className?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;

  if (!IconComponent) {
    // Only warn in development
    if (process.env.NODE_ENV === "development") {
      console.warn(`Icon "${name}" not found. Using default icon.`);
    }
    const DefaultIcon = LucideIcons.Circle as React.ComponentType<any>;
    return <DefaultIcon size={size} color={resolvedColor} className={className} strokeWidth={strokeWidth} style={style} />;
  }

  return (
    <IconComponent
      size={size}
      color={resolvedColor}
      className={className}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}


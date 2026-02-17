"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { colors, spacing, borderRadius, shadows, typography, transitions, zIndex } from "@/styles/design-system";
import { useTheme } from "../../contexts/ThemeContext";

// ==================== Types ====================

export interface Period {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

export interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  presets?: Period[];
  showCustom?: boolean;
  compareMode?: boolean;
  comparePeriod?: Period;
  onCompareChange?: (period: Period | null) => void;
}

// ==================== Default Presets ====================

const getDefaultPresets = (): Period[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      label: "Bugun",
      value: "today",
      startDate: today,
      endDate: today,
    },
    {
      label: "Bu Hafta",
      value: "this_week",
      startDate: new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    {
      label: "Bu Ay",
      value: "this_month",
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: today,
    },
    {
      label: "Son 30 Gun",
      value: "last_30_days",
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
    {
      label: "Bu Ceyrek",
      value: "this_quarter",
      startDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      endDate: today,
    },
    {
      label: "Bu Yil",
      value: "this_year",
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: today,
    },
    {
      label: "Gecen Ay",
      value: "last_month",
      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      endDate: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    {
      label: "Gecen Ceyrek",
      value: "last_quarter",
      startDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1),
      endDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0),
    },
  ];
};

// ==================== Period Selector Component ====================

export function PeriodSelector({
  value,
  onChange,
  presets,
  showCustom = true,
  compareMode = false,
  comparePeriod,
  onCompareChange,
}: PeriodSelectorProps) {
  const { themeColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const availablePresets = presets || getDefaultPresets();

  const formatDateRange = (start: Date, end: Date): string => {
    const formatDate = (d: Date) =>
      d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

    if (start.toDateString() === end.toDateString()) {
      return formatDate(start);
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const handlePresetSelect = (preset: Period) => {
    onChange(preset);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      const custom: Period = {
        label: "Ozel Tarih",
        value: "custom",
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
      };
      onChange(custom);
      setIsOpen(false);
    }
  };

  const getComparisonPeriods = (): Period[] => {
    const duration = value.endDate.getTime() - value.startDate.getTime();

    return [
      {
        label: "Onceki Donem",
        value: "previous_period",
        startDate: new Date(value.startDate.getTime() - duration - 24 * 60 * 60 * 1000),
        endDate: new Date(value.startDate.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        label: "Gecen Yil Ayni Donem",
        value: "previous_year",
        startDate: new Date(value.startDate.getFullYear() - 1, value.startDate.getMonth(), value.startDate.getDate()),
        endDate: new Date(value.endDate.getFullYear() - 1, value.endDate.getMonth(), value.endDate.getDate()),
      },
    ];
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: themeColors.white,
    border: `1px solid ${themeColors.border}`,
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: themeColors.text.primary,
    transition: `all ${transitions.fast} ease`,
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    minWidth: "280px",
    backgroundColor: themeColors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    border: `1px solid ${themeColors.border}`,
    zIndex: zIndex.dropdown,
    overflow: "hidden",
  };

  const presetItemStyle = (isSelected: boolean): React.CSSProperties => ({
    display: "block",
    width: "100%",
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: isSelected ? colors.primaryLighter : "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: typography.fontSize.sm,
    color: isSelected ? colors.primary : themeColors.text.primary,
    fontWeight: isSelected ? typography.fontWeight.semibold : typography.fontWeight.normal,
    transition: `background ${transitions.fast} ease`,
  });

  return (
    <div style={{ position: "relative", display: "inline-flex", gap: spacing.sm }}>
      {/* Main Period Selector */}
      <button
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = themeColors.border;
        }}
      >
        <Calendar size={16} color={themeColors.text.muted} />
        <span>{value.label}</span>
        <span style={{ color: themeColors.text.muted, fontSize: typography.fontSize.xs }}>
          ({formatDateRange(value.startDate, value.endDate)})
        </span>
        <ChevronDown size={16} color={themeColors.text.muted} />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: zIndex.dropdown - 1 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={dropdownStyle}>
            {/* Presets */}
            <div style={{ padding: spacing.xs }}>
              {availablePresets.map((preset) => (
                <button
                  key={preset.value}
                  style={presetItemStyle(preset.value === value.value)}
                  onClick={() => handlePresetSelect(preset)}
                  onMouseEnter={(e) => {
                    if (preset.value !== value.value) {
                      e.currentTarget.style.backgroundColor = themeColors.gray[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (preset.value !== value.value) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {showCustom && (
              <div
                style={{
                  padding: spacing.md,
                  borderTop: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.gray[50],
                }}
              >
                <div style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: themeColors.text.muted, marginBottom: spacing.sm }}>
                  OZEL TARIH ARALIGI
                </div>
                <div style={{ display: "flex", gap: spacing.sm, marginBottom: spacing.sm }}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{
                      flex: 1,
                      padding: spacing.sm,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                </div>
                <button
                  onClick={handleCustomApply}
                  disabled={!customStartDate || !customEndDate}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    backgroundColor: customStartDate && customEndDate ? colors.primary : themeColors.gray[300],
                    color: colors.white,
                    border: "none",
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    cursor: customStartDate && customEndDate ? "pointer" : "not-allowed",
                  }}
                >
                  Uygula
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Compare Period Selector */}
      {compareMode && onCompareChange && (
        <div style={{ position: "relative" }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: comparePeriod ? colors.primaryLighter : themeColors.white,
              borderColor: comparePeriod ? colors.primary : themeColors.border,
            }}
            onClick={() => setShowCompareDropdown(!showCompareDropdown)}
          >
            <span>{comparePeriod ? `vs ${comparePeriod.label}` : "Karsilastir"}</span>
            <ChevronDown size={16} color={themeColors.text.muted} />
          </button>

          {showCompareDropdown && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: zIndex.dropdown - 1 }}
                onClick={() => setShowCompareDropdown(false)}
              />
              <div style={{ ...dropdownStyle, left: "auto", right: 0, minWidth: "200px" }}>
                <div style={{ padding: spacing.xs }}>
                  {comparePeriod && (
                    <button
                      style={presetItemStyle(false)}
                      onClick={() => {
                        onCompareChange(null);
                        setShowCompareDropdown(false);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = themeColors.gray[50];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Karsilastirmayi Kaldir
                    </button>
                  )}
                  {getComparisonPeriods().map((period) => (
                    <button
                      key={period.value}
                      style={presetItemStyle(comparePeriod?.value === period.value)}
                      onClick={() => {
                        onCompareChange(period);
                        setShowCompareDropdown(false);
                      }}
                      onMouseEnter={(e) => {
                        if (comparePeriod?.value !== period.value) {
                          e.currentTarget.style.backgroundColor = themeColors.gray[50];
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (comparePeriod?.value !== period.value) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Quick Period Tabs ====================

interface QuickPeriodTabsProps {
  value: string;
  onChange: (period: Period) => void;
  options?: Array<{ label: string; value: string }>;
}

export function QuickPeriodTabs({
  value,
  onChange,
  options = [
    { label: "7G", value: "7d" },
    { label: "30G", value: "30d" },
    { label: "90G", value: "90d" },
    { label: "1Y", value: "1y" },
  ],
}: QuickPeriodTabsProps) {
  const { themeColors } = useTheme();
  const getPeriodFromValue = (val: string): Period => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    };

    const days = daysMap[val] || 30;

    return {
      label: options.find((o) => o.value === val)?.label || val,
      value: val,
      startDate: new Date(today.getTime() - days * 24 * 60 * 60 * 1000),
      endDate: today,
    };
  };

  return (
    <div
      style={{
        display: "inline-flex",
        backgroundColor: themeColors.gray[100],
        borderRadius: borderRadius.lg,
        padding: "2px",
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(getPeriodFromValue(option.value))}
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            backgroundColor: value === option.value ? themeColors.white : "transparent",
            border: "none",
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: value === option.value ? typography.fontWeight.semibold : typography.fontWeight.medium,
            color: value === option.value ? themeColors.text.primary : themeColors.text.muted,
            cursor: "pointer",
            transition: `all ${transitions.fast} ease`,
            boxShadow: value === option.value ? shadows.sm : "none",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

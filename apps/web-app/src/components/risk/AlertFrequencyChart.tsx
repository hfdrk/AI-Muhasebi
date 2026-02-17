"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { spacing, typography, borderRadius } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface AlertFrequencyChartProps {
  data: {
    dates: string[];
    counts: number[];
    totalAlerts: number;
  };
}

export default function AlertFrequencyChart({ data }: AlertFrequencyChartProps) {
  const { themeColors } = useTheme();
  const chartData = data.dates.map((date, index) => ({
    date: format(parseISO(date), "MMM dd"),
    count: data.counts[index] || 0,
  }));

  return (
    <div style={{ width: "100%", height: "300px", padding: spacing.md }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
          <XAxis
            dataKey="date"
            stroke={themeColors.text.secondary}
            style={{ fontSize: typography.fontSize.sm }}
          />
          <YAxis stroke={themeColors.text.secondary} style={{ fontSize: typography.fontSize.sm }} />
          <Tooltip
            contentStyle={{
              backgroundColor: themeColors.white,
              border: `1px solid ${themeColors.border}`,
              borderRadius: borderRadius.md,
            }}
          />
          <Legend />
          <Bar dataKey="count" fill="#f87171" name="Uyarı Sayısı" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}



"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { spacing, borderRadius, typography } from "@/styles/design-system";
import { useTheme } from "@/contexts/ThemeContext";

interface RiskTrendChartProps {
  data: {
    dates: string[];
    scores: number[];
    averageScore: number;
    trend: "increasing" | "decreasing" | "stable";
  };
}

export default function RiskTrendChart({ data }: RiskTrendChartProps) {
  const { themeColors } = useTheme();
  const chartData = data.dates.map((date, index) => ({
    date: format(parseISO(date), "MMM dd"),
    score: data.scores[index] || 0,
  }));

  // Use pastel colors for trends
  const trendColor =
    data.trend === "increasing" ? "#f87171" : data.trend === "decreasing" ? "#6ee7b7" : "#fbbf24";

  return (
    <div style={{ width: "100%", height: "300px", padding: spacing.md }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
          <XAxis
            dataKey="date"
            stroke={themeColors.text.secondary}
            style={{ fontSize: typography.fontSize.sm }}
          />
          <YAxis
            stroke={themeColors.text.secondary}
            style={{ fontSize: typography.fontSize.sm }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: themeColors.white,
              border: `1px solid ${themeColors.border}`,
              borderRadius: borderRadius.md,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="score"
            stroke={trendColor}
            strokeWidth={2}
            dot={{ fill: trendColor, r: 4 }}
            name="Risk Skoru"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}



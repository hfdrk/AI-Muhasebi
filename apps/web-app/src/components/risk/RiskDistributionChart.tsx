"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { colors, spacing, typography, borderRadius } from "@/styles/design-system";

interface RiskDistributionChartProps {
  data: {
    dates: string[];
    low: number[];
    medium: number[];
    high: number[];
  };
}

export default function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const chartData = data.dates.map((date, index) => ({
    date: format(parseISO(date), "MMM dd"),
    low: data.low[index] || 0,
    medium: data.medium[index] || 0,
    high: data.high[index] || 0,
  }));

  return (
    <div style={{ width: "100%", height: "300px", padding: spacing.md }}>
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis
            dataKey="date"
            stroke={colors.text.secondary}
            style={{ fontSize: typography.fontSize.sm }}
          />
          <YAxis stroke={colors.text.secondary} style={{ fontSize: typography.fontSize.sm }} />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="low"
            stackId="1"
            stroke="#6ee7b7"
            fill="url(#colorLow)"
            name="Düşük Risk"
          />
          <Area
            type="monotone"
            dataKey="medium"
            stackId="1"
            stroke="#fbbf24"
            fill="url(#colorMedium)"
            name="Orta Risk"
          />
          <Area
            type="monotone"
            dataKey="high"
            stackId="1"
            stroke="#f87171"
            fill="url(#colorHigh)"
            name="Yüksek Risk"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


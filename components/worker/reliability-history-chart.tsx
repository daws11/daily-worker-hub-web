"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PeriodDays = 30 | 60 | 90;

export interface ReliabilityHistoryEntry {
  id: string;
  worker_id: string;
  score: number; // Mapped from new_score by API route
  created_at: string;
}

export interface ReliabilityHistoryChartProps {
  data: ReliabilityHistoryEntry[];
  className?: string;
  defaultPeriod?: PeriodDays;
}

const PERIOD_OPTIONS: { label: string; value: PeriodDays }[] = [
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
];

const formatScore = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    month: "short",
    day: "numeric",
  });
};

const filterDataByPeriod = (
  data: ReliabilityHistoryEntry[],
  days: PeriodDays,
): ReliabilityHistoryEntry[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return data
    .filter((entry) => new Date(entry.created_at) >= cutoffDate)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime(),
    );
};

const transformToChartData = (data: ReliabilityHistoryEntry[]) => {
  return data.map((entry) => ({
    label: formatDate(entry.created_at),
    reliability: entry.score,
    rawDate: entry.created_at,
  }));
};

export function ReliabilityHistoryChart({
  data,
  className,
  defaultPeriod = 30,
}: ReliabilityHistoryChartProps) {
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<PeriodDays>(defaultPeriod);

  const filteredData = React.useMemo(
    () => filterDataByPeriod(data, selectedPeriod),
    [data, selectedPeriod],
  );

  const chartData = React.useMemo(
    () => transformToChartData(filteredData),
    [filteredData],
  );

  const getScoreColor = (score: number): string => {
    if (score >= 4.5) return "#10b981";
    if (score >= 3.5) return "#22c55e";
    if (score >= 2.5) return "#f59e0b";
    return "#ef4444";
  };

  const lineColor = chartData.length > 0
    ? getScoreColor(chartData[chartData.length - 1].reliability)
    : "#10b981";

  return (
    <div
      className={cn(
        "p-4 border border-border rounded-lg bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#6b7280",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Reliability Score History
        </h3>

        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={selectedPeriod === option.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSelectedPeriod(option.value)}
              className={cn(
                "h-8 px-3 text-xs font-medium",
                selectedPeriod === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No reliability history data available for the selected period.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              style={{ fontSize: "0.75rem", fill: "#6b7280" }}
              tick={{ fill: "#6b7280" }}
              tickLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tickFormatter={formatScore}
              style={{ fontSize: "0.75rem", fill: "#6b7280" }}
              tick={{ fill: "#6b7280" }}
              tickLine={{ stroke: "#e5e7eb" }}
              domain={[0, 5]}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
              formatter={(value: number) => [
                formatScore(value),
                "Skor Reliabilitas",
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const rawDate = payload[0].payload.rawDate;
                  if (rawDate) {
                    const date = new Date(rawDate);
                    return date.toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  }
                }
                return label;
              }}
            />
            <Line
              type="monotone"
              dataKey="reliability"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {chartData.length > 0 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Showing {chartData.length} data point{chartData.length !== 1 ? "s" : ""} for the last {selectedPeriod} days
          </p>
        </div>
      )}
    </div>
  );
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { CoreWebVitalsCard } from "./core-web-vitals-card";

export interface AnalyticsPerformancePanelProps {
  /**
   * Core Web Vitals metric values.
   * Each entry drives one CoreWebVitalsCard.
   */
  webVitals: Array<{
    metric: "LCP" | "INP" | "CLS";
    value: number;
    rating: "good" | "needs-improvement" | "poor";
  }>;
  /**
   * Time-series performance score data for the trend chart.
   */
  performanceData: Array<{
    label: string;
    score: number;
  }>;
  chartColor?: string;
  chartHeight?: number;
}

const formatScore = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
};

export function AnalyticsPerformancePanel({
  webVitals,
  performanceData,
  chartColor = "#10b981",
  chartHeight = 280,
}: AnalyticsPerformancePanelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Core Web Vitals Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {webVitals.map((vital) => (
          <CoreWebVitalsCard
            key={vital.metric}
            metric={vital.metric}
            value={vital.value}
            rating={vital.rating}
          />
        ))}
      </div>

      {/* Performance Trend Chart */}
      <div
        style={{
          padding: "1rem",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          backgroundColor: "white",
        }}
      >
        <h3
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#6b7280",
            margin: "0 0 1rem 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Tren Performa
        </h3>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={performanceData}
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
                "Skor Performa",
              ]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={chartColor}
              strokeWidth={2}
              dot={{ fill: chartColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

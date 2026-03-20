"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface ErrorRateData {
  hour: number;
  count: number;
}

export interface ErrorTypeData {
  type: string;
  count: number;
}

export interface ErrorRateChartProps {
  trendData: ErrorRateData[];
  errorTypes: ErrorTypeData[];
  loading?: boolean;
  className?: string;
}

export function ErrorRateChart({
  trendData,
  errorTypes,
  loading = false,
  className,
}: ErrorRateChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatHour = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const chartData = trendData.map((point) => ({
    ...point,
    time: formatHour(point.hour),
  }));

  const totalErrors = errorTypes.reduce((sum, type) => sum + type.count, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Error Rate (24h)</CardTitle>
        <CardDescription>
          Error distribution over the last 24 hours - Total: {totalErrors}{" "}
          errors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value} errors`, "Count"]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(0, 72%, 51%)"
                strokeWidth={2}
                dot={{ fill: "hsl(0, 72%, 51%)", r: 3 }}
                name="Errors"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Error Types Breakdown */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Error Types</h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {errorTypes.map((type) => (
              <div
                key={type.type}
                className="flex items-center justify-between p-2 rounded-lg bg-muted"
              >
                <span className="text-sm">{type.type}</span>
                <span className="text-sm font-medium">{type.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

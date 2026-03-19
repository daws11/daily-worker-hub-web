"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface ResponseTimeData {
  timestamp: number
  average: number
  p95: number
  p99: number
}

export interface ResponseTimeChartProps {
  data: ResponseTimeData[]
  loading?: boolean
  className?: string
}

export function ResponseTimeChart({ data, loading = false, className }: ResponseTimeChartProps) {
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
    )
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const formatMs = (value: number) => `${value}ms`

  const chartData = data.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp),
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>API Response Time</CardTitle>
        <CardDescription>
          Response time distribution over the last hour (average, p95, p99)
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
              />
              <YAxis 
                tickFormatter={formatMs}
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
                formatter={(value: number, name: string) => [
                  formatMs(value),
                  name.toUpperCase(),
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="average"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Average"
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="hsl(215, 100%, 50%)"
                strokeWidth={2}
                dot={false}
                name="P95"
              />
              <Line
                type="monotone"
                dataKey="p99"
                stroke="hsl(25, 100%, 50%)"
                strokeWidth={2}
                dot={false}
                name="P99"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

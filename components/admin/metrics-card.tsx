"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function MetricsCard({
  title,
  value,
  description,
  trend,
  icon,
  loading = false,
  className,
}: MetricsCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value > 0) {
      return <TrendingUp className="h-3 w-3" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-3 w-3" />;
    }
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";

    // For metrics where decrease is good (like error rate, response time)
    const isGoodIfDecrease =
      title.toLowerCase().includes("error") ||
      title.toLowerCase().includes("response") ||
      title.toLowerCase().includes("blocked");

    if (isGoodIfDecrease) {
      return trend.value < 0
        ? "text-green-600"
        : trend.value > 0
          ? "text-red-600"
          : "text-muted-foreground";
    }

    // For metrics where increase is good (like cache hits, active users)
    return trend.value > 0
      ? "text-green-600"
      : trend.value < 0
        ? "text-red-600"
        : "text-muted-foreground";
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  getTrendColor(),
                )}
              >
                {getTrendIcon()}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ScoreHistoryEntry {
  id: string
  worker_id: string
  score: number
  attendance_rate: number
  punctuality_rate: number
  avg_rating: number
  completed_jobs_count: number
  calculated_at: string
  created_at: string
}

export interface ScoreHistoryProps {
  history: ScoreHistoryEntry[]
  currentScore?: number
  className?: string
  limit?: number
}

interface TrendBadgeProps {
  currentScore: number
  previousScore?: number
  className?: string
}

function TrendBadge({ currentScore, previousScore, className }: TrendBadgeProps) {
  if (previousScore === undefined) {
    return (
      <Badge variant="outline" className={cn("gap-1", className)}>
        <Minus className="h-3 w-3" />
        <span>Initial</span>
      </Badge>
    )
  }

  const diff = currentScore - previousScore

  if (diff > 0) {
    return (
      <Badge
        variant="default"
        className={cn(
          "gap-1 bg-green-500 hover:bg-green-600 text-white border-green-500",
          className
        )}
      >
        <TrendingUp className="h-3 w-3" />
        <span>+{diff.toFixed(1)}</span>
      </Badge>
    )
  }

  if (diff < 0) {
    return (
      <Badge
        variant="destructive"
        className={cn("gap-1", className)}
      >
        <TrendingDown className="h-3 w-3" />
        <span>{diff.toFixed(1)}</span>
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Minus className="h-3 w-3" />
      <span>No change</span>
    </Badge>
  )
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return "text-green-600 dark:text-green-400"
  if (score >= 3.5) return "text-yellow-600 dark:text-yellow-400"
  if (score >= 2.5) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return "Today"
  }

  if (diffDays === 1) {
    return "Yesterday"
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export function ScoreHistory({
  history,
  currentScore,
  className,
  limit = 10,
}: ScoreHistoryProps) {
  // Sort history by date descending (newest first) and limit
  const sortedHistory = [...history]
    .sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())
    .slice(0, limit)

  if (sortedHistory.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
          <CardDescription>
            Track your reliability score over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No score history available yet. Complete jobs to see your score progress.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score History</CardTitle>
        <CardDescription>
          Track your reliability score over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedHistory.map((entry, index) => {
            const previousEntry = sortedHistory[index + 1]
            const scoreColor = getScoreColor(entry.score)

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{formatDate(entry.calculated_at)}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.completed_jobs_count} job{entry.completed_jobs_count !== 1 ? "s" : ""} completed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <TrendBadge
                    currentScore={entry.score}
                    previousScore={previousEntry?.score}
                  />
                  <span className={cn("text-lg font-bold", scoreColor)}>
                    {entry.score.toFixed(1)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {history.length > limit && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min(limit, history.length)} of {history.length} entries
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

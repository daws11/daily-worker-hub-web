/**
 * Worker Shortlist Component
 *
 * Displays a ranked list of workers for a job with matching scores
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TierBadge, TierBadgeCompact } from "@/components/worker/tier-badge";
import { InstantDispatchBadge } from "@/components/business/instant-dispatch-badge";
import {
  WorkerWithScore,
  getInterviewRecommendation,
} from "@/lib/algorithms/generate-shortlist";
import { getMatchQuality } from "@/lib/algorithms/matching-score";
import { canInstantDispatch } from "@/lib/algorithms/interview-flow";
import { formatRupiah } from "@/lib/constants/rate-bali";
import {
  MapPin,
  Star,
  CheckCircle2,
  MessageSquare,
  Phone,
  Zap,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkerShortlistProps {
  shortlist: WorkerWithScore[];
  jobHourlyRate: number;
  jobHours: number;
  requiredWorkers: number;
  onSelectWorker: (worker: WorkerWithScore) => void;
  onViewProfile?: (worker: WorkerWithScore) => void;
  loading?: boolean;
}

export function WorkerShortlist({
  shortlist,
  jobHourlyRate,
  jobHours,
  requiredWorkers,
  onSelectWorker,
  onViewProfile,
  loading = false,
}: WorkerShortlistProps) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  const toggleExpand = (workerId: string) => {
    setExpandedWorker(expandedWorker === workerId ? null : workerId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Worker Shortlist</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-muted rounded-lg p-4 h-24"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (shortlist.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Worker Shortlist</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No matching workers found.</p>
            <p className="text-sm mt-1">
              Try adjusting your requirements or check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span>Worker Shortlist</span>
          <Badge variant="secondary" className="ml-auto">
            {shortlist.length} workers
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shortlist.map((worker, index) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            index={index}
            jobHourlyRate={jobHourlyRate}
            jobHours={jobHours}
            isExpanded={expandedWorker === worker.id}
            onToggleExpand={() => toggleExpand(worker.id)}
            onSelect={() => onSelectWorker(worker)}
            onViewProfile={() => onViewProfile?.(worker)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface WorkerCardProps {
  worker: WorkerWithScore;
  index: number;
  jobHourlyRate: number;
  jobHours: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onViewProfile?: () => void;
}

function WorkerCard({
  worker,
  index,
  jobHourlyRate,
  jobHours,
  isExpanded,
  onToggleExpand,
  onSelect,
  onViewProfile,
}: WorkerCardProps) {
  const matchQuality = getMatchQuality(worker.matchingScore);
  const interviewRec = getInterviewRecommendation(worker.tier);
  const canDispatchInstant = canInstantDispatch(worker.tier);
  const estimatedWage = jobHourlyRate * jobHours;

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all",
        index < 3 && "border-blue-200 bg-blue-50/50",
        index >= 3 && "border-border",
        isExpanded && "ring-2 ring-blue-200",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={worker.avatarUrl || undefined} />
          <AvatarFallback>{worker.fullName.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {worker.fullName}
                {index === 0 && (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600">
                    Best Match
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TierBadgeCompact tier={worker.tier} />
                <span className="text-sm text-muted-foreground">
                  {worker.jobsCompleted} jobs
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className={cn("font-bold text-lg", matchQuality.color)}>
                {worker.matchingScore}/115
              </div>
              <div className="text-xs text-muted-foreground">
                {matchQuality.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 mt-3 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{worker.distanceKm.toFixed(1)} km</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Star className="h-4 w-4" />
          <span>{worker.rating?.toFixed(1) || "N/A"}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <span>{worker.punctuality?.toFixed(0) || "N/A"}% punctual</span>
        </div>
      </div>

      {/* Interview Recommendation */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {canDispatchInstant ? (
          <InstantDispatchBadge size="sm" variant="outline" />
        ) : (
          <>
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              {interviewRec.type === "chat_and_voice" && (
                <>
                  <Phone className="h-3 w-3 inline mr-1" />
                </>
              )}
              {interviewRec.description} ({interviewRec.estimatedTime})
            </span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Details
            </>
          )}
        </Button>
        {onViewProfile && (
          <Button variant="outline" size="sm" onClick={onViewProfile}>
            Profile
          </Button>
        )}
        <Button
          size="sm"
          className={cn(
            "flex-1",
            canDispatchInstant && "bg-green-600 hover:bg-green-700",
          )}
          onClick={onSelect}
        >
          {canDispatchInstant ? "Instant Book" : "Select"}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* Score Breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Score Breakdown</h4>
            <ScoreBar
              label="Skills"
              value={worker.breakdown.skillScore}
              max={30}
            />
            <ScoreBar
              label="Distance"
              value={worker.breakdown.distanceScore}
              max={30}
            />
            <ScoreBar
              label="Availability"
              value={worker.breakdown.availabilityScore}
              max={20}
            />
            <ScoreBar
              label="Rating"
              value={worker.breakdown.ratingScore}
              max={15}
            />
            <ScoreBar
              label="Compliance"
              value={worker.breakdown.complianceScore}
              max={5}
            />
            <ScoreBar
              label={`${worker.tier} Bonus`}
              value={worker.breakdown.tierBonus}
              max={20}
              highlight
            />
          </div>

          {/* Wage Info */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Wage</span>
              <span className="font-medium">{formatRupiah(estimatedWage)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
}

function ScoreBar({ label, value, max, highlight = false }: ScoreBarProps) {
  const percentage = (value / max) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span
          className={
            highlight ? "font-medium text-blue-600" : "text-muted-foreground"
          }
        >
          {label}
        </span>
        <span className={highlight ? "font-medium text-blue-600" : ""}>
          {value}/{max}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn("h-1.5", highlight && "[&>div]:bg-blue-500")}
      />
    </div>
  );
}

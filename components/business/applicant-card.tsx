"use client"

import * as React from "react"
import { 
  User, 
  Star, 
  Award, 
  Phone, 
  MessageSquare,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TierBadge } from "@/components/worker/tier-badge"
import { ReliabilityScore } from "@/components/worker/reliability-score"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================================================
// TYPES
// ============================================================================

type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'

interface WorkerInfo {
  id: string
  full_name: string
  phone: string | null
  bio: string | null
  avatar_url: string | null
  tier: string
  rating: number | null
  reliability_score: number | null
  jobs_completed: number | null
}

interface JobApplication {
  id: string
  job_id: string
  worker_id: string
  business_id: string
  status: ApplicationStatus
  cover_letter: string | null
  proposed_wage: number | null
  applied_at: string
  workers: WorkerInfo | null
}

interface ApplicantCardProps {
  application: JobApplication
  budgetMin: number
  budgetMax: number
  onShortlist?: () => void
  onAccept?: () => void
  onReject?: () => void
  isProcessing?: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays} hari lalu`
  if (diffHours > 0) return `${diffHours} jam lalu`
  if (diffMins > 0) return `${diffMins} menit lalu`
  return "Baru saja"
}

const statusConfig: Record<ApplicationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Menunggu", variant: "secondary" },
  reviewed: { label: "Dipilih", variant: "default" },
  accepted: { label: "Diterima", variant: "default" },
  rejected: { label: "Ditolak", variant: "destructive" },
  withdrawn: { label: "Ditarik", variant: "outline" },
}

// ============================================================================
// APPLICANT CARD COMPONENT
// ============================================================================

export function ApplicantCard({
  application,
  budgetMin,
  budgetMax,
  onShortlist,
  onAccept,
  onReject,
  isProcessing = false,
}: ApplicantCardProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const worker = application.workers
  const config = statusConfig[application.status]

  const canTakeAction = application.status === 'pending' || application.status === 'reviewed'

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={worker?.avatar_url || undefined} alt={worker?.full_name} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {worker?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            {/* Worker Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">
                  {worker?.full_name || "Unknown Worker"}
                </h3>
                <Badge 
                  variant={config.variant}
                  className={application.status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {config.label}
                </Badge>
              </div>

              {/* Tier Badge */}
              {worker?.tier && (
                <div className="mt-1">
                  <TierBadge tier={worker.tier as any} size="sm" variant="minimal" />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Reliability Score */}
            {worker?.reliability_score !== null && worker?.reliability_score !== undefined && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <div>
                  <span className="text-xs text-muted-foreground">Skor</span>
                  <div className="flex items-center gap-1">
                    <ReliabilityScore 
                      score={worker.reliability_score} 
                      showValue 
                      size="sm" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Jobs Completed */}
            {worker?.jobs_completed !== null && worker?.jobs_completed !== undefined && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                <div>
                  <span className="text-xs text-muted-foreground">Pekerjaan</span>
                  <p className="font-medium text-sm">{worker.jobs_completed} selesai</p>
                </div>
              </div>
            )}
          </div>

          {/* Proposed Wage */}
          {application.proposed_wage && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-xs text-blue-600">Penawaran Gaji</span>
                <p className="font-semibold text-blue-700">{formatPrice(application.proposed_wage)}</p>
              </div>
              {(application.proposed_wage < budgetMin || application.proposed_wage > budgetMax) && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {application.proposed_wage < budgetMin ? "Di bawah budget" : "Di atas budget"}
                </Badge>
              )}
            </div>
          )}

          {/* Cover Letter Preview */}
          {application.cover_letter && (
            <div className="text-sm text-muted-foreground">
              <p className="line-clamp-2">{application.cover_letter}</p>
            </div>
          )}

          {/* Applied Time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Melamar {formatTimeAgo(application.applied_at)}</span>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-2 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Detail
          </Button>

          {canTakeAction && (
            <div className="flex gap-2">
              {application.status === 'pending' && onShortlist && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShortlist}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" />
                      Pilih
                    </>
                  )}
                </Button>
              )}
              
              {onAccept && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onAccept}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Terima
                    </>
                  )}
                </Button>
              )}

              {onReject && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onReject}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Tolak
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {application.status === 'accepted' && (
            <Badge className="bg-green-600">Diterima</Badge>
          )}

          {application.status === 'rejected' && (
            <Badge variant="destructive">Ditolak</Badge>
          )}
        </CardFooter>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pelamar</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang pelamar dan lamarannya
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Worker Profile */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={worker?.avatar_url || undefined} alt={worker?.full_name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                  {worker?.full_name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{worker?.full_name}</h3>
                {worker?.tier && (
                  <TierBadge tier={worker.tier as any} size="md" />
                )}
                {worker?.phone && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{worker.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {worker?.reliability_score !== null && worker?.reliability_score !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground">Skor Reliabilitas</span>
                  <div className="mt-1">
                    <ReliabilityScore 
                      score={worker.reliability_score} 
                      showValue 
                      showLabel
                      size="md" 
                    />
                  </div>
                </div>
              )}
              {worker?.jobs_completed !== null && worker?.jobs_completed !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground">Pekerjaan Selesai</span>
                  <p className="text-xl font-bold mt-1">{worker.jobs_completed}</p>
                </div>
              )}
              {worker?.rating !== null && worker?.rating !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground">Rating</span>
                  <p className="text-xl font-bold mt-1 flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {worker.rating.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Bio */}
            {worker?.bio && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tentang</h4>
                <p className="text-sm text-muted-foreground">{worker.bio}</p>
              </div>
            )}

            {/* Cover Letter */}
            {application.cover_letter && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Cover Letter
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.cover_letter}
                </p>
              </div>
            )}

            {/* Proposed Wage */}
            {application.proposed_wage && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-600">Penawaran Gaji</span>
                <p className="text-xl font-bold text-blue-700">
                  {formatPrice(application.proposed_wage)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Budget: {formatPrice(budgetMin)} - {formatPrice(budgetMax)}
                </p>
              </div>
            )}

            {/* Applied Time */}
            <div className="text-xs text-muted-foreground">
              Melamar pada {new Date(application.applied_at).toLocaleString("id-ID")}
            </div>
          </div>

          {/* Action Buttons in Dialog */}
          {canTakeAction && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              {application.status === 'pending' && onShortlist && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false)
                    onShortlist()
                  }}
                  disabled={isProcessing}
                >
                  Pilih
                </Button>
              )}
              {onAccept && (
                <Button
                  onClick={() => {
                    setShowDetails(false)
                    onAccept()
                  }}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Terima
                </Button>
              )}
              {onReject && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetails(false)
                    onReject()
                  }}
                  disabled={isProcessing}
                >
                  Tolak
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getComplianceOverview,
  getComplianceWarningsList,
  acknowledgeComplianceWarning,
  exportComplianceCsv,
  type ComplianceOverview,
  type WorkerComplianceDetail,
} from "@/lib/actions/compliance";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Search,
  Users,
  XCircle,
  Calendar,
  Building2,
  User,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminCompliancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [warnings, setWarnings] = useState<WorkerComplianceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "warning" | "blocked"
  >("all");

  // Month options for selector (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const label = date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
    });
    return { value, label };
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch overview
      const overviewResult = await getComplianceOverview(selectedMonth);
      if (overviewResult.error) {
        throw new Error(overviewResult.error);
      }
      setOverview(overviewResult.data);

      // Fetch warnings
      const warningsResult = await getComplianceWarningsList(selectedMonth);
      if (warningsResult.error) {
        throw new Error(warningsResult.error);
      }
      setWarnings(warningsResult.data || []);
    } catch (err) {
      console.error("Error fetching compliance data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load compliance data",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedMonth]);

  // Filter warnings
  const filteredWarnings = warnings.filter((w) => {
    const matchesSearch =
      w.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.business_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || w.compliance_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle acknowledge
  const handleAcknowledge = async (warningId: string) => {
    try {
      const result = await acknowledgeComplianceWarning(warningId, user?.id);
      if (result.error) {
        throw new Error(result.error);
      }
      toast.success("Warning acknowledged successfully");
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error("Error acknowledging warning:", err);
      toast.error("Failed to acknowledge warning");
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const result = await exportComplianceCsv(selectedMonth);
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.data) {
        // Create download
        const blob = new Blob([result.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compliance-report-${selectedMonth}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Export successful");
      }
    } catch (err) {
      console.error("Error exporting data:", err);
      toast.error("Failed to export data");
    }
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor worker compliance with PP 35/2021 regulations
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>PP 35/2021:</strong> Daily workers can work maximum 21 days
          per month per business. Workers in warning status (15-20 days) should
          be monitored closely. Workers at 21+ days must be blocked from new
          bookings.
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v as string)}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Workers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Workers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalWorkers}</div>
              <p className="text-xs text-muted-foreground">
                {overview.totalBusinesses} businesses
              </p>
            </CardContent>
          </Card>

          {/* Compliant */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Compliant (0-14 days)
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {overview.compliantWorkers}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview.complianceRate}% compliance rate
              </p>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Warning (15-20 days)
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {overview.warningWorkers}
              </div>
              <p className="text-xs text-muted-foreground">Approaching limit</p>
            </CardContent>
          </Card>

          {/* Blocked */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Blocked (21+ days)
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overview.blockedWorkers}
              </div>
              <p className="text-xs text-muted-foreground">Limit reached</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by worker or business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as "all" | "warning" | "blocked")
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warnings Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredWarnings.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No compliance warnings</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "No workers match your current filters"
                  : "All workers are compliant with PP 35/2021"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Compliance Warnings ({filteredWarnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">
                      Worker Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Business Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium">
                      Days Worked
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarnings.map((w) => (
                    <tr key={w.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{w.worker_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{w.business_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{w.days_worked}</span>
                        <span className="text-muted-foreground text-sm ml-1">
                          / 21
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {w.compliance_status === "warning" ? (
                          <Badge variant="outline">Warning</Badge>
                        ) : w.compliance_status === "blocked" ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {w.acknowledged ? (
                          <span className="text-sm text-muted-foreground">
                            Acknowledged
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(w.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

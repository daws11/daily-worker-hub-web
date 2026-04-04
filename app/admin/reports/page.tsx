"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  DollarSign,
  Shield,
  Calendar,
  CheckCircle,
  Loader2,
  Filter,
} from "lucide-react";

import { useAuth } from "@/app/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  exportBookingsCsv,
  exportPaymentsCsv,
  exportComplianceCsv,
} from "@/lib/actions/admin";

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [bookingsForm, setBookingsForm] = useState({
    startDate: "",
    endDate: "",
  });

  const [paymentsForm, setPaymentsForm] = useState({
    startDate: "",
    endDate: "",
  });

  const [complianceForm, setComplianceForm] = useState({
    month: new Date().toISOString().slice(0, 7) + "-01",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/admin/reports");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Set default dates
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);

    setBookingsForm({
      startDate: lastMonth.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    });

    setPaymentsForm({
      startDate: lastMonth.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    });
  }, []);

  const handleExportBookings = async () => {
    try {
      setExporting("bookings");
      setExportSuccess(null);
      setExportError(null);

      const result = await exportBookingsCsv(
        bookingsForm.startDate || undefined,
        bookingsForm.endDate || undefined,
      );

      if (result.data) {
        const filename = `bookings_report_${bookingsForm.startDate}_${bookingsForm.endDate}.csv`;
        downloadCsv(result.data, filename);
        setExportSuccess("Bookings report exported successfully");
      } else {
        setExportError(result.error || "Failed to export bookings");
      }
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export bookings",
      );
    } finally {
      setExporting(null);
    }
  };

  const handleExportPayments = async () => {
    try {
      setExporting("payments");
      setExportSuccess(null);
      setExportError(null);

      const result = await exportPaymentsCsv(
        paymentsForm.startDate || undefined,
        paymentsForm.endDate || undefined,
      );

      if (result.data) {
        const filename = `payments_report_${paymentsForm.startDate}_${paymentsForm.endDate}.csv`;
        downloadCsv(result.data, filename);
        setExportSuccess("Payments report exported successfully");
      } else {
        setExportError(result.error || "Failed to export payments");
      }
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export payments",
      );
    } finally {
      setExporting(null);
    }
  };

  const handleExportCompliance = async () => {
    try {
      setExporting("compliance");
      setExportSuccess(null);
      setExportError(null);

      const result = await exportComplianceCsv(complianceForm.month);

      if (result.data) {
        const filename = `compliance_report_${complianceForm.month}.csv`;
        downloadCsv(result.data, filename);
        setExportSuccess("Compliance report exported successfully");
      } else {
        setExportError(result.error || "Failed to export compliance");
      }
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to export compliance",
      );
    } finally {
      setExporting(null);
    }
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatMonth = (month: string) => {
    const date = new Date(month);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Export and download platform data reports
        </p>
      </div>

      {/* Success/Error Messages */}
      {exportSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {exportSuccess}
          </AlertDescription>
        </Alert>
      )}

      {exportError && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertDescription className="text-red-800 dark:text-red-200">
            {exportError}
          </AlertDescription>
        </Alert>
      )}

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Bookings Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bookings Report
            </CardTitle>
            <CardDescription>
              Export all bookings with worker, business, and payment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bookings-start">Start Date</Label>
              <Input
                id="bookings-start"
                type="date"
                value={bookingsForm.startDate}
                onChange={(e) =>
                  setBookingsForm({
                    ...bookingsForm,
                    startDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookings-end">End Date</Label>
              <Input
                id="bookings-end"
                type="date"
                value={bookingsForm.endDate}
                onChange={(e) =>
                  setBookingsForm({ ...bookingsForm, endDate: e.target.value })
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={handleExportBookings}
              disabled={exporting === "bookings"}
            >
              {exporting === "bookings" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Bookings
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Includes: Worker info, Business info, Job title, Work date,
              Status, Amount, Fees, Payment status
            </p>
          </CardContent>
        </Card>

        {/* Payments Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payments Report
            </CardTitle>
            <CardDescription>
              Export payment transactions and fee breakdowns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payments-start">Start Date</Label>
              <Input
                id="payments-start"
                type="date"
                value={paymentsForm.startDate}
                onChange={(e) =>
                  setPaymentsForm({
                    ...paymentsForm,
                    startDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payments-end">End Date</Label>
              <Input
                id="payments-end"
                type="date"
                value={paymentsForm.endDate}
                onChange={(e) =>
                  setPaymentsForm({ ...paymentsForm, endDate: e.target.value })
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={handleExportPayments}
              disabled={exporting === "payments"}
            >
              {exporting === "payments" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Payments
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Includes: Transaction ID, Type, Amount, Status, Worker, Business,
              Dates
            </p>
          </CardContent>
        </Card>

        {/* Compliance Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Report
            </CardTitle>
            <CardDescription>
              Export PP 35/2021 compliance data for all workers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="compliance-month">Month</Label>
              <Select
                value={complianceForm.month}
                onValueChange={(value) => setComplianceForm({ month: value || "" })}
              >
                <SelectTrigger id="compliance-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - offset);
                    const month = date.toISOString().slice(0, 7) + "-01";
                    return (
                      <SelectItem key={month} value={month}>
                        {formatMonth(month)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleExportCompliance}
              disabled={exporting === "compliance"}
            >
              {exporting === "compliance" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Compliance
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Includes: Worker info, Business info, Month, Days worked,
              Compliance status, Warning level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Bookings Report</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive booking data including worker and business
                details, job information, work dates, booking status, payment
                amounts, platform fees, worker payouts, and payment status.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Payments Report</h4>
              <p className="text-sm text-muted-foreground">
                Transaction data showing all payments processed through the
                platform, including transaction IDs, types (booking payment,
                payout, refund), amounts, status, and processing dates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Compliance Report</h4>
              <p className="text-sm text-muted-foreground">
                PP 35/2021 compliance tracking data showing days worked per
                worker per business per month, compliance status
                (compliant/warning/blocked), and warning levels. Use this to
                monitor adherence to Indonesian labor regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Bookings Export Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">10,000</p>
            <p className="text-xs text-muted-foreground">records per export</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">File Format</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">CSV</p>
            <p className="text-xs text-muted-foreground">
              comma-separated values
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Character Encoding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">UTF-8</p>
            <p className="text-xs text-muted-foreground">
              universal character set
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

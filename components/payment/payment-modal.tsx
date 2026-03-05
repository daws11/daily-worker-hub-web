"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, QrCode, Wallet, CreditCard, Smartphone, Landmark } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatIDR } from "@/lib/utils/currency"
import type { PaymentProvider } from "@/lib/payments"

// Form schema types
export interface PaymentModalFormValues {
  amount: number
  provider: PaymentProvider
  paymentMethod: string
}

export interface PaymentFeeCalculation {
  amount: number
  fee_amount: number
  total_amount: number
  fee_percentage?: number
}

export interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  provider: PaymentProvider
  supportedMethods: string[]
}

export interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  onSuccess?: (transactionId: string) => void
  minAmount?: number
  maxAmount?: number
  defaultProvider?: PaymentProvider
  defaultPaymentMethod?: string
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "qris",
    name: "QRIS",
    description: "Scan QR code with any Indonesian payment app",
    icon: <QrCode className="h-5 w-5" />,
    provider: "xendit",
    supportedMethods: ["qris", "QRIS"],
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Transfer via Virtual Account (BCA, BRI, Mandiri, BNI)",
    icon: <Landmark className="h-5 w-5" />,
    provider: "midtrans",
    supportedMethods: ["bank_transfer", "va"],
  },
  {
    id: "ewallet",
    name: "E-Wallet",
    description: "Pay via GoPay, ShopeePay, OVO, DANA",
    icon: <Smartphone className="h-5 w-5" />,
    provider: "midtrans",
    supportedMethods: ["gopay", "shopeepay", "dana", "ovo"],
  },
  {
    id: "card",
    name: "Credit Card",
    description: "Pay with Visa, Mastercard, JCB",
    icon: <CreditCard className="h-5 w-5" />,
    provider: "midtrans",
    supportedMethods: ["credit_card"],
  },
]

export function PaymentModal({
  open,
  onOpenChange,
  businessId,
  onSuccess,
  minAmount = 500000,
  maxAmount = 100000000,
  defaultProvider = "xendit",
  defaultPaymentMethod = "qris",
}: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isCalculatingFee, setIsCalculatingFee] = React.useState(false)
  const [feeCalculation, setFeeCalculation] = React.useState<PaymentFeeCalculation | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<PaymentMethod | null>(
    PAYMENT_METHODS.find(m => m.supportedMethods.includes(defaultPaymentMethod)) || PAYMENT_METHODS[0]
  )

  const form = useForm<PaymentModalFormValues>({
    defaultValues: {
      amount: 0,
      provider: defaultProvider,
      paymentMethod: defaultPaymentMethod,
    },
  })

  const watchedAmount = form.watch("amount")
  const watchedProvider = form.watch("provider")

  // Calculate fee when amount changes
  React.useEffect(() => {
    const calculateFee = async () => {
      if (watchedAmount > 0 && selectedPaymentMethod) {
        setIsCalculatingFee(true)
        try {
          const url = `/api/payments/create?amount=${watchedAmount}&provider=${selectedPaymentMethod.provider}&payment_method=${selectedPaymentMethod.supportedMethods[0]}`
          const response = await fetch(url)
          
          if (response.ok) {
            const data = await response.json()
            if (data.valid) {
              setFeeCalculation(data.data)
            }
          }
        } catch (error) {
          console.error("Error calculating fee:", error)
        } finally {
          setIsCalculatingFee(false)
        }
      }
    }

    const timeoutId = setTimeout(calculateFee, 500)
    return () => clearTimeout(timeoutId)
  }, [watchedAmount, selectedPaymentMethod])

  const handleSubmit = async (values: PaymentModalFormValues) => {
    if (!selectedPaymentMethod) {
      toast.error("Please select a payment method")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          amount: values.amount,
          provider: selectedPaymentMethod.provider,
          payment_method: selectedPaymentMethod.supportedMethods[0],
          metadata: {
            payment_method_name: selectedPaymentMethod.name,
          },
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Payment invoice created successfully!")

        // Redirect to payment URL if available
        if (data.data.payment.invoice_url) {
          window.open(data.data.payment.invoice_url, "_blank")
        }

        // Show QR code if available
        if (data.data.payment.qr_string) {
          toast.success("Scan the QR code to complete payment")
        }

        form.reset()
        setFeeCalculation(null)
        onOpenChange(false)
        onSuccess?.(data.data.transaction.id)
      } else {
        toast.error(data.error || "Failed to create payment. Please try again.")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      toast.error("Failed to create payment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentMethodChange = (methodId: string) => {
    const method = PAYMENT_METHODS.find(m => m.id === methodId)
    if (method) {
      setSelectedPaymentMethod(method)
      form.setValue("provider", method.provider)
      form.setValue("paymentMethod", method.supportedMethods[0])
    }
  }

  const isAmountValid = watchedAmount >= minAmount && watchedAmount <= maxAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Top Up Wallet
          </DialogTitle>
          <DialogDescription>
            Add funds to your business wallet to pay for worker bookings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Amount Input */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top-up Amount</FormLabel>
                  <FormDescription>
                    Enter amount between {formatIDR(minAmount)} and {formatIDR(maxAmount)}
                  </FormDescription>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        min={minAmount}
                        max={maxAmount}
                        step={1000}
                        className="text-2xl font-semibold"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        IDR
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {watchedAmount > 0 && !isAmountValid && (
                    <p className="text-sm text-destructive">
                      Amount must be between {formatIDR(minAmount)} and {formatIDR(maxAmount)}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Fee Breakdown */}
            {feeCalculation && (
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatIDR(feeCalculation.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee ({feeCalculation.fee_percentage ? `${(feeCalculation.fee_percentage * 100).toFixed(2)}%` : 'Flat'})</span>
                  <span className="font-medium">{formatIDR(feeCalculation.fee_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatIDR(feeCalculation.total_amount)}</span>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all ${
                      selectedPaymentMethod?.id === method.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {method.icon}
                      <span className="font-medium">{method.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hidden provider fields */}
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isAmountValid || watchedAmount <= 0}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue
                    {feeCalculation && ` (${formatIDR(feeCalculation.total_amount)})`}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

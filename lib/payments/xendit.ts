/**
 * Xendit Payment Gateway Client
 *
 * Provides a unified interface for Xendit payment operations:
 * - QRIS payments for business wallet top-ups
 * - Invoice creation and management
 * - Payment status verification
 * - Webhook signature verification
 *
 * @see https://developers.xendit.co/
 */

import type {
  PaymentGateway,
  CreateInvoiceInput,
  InvoiceResponse,
  PaymentStatusResponse,
  DisbursementInput,
  DisbursementResponse,
} from "./gateway";

// Xendit API Configuration
const XENDIT_API_URL = process.env.XENDIT_API_URL || "https://api.xendit.co";
const XENDIT_INVOICE_API_URL =
  process.env.XENDIT_INVOICE_API_URL || "https://api.xendit.co/v2/invoices";

/**
 * Retry configuration for API calls
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Get Xendit secret API key from environment
 * @throws {Error} If XENDIT_SECRET_KEY is not set
 */
function getApiKey(): string {
  const apiKey = process.env.XENDIT_SECRET_KEY;
  if (!apiKey) {
    throw new Error("XENDIT_SECRET_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Get Xendit webhook verification token
 */
function getWebhookToken(): string {
  const token = process.env.XENDIT_WEBHOOK_TOKEN || "";
  return token;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs,
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Make an authenticated request to Xendit API with retry logic
 */
async function xenditRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${XENDIT_API_URL}${endpoint}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
          ...options.headers,
        },
      });

      // Success - return response
      if (response.ok) {
        return response.json() as Promise<T>;
      }

      // Client errors (4xx) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`Xendit API error (${response.status}): ${errorText}`);
      }

      // Server errors (5xx) - retry
      if (response.status >= 500) {
        const errorText = await response.text();
        lastError = new Error(
          `Xendit API error (${response.status}): ${errorText}`,
        );

        if (attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig);
          console.warn(
            `Xendit API retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }
      }
    } catch (error) {
      // Network errors - retry
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (attempt < retryConfig.maxRetries) {
        const delay = calculateBackoff(attempt, retryConfig);
        console.warn(
          `Xendit API retry ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`,
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError || new Error("Xendit API request failed after retries");
}

/**
 * Xendit Invoice API response
 */
interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  amount: number;
  description: string;
  invoice_url: string;
  expiry_date: string;
  created: string;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  fees?: {
    type: string;
    value: number;
  }[];
}

/**
 * Xendit QRIS payment response
 */
interface XenditQRISResponse {
  id: string;
  external_id: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED";
  amount: number;
  payment_url: string;
  qr_string: string;
  expires_at: string;
  created: string;
}

/**
 * Xendit Disbursement response
 */
interface XenditDisbursementResponse {
  id: string;
  external_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number;
  bank_code: string;
  account_holder_name: string;
  disbursement_description?: string;
  email_to?: string;
  created: string;
  updated?: string;
  completed_at?: string;
  failure_reason?: string;
  is_instant?: boolean;
  estimated_arrival_time?: string;
}

/**
 * Xendit Disbursement status response
 */
interface XenditDisbursementStatusResponse {
  id: string;
  external_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number;
  bank_code: string;
  account_holder_name: string;
  created: string;
  updated?: string;
  completed_at?: string;
  failure_reason?: string;
  estimated_arrival_time?: string;
}

/**
 * Xendit Payment Gateway Implementation
 */
export class XenditGateway implements PaymentGateway {
  readonly provider = "xendit";

  /**
   * Create a new invoice using Xendit Invoice API
   */
  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceResponse> {
    try {
      const invoiceData = {
        external_id: input.externalId,
        amount: input.amount,
        description: input.description,
        payer_email: input.customerEmail,
        customer: input.customerName
          ? {
              given_names: input.customerName,
            }
          : undefined,
        invoice_duration: input.expiryMinutes ? input.expiryMinutes * 60 : 3600, // Default 1 hour
        currency: "IDR",
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
        payment_methods: this.getPaymentMethods(input.paymentMethod),
        metadata: input.metadata,
      };

      const response = await xenditRequest<XenditInvoiceResponse>(
        "/v2/invoices",
        {
          method: "POST",
          body: JSON.stringify(invoiceData),
        },
      );

      return {
        id: response.id,
        externalId: response.external_id,
        provider: "xendit",
        amount: response.amount,
        status: this.mapStatus(response.status),
        invoiceUrl: response.invoice_url,
        expiresAt: response.expiry_date,
        createdAt: response.created,
        paidAt: response.paid_at,
        paymentMethod: response.payment_method,
        paymentChannel: response.payment_channel,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create Xendit invoice: ${error.message}`);
      }
      throw new Error("Failed to create Xendit invoice: Unknown error");
    }
  }

  /**
   * Create QRIS payment (Indonesian QR payment standard)
   */
  async createQRISPayment(input: CreateInvoiceInput): Promise<InvoiceResponse> {
    try {
      const qrisData = {
        external_id: input.externalId,
        type: "DYNAMIC",
        amount: input.amount,
        currency: "IDR",
        description: input.description,
        callback_url: input.callbackUrl,
        expires_at: input.expiryMinutes
          ? new Date(Date.now() + input.expiryMinutes * 60000).toISOString()
          : new Date(Date.now() + 60 * 60000).toISOString(),
        metadata: input.metadata,
      };

      const response = await xenditRequest<XenditQRISResponse>("/qr_codes", {
        method: "POST",
        body: JSON.stringify(qrisData),
      });

      return {
        id: response.id,
        externalId: response.external_id,
        provider: "xendit",
        amount: response.amount,
        status: this.mapStatus(response.status),
        invoiceUrl: response.payment_url,
        qrString: response.qr_string,
        expiresAt: response.expires_at,
        createdAt: response.created,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create QRIS payment: ${error.message}`);
      }
      throw new Error("Failed to create QRIS payment: Unknown error");
    }
  }

  /**
   * Verify payment status by invoice ID
   */
  async verifyPayment(invoiceId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await xenditRequest<XenditInvoiceResponse>(
        `/v2/invoices/${invoiceId}`,
      );

      return {
        id: response.id,
        externalId: response.external_id,
        provider: "xendit",
        amount: response.amount,
        status: this.mapStatus(response.status),
        paidAt: response.paid_at,
        paymentMethod: response.payment_method,
        paymentChannel: response.payment_channel,
        fees: response.fees?.map((f) => ({
          type: f.type,
          amount: f.value,
        })),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify Xendit payment: ${error.message}`);
      }
      throw new Error("Failed to verify Xendit payment: Unknown error");
    }
  }

  /**
   * Get payment status by external ID
   */
  async getPaymentStatus(externalId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await xenditRequest<XenditInvoiceResponse[]>(
        `/v2/invoices?external_id=${externalId}`,
      );

      if (!response || response.length === 0) {
        throw new Error(`Invoice not found: ${externalId}`);
      }

      const invoice = response[0];

      return {
        id: invoice.id,
        externalId: invoice.external_id,
        provider: "xendit",
        amount: invoice.amount,
        status: this.mapStatus(invoice.status),
        paidAt: invoice.paid_at,
        paymentMethod: invoice.payment_method,
        paymentChannel: invoice.payment_channel,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get Xendit payment status: ${error.message}`,
        );
      }
      throw new Error("Failed to get Xendit payment status: Unknown error");
    }
  }

  /**
   * Verify Xendit webhook signature
   */
  verifyWebhookSignature(signature: string | null, payload?: string): boolean {
    if (!signature) {
      return false;
    }

    const webhookToken = getWebhookToken();

    // Xendit webhook token verification is a direct string comparison
    // The callback token header should match the webhook token
    return signature === webhookToken;
  }

  /**
   * Calculate Xendit payment fee based on payment method
   */
  calculateFee(amount: number, paymentMethod?: string): number {
    // QRIS: 0.7% + Rp 500
    if (paymentMethod === "QRIS" || paymentMethod === "qris") {
      const variableFee = Math.floor(amount * 0.007);
      return variableFee + 500;
    }

    // Bank transfer (VA): 0.5% + Rp 4,000
    if (paymentMethod === "BANK_TRANSFER" || paymentMethod === "va") {
      const variableFee = Math.floor(amount * 0.005);
      return variableFee + 4000;
    }

    // E-wallet: 1.5%
    if (paymentMethod === "E_WALLET" || paymentMethod === "ewallet") {
      return Math.floor(amount * 0.015);
    }

    // Default: QRIS fee
    const variableFee = Math.floor(amount * 0.007);
    return variableFee + 500;
  }

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Get balance as a simple validation check
      await xenditRequest<{ balance: number }>("/balance");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a disbursement (withdrawal to bank account)
   */
  async createDisbursement(
    input: DisbursementInput,
  ): Promise<DisbursementResponse> {
    try {
      const disbursementData = {
        external_id: input.externalId,
        amount: input.amount,
        bank_code: input.bankDetails.bankCode.toUpperCase(),
        account_holder_name: input.bankDetails.accountHolderName,
        account_number: input.bankDetails.accountNumber,
        description: input.description || `Withdrawal - ${input.externalId}`,
        email_to: input.emailTo,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      };

      const response = await xenditRequest<XenditDisbursementResponse>(
        "/v2/disbursements",
        {
          method: "POST",
          body: JSON.stringify(disbursementData),
        },
      );

      return {
        id: response.id,
        externalId: response.external_id,
        provider: "xendit",
        amount: response.amount,
        status: this.mapDisbursementStatus(response.status),
        bankCode: response.bank_code,
        accountNumber: disbursementData.account_number,
        accountHolderName: response.account_holder_name,
        estimatedArrival: response.estimated_arrival_time,
        createdAt: response.created,
        completedAt: response.completed_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to create Xendit disbursement: ${error.message}`,
        );
      }
      throw new Error("Failed to create Xendit disbursement: Unknown error");
    }
  }

  /**
   * Get disbursement status by ID
   */
  async getDisbursementStatus(
    disbursementId: string,
  ): Promise<DisbursementResponse> {
    try {
      const response = await xenditRequest<XenditDisbursementStatusResponse>(
        `/v2/disbursements/${disbursementId}`,
      );

      return {
        id: response.id,
        externalId: response.external_id,
        provider: "xendit",
        amount: response.amount,
        status: this.mapDisbursementStatus(response.status),
        bankCode: response.bank_code,
        accountNumber: "", // Not returned in status response
        accountHolderName: response.account_holder_name,
        estimatedArrival: response.estimated_arrival_time,
        createdAt: response.created,
        completedAt: response.completed_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get disbursement status: ${error.message}`);
      }
      throw new Error("Failed to get disbursement status: Unknown error");
    }
  }

  /**
   * Map Xendit disbursement status to internal status
   */
  private mapDisbursementStatus(
    status: string,
  ): "pending" | "processing" | "completed" | "failed" | "cancelled" {
    const statusMap: Record<
      string,
      "pending" | "processing" | "completed" | "failed" | "cancelled"
    > = {
      PENDING: "pending",
      PROCESSING: "processing",
      COMPLETED: "completed",
      FAILED: "failed",
      CANCELLED: "cancelled",
    };

    return statusMap[status] || "pending";
  }

  /**
   * Map Xendit status to internal status
   */
  private mapStatus(
    status: string,
  ): "pending" | "paid" | "failed" | "expired" | "cancelled" {
    const statusMap: Record<
      string,
      "pending" | "paid" | "failed" | "expired" | "cancelled"
    > = {
      PENDING: "pending",
      PAID: "paid",
      COMPLETED: "paid",
      EXPIRED: "expired",
      CANCELLED: "cancelled",
      FAILED: "failed",
    };

    return statusMap[status] || "pending";
  }

  /**
   * Get payment methods array based on payment type
   */
  private getPaymentMethods(paymentMethod?: string): string[] | undefined {
    if (!paymentMethod) return undefined;

    switch (paymentMethod.toUpperCase()) {
      case "QRIS":
        return ["QRIS"];
      case "BANK_TRANSFER":
      case "VA":
        return ["BANK_TRANSFER"];
      case "E_WALLET":
      case "EWALLET":
        return ["E_WALLET"];
      case "CREDIT_CARD":
      case "CARD":
        return ["CREDIT_CARD"];
      default:
        return undefined;
    }
  }
}

// Export singleton instance
export const xenditGateway = new XenditGateway();

// Export utility functions for backward compatibility
export function calculatePaymentFee(
  amount: number,
  paymentMethod?: string,
): number {
  return xenditGateway.calculateFee(amount, paymentMethod);
}

export function verifyWebhookSignature(signature: string | null): boolean {
  return xenditGateway.verifyWebhookSignature(signature);
}

export function mapPaymentStatus(
  status: string,
): "pending" | "paid" | "failed" | "expired" | "cancelled" {
  const statusMap: Record<
    string,
    "pending" | "paid" | "failed" | "expired" | "cancelled"
  > = {
    PENDING: "pending",
    PAID: "paid",
    COMPLETED: "paid",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    FAILED: "failed",
  };
  return statusMap[status] || "pending";
}

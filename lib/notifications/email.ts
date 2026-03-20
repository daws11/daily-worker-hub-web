"use server";

import { Resend } from "resend";
import type { ReactElement } from "react";

// Lazy initialization to avoid error when RESEND_API_KEY is not set
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export type EmailResult = {
  success: boolean;
  error?: string;
  data?: { id: string };
};

export interface EmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

/**
 * Send an email using Resend
 * @param options - Email options including recipient, subject, and React template
 * @returns Result with success status and email ID or error
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY is not configured - email sending is disabled",
      );
      return {
        success: false,
        error: "Layanan email belum dikonfigurasi. Hubungi administrator.",
      };
    }

    // Validate recipient
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const validRecipients = recipients.filter(
      (email) => email && isValidEmail(email),
    );

    if (validRecipients.length === 0) {
      return {
        success: false,
        error: "Alamat email tidak valid",
      };
    }

    // Send email via Resend
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        error: "Layanan email belum dikonfigurasi. Hubungi administrator.",
      };
    }

    const { data, error } = await resend.emails.send({
      from: "Daily Worker Hub <noreply@dailyworkerhub.id>",
      to: validRecipients,
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: `Gagal mengirim email: ${error.message}`,
      };
    }

    return {
      success: true,
      data: { id: data?.id || "" },
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat mengirim email",
    };
  }
}

/**
 * Send a plain text email using Resend
 * @param options - Email options with text content
 * @returns Result with success status and email ID or error
 */
export async function sendTextEmail(
  to: string | string[],
  subject: string,
  text: string,
  replyTo?: string,
): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn(
        "RESEND_API_KEY is not configured - email sending is disabled",
      );
      return {
        success: false,
        error: "Layanan email belum dikonfigurasi",
      };
    }

    const recipients = Array.isArray(to) ? to : [to];
    const validRecipients = recipients.filter(
      (email) => email && isValidEmail(email),
    );

    if (validRecipients.length === 0) {
      return { success: false, error: "Alamat email tidak valid" };
    }

    const { data, error } = await resend.emails.send({
      from: "Daily Worker Hub <noreply@dailyworkerhub.id>",
      to: validRecipients,
      subject,
      text,
      replyTo,
    });

    if (error) {
      console.error("Failed to send text email:", error);
      return {
        success: false,
        error: `Gagal mengirim email: ${error.message}`,
      };
    }

    return { success: true, data: { id: data?.id || "" } };
  } catch (error) {
    console.error("Error sending text email:", error);
    return { success: false, error: "Terjadi kesalahan saat mengirim email" };
  }
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email service is configured
 */
export async function isEmailConfigured(): Promise<boolean> {
  return !!process.env.RESEND_API_KEY;
}

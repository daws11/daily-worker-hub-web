"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../providers/auth-provider";
import { useTranslation } from "@/lib/i18n/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AccountTypeSelector } from "@/components/ui/account-type-selector";
import { Separator } from "@/components/ui/separator";

// Worker Icon
function WorkerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

// Business Icon
function BusinessIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

const accountTypeOptions = [
  {
    value: "worker" as const,
    label: "Pekerja",
    description: "Cari lowongan dan lamar kerja",
    icon: WorkerIcon,
    color: "text-blue-600",
  },
  {
    value: "business" as const,
    label: "Perusahaan",
    description: "Temukan kandidat terbaik",
    icon: BusinessIcon,
    color: "text-emerald-600",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, isLoading } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"worker" | "business">("worker");

  // Read role from query parameter if present (e.g., from registration redirect)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "worker" || roleParam === "business") {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password, role);
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle(role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/10 px-4 py-6 sm:py-8">
      <div className="w-full max-w-md space-y-5 sm:space-y-6 pb-8 sm:pb-0">
        {/* Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("auth.loginTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("auth.welcomeBack")}
          </p>
        </div>

        <Card className="border border-border/60 shadow-sm">
          <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
            {/* Account Type Selector */}
            <div className="mb-5 sm:mb-6">
              <AccountTypeSelector
                value={role}
                onValueChange={setRole}
                options={accountTypeOptions}
                label={t("auth.selectAccountType")}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                required
                autoComplete="current-password"
              />

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={isLoading}
                fullWidth
              >
                {isLoading ? t("auth.loggingIn") : t("auth.login")}
              </Button>
            </form>

            <div className="relative my-6">
              <Separator />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  {t("auth.or")}
                </span>
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              isLoading={isLoading}
              fullWidth
              onClick={handleGoogleSignIn}
              className="hover:bg-muted/50"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
                  fill="#34A853"
                />
                <path
                  d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                  fill="#EA4335"
                />
              </svg>
              {t("auth.continueWithGoogle")}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
          >
            {t("auth.registerHere")}
          </Link>
        </p>
      </div>
    </div>
  );
}

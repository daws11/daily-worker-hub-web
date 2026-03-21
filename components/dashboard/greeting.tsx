"use client";

import { useTranslation } from "@/lib/i18n/hooks";

interface DashboardGreetingProps {
  name: string;
  role: "business" | "worker";
}

export function DashboardGreeting({ name, role }: DashboardGreetingProps) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Selamat Pagi" : hour < 18 ? "Selamat Siang" : "Selamat Malam";
  const emoji = hour < 12 ? "👋" : hour < 18 ? "☀️" : "🌙";
  
  const subtitle =
    role === "business"
      ? t("dashboard.readyToFindWorkers", "Siap mencari pekerja untuk hari ini?")
      : t("dashboard.newJobOpportunities", "Ada peluang kerja baru untuk Anda!");

  const displayName = name || (role === "business" ? "Pengusaha" : "Pekerja");

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">
        {greeting}, {displayName}! {emoji}
      </h1>
      <p className="text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

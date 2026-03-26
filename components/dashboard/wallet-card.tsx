"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  ArrowRight,
  Plus,
} from "lucide-react";

interface WalletData {
  available_balance: number;
  pending_balance: number;
}

interface WalletActionCardProps {
  role: "business" | "worker";
  wallet: WalletData | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function WalletActionCard({ role, wallet }: WalletActionCardProps) {
  const isWorker = role === "worker";
  const walletHref = isWorker ? "/worker/wallet" : "/business/wallet";

  return (
    <div className="animate-slide-up animation-delay-100">
      <Card className={`bg-gradient-to-br ${isWorker ? "from-emerald-500 to-emerald-600" : "from-primary to-primary/80"} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`${isWorker ? "text-emerald-100" : "text-primary-foreground/80"} text-sm font-medium`}>
                {isWorker ? "Saldo Earnings" : "Saldo Wallet"}
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {wallet ? formatCurrency(wallet.available_balance) : "Rp 0"}
              </p>
              {wallet && wallet.pending_balance > 0 && (
                <p className={`text-xs ${isWorker ? "text-emerald-100" : "text-primary-foreground/70"} mt-1`}>
                  +{formatCurrency(wallet.pending_balance)} pending
                </p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            {isWorker ? (
              <>
                <Link href={walletHref} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                    <ArrowRight className="h-4 w-4 mr-1" /> Tarik Dana
                  </Button>
                </Link>
                <Link href={walletHref} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                    Riwayat
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={walletHref} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                    <Plus className="h-4 w-4 mr-1" /> Top Up
                  </Button>
                </Link>
                <Link href={walletHref} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                    Riwayat
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

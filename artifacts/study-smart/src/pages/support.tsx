import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Loader2, ShoppingBag, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: null | { interval: string };
}

interface Product {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: Price[];
}



function formatAmount(unitAmount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(unitAmount / 100);
}


export default function Support() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [claimedPoints, setClaimedPoints] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");

  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "1";
  const isCanceled = params.get("canceled") === "1";
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (isSuccess && sessionId && !claiming && claimedPoints === null) {
      setClaiming(true);
      customFetch<{ success?: boolean; alreadyClaimed?: boolean; alreadyQueued?: boolean }>("/api/stripe/queue-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(() => setClaimedPoints(0))
        .catch(() => setClaimedPoints(0))
        .finally(() => setClaiming(false));
    }
  }, [isSuccess, sessionId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: async () => {
      const json = await customFetch<{ data: Product[] }>("/api/stripe/products");
      return json.data.filter(p => p.prices.length > 0);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (payload: { priceId: string } | { amount: number; description: string }) => {
      if ("priceId" in payload) setLoadingPriceId(payload.priceId);
      const data = await customFetch<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onSettled: () => {
      setLoadingPriceId(null);
    },
  });

  const parsedDonation = parseFloat(donationAmount);
  const donationCents = Math.round(parsedDonation * 100);
  const donationValid = !isNaN(parsedDonation) && donationCents >= 50;

  return (
    <Layout title="Store">
      <div className="max-w-2xl mx-auto space-y-8 pb-12">

        {/* Success banner */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payment successful!</p>
                {claiming && (
                  <p className="text-sm opacity-80 flex items-center gap-1.5 mt-0.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Preparing your reward…
                  </p>
                )}
                {!claiming && claimedPoints !== null && (
                  <p className="text-sm opacity-80 mt-0.5">
                    Check your <span className="font-bold">Inbox</span> to collect your 200 pts reward!
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canceled banner */}
        <AnimatePresence>
          {isCanceled && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-muted border border-border text-muted-foreground"
            >
              <XCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">No worries — your payment was cancelled. Feel free to come back anytime!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mind Forge Store</h2>
            <p className="text-muted-foreground text-sm">Boost your balance or support the team</p>
          </div>
        </motion.div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="text-center py-10 text-muted-foreground">
            <p>Could not load the store. Please try again later.</p>
          </div>
        )}

        {/* Custom Donation */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg">Donate</h3>
            <span className="text-xs text-muted-foreground font-normal ml-1">Enter any amount — earn 200 pts instantly</span>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-50/60 to-amber-50/20 dark:from-amber-900/10 dark:to-transparent p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Choose how much you'd like to contribute. Every donation rewards you with <span className="font-semibold text-amber-600 dark:text-amber-400">200 pts</span>.</p>
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold select-none">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={donationAmount}
                  onChange={e => setDonationAmount(e.target.value)}
                  className={cn(
                    "w-full pl-7 pr-3 py-2.5 rounded-xl border bg-background text-sm font-semibold",
                    "focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60",
                    "border-border transition-colors"
                  )}
                />
              </div>
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:opacity-90 transition-opacity shrink-0 px-6"
                disabled={!donationValid || checkoutMutation.isPending}
                onClick={() =>
                  checkoutMutation.mutate({ amount: donationCents, description: "Mind Forge Donation" })
                }
              >
                {checkoutMutation.isPending && !loadingPriceId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Pay"
                )}
              </Button>
            </div>
            {donationAmount && !donationValid && (
              <p className="text-xs text-destructive">Minimum donation is $0.50</p>
            )}
          </div>
        </motion.section>


        {data && data.length === 0 && !isLoading && (
          <div className="text-center py-10 text-muted-foreground">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Store coming soon</p>
            <p className="text-sm mt-1">Check back shortly!</p>
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground space-y-1 pt-2"
        >
          <p>Payments are processed securely by Stripe.</p>
          <p>All purchases are one-time — no subscriptions or hidden fees.</p>
        </motion.div>
      </div>
    </Layout>
  );
}

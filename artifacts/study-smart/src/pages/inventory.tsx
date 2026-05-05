import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGetPowerups } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";

export default function InventoryPage() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { data, isLoading } = useGetPowerups();

  const inventory = data?.inventory ?? [];
  const balance = data?.balance ?? 0;
  const ownedItems = inventory.filter((p) => p.quantity > 0);
  const emptyItems = inventory.filter((p) => p.quantity === 0);

  return (
    <Layout title={t.nav.inventory}>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary to-accent text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                💰
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{t.shop.yourBalance}</p>
                <p className="text-4xl font-display font-bold">
                  {balance.toLocaleString()} <span className="text-2xl font-normal opacity-80">{t.shop.pts}</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => setLocation("/shop")}
              className="bg-white text-primary hover:bg-white/90 font-bold rounded-2xl px-6 py-3 shadow-lg gap-2 shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              {t.nav.shop}
            </Button>
          </div>
        </div>

        {/* Power-ups Section */}
        <div>
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t.shop.powerups}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {ownedItems.length === 0 && (
                <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border/60 mb-4">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium text-sm">You don't own any power-ups yet.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Head to the shop to pick some up!</p>
                </div>
              )}

              {ownedItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {ownedItems.map((item, i) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-center">
                          <p className="text-xl font-display font-bold leading-none">{item.quantity}</p>
                          <p className="text-[10px] font-medium opacity-70 mt-0.5">{t.shop.inStock}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty items — shown greyed out */}
              {emptyItems.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Not owned</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {emptyItems.map((item) => (
                      <div
                        key={item.key}
                        className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex items-center gap-4 opacity-50"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-2xl shrink-0 grayscale">
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        </div>
                        <div className="shrink-0">
                          <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Go to Shop CTA */}
        <div className="bg-muted/40 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="font-bold text-foreground">Want more power-ups?</p>
              <p className="text-sm text-muted-foreground">Spend your points in the shop.</p>
            </div>
          </div>
          <Button
            onClick={() => setLocation("/shop")}
            className="rounded-2xl px-6 shadow-lg shadow-primary/20 shrink-0"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t.nav.shop}
          </Button>
        </div>

      </div>
    </Layout>
  );
}

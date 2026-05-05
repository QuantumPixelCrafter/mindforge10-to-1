import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetShop, usePurchaseItem, useEquipItem, type ShopItem } from "@workspace/api-client-react";
import { useGetPowerups, usePurchasePowerup, type PowerupDef } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Star, ShoppingBag, Check, Zap, Inbox, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getItemDef } from "@/lib/shop-data";
import { useLanguage } from "@/lib/language-context";

type TabKey = "background" | "frame" | "nametag" | "powerups";

function BackgroundPreview({ colors, size = "lg" }: { colors?: string[]; size?: "lg" | "sm" }) {
  if (!colors || colors.length === 0) return <div className={cn("rounded-xl bg-muted", size === "lg" ? "h-20 w-full" : "h-10 w-16 rounded-lg")} />;
  const gradient = `linear-gradient(135deg, ${colors.join(", ")})`;
  return <div className={cn("rounded-xl", size === "lg" ? "h-20 w-full" : "h-10 w-16 rounded-lg")} style={{ background: gradient }} />;
}

function FramePreview({ colors, size = "lg" }: { colors?: string[]; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  if (!colors || colors.length < 2) {
    const c = colors?.[0] ?? "#94A3B8";
    return <div className={cn("rounded-full border-4 bg-gradient-to-br from-muted to-muted/60 mx-auto", dim)} style={{ borderColor: c }} />;
  }
  const gradient = `linear-gradient(135deg, ${colors.join(", ")})`;
  return (
    <div className={cn("rounded-full p-[3px] mx-auto", dim)} style={{ background: gradient }}>
      <div className="w-full h-full rounded-full bg-card" />
    </div>
  );
}

function NametagPreview({ item }: { item: ShopItem }) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20">
      <span className="text-lg">{item.emoji}</span>
      <span className="text-xs font-bold">{item.name}</span>
    </div>
  );
}

function PowerupCard({ item, balance, onBuy, isPending }: {
  item: PowerupDef;
  balance: number;
  onBuy: (type: string) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const canAfford = balance >= item.price;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 flex items-center justify-center text-3xl shrink-0 shadow-sm">
          {item.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="font-bold text-sm">{item.name}</p>
            {item.quantity > 0 && (
              <div className="bg-primary text-primary-foreground text-xs font-black px-2 py-0.5 rounded-full">
                ×{item.quantity}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70 italic leading-snug border-t border-border/30 pt-3">
        {item.longDescription}
      </p>

      {item.purchasable ? (
        <Button
          size="sm"
          className={cn("w-full rounded-xl", !canAfford && "opacity-70")}
          variant={canAfford ? "default" : "outline"}
          onClick={() => onBuy(item.key)}
          disabled={isPending || !canAfford}
        >
          {!canAfford ? (
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              {t.shop.needMorePts.replace("{n}", (item.price - balance).toLocaleString())}
            </span>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              {t.shop.buyPts.replace("{n}", item.price.toLocaleString())}
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/40 border border-border/30">
          <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">{t.shop.collectFree}</span>
        </div>
      )}
    </motion.div>
  );
}

export default function ShopPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: shop, isLoading: shopLoading } = useGetShop();
  const { data: powerupsData, isLoading: powerupsLoading } = useGetPowerups();
  const purchaseMut = usePurchaseItem();
  const equipMut = useEquipItem();
  const purchasePowerupMut = usePurchasePowerup();
  const [activeTab, setActiveTab] = useState<TabKey>("background");

  const TYPE_TABS = [
    { key: "background" as const, label: t.shop.backgrounds, emoji: "🖼️", desc: t.shop.backgroundsDesc },
    { key: "frame" as const,      label: t.shop.frames,       emoji: "⭕", desc: t.shop.framesDesc },
    { key: "nametag" as const,    label: t.shop.nametags,     emoji: "🏷️", desc: t.shop.nametagsDesc },
    { key: "powerups" as const,   label: t.shop.powerups,     emoji: "⚡", desc: t.shop.powerupsDesc },
  ];

  const balance = activeTab === "powerups"
    ? (powerupsData?.balance ?? 0)
    : (shop?.balance ?? 0);

  const items = activeTab !== "powerups"
    ? (shop?.items ?? []).filter((i: ShopItem) => i.type === activeTab)
    : [];

  const activeTabMeta = TYPE_TABS.find(t => t.key === activeTab)!;
  const isLoading = activeTab === "powerups" ? powerupsLoading : shopLoading;

  const handlePurchase = (item: ShopItem) => {
    purchaseMut.mutate(item.key, {
      onSuccess: (r) => toast({ title: `Bought "${item.name}"! 🎉`, description: `New balance: ${r.newBalance} pts` }),
      onError: (e: unknown) => toast({ title: "Purchase failed", description: (e as { message?: string })?.message, variant: "destructive" }),
    });
  };

  const handleEquip = (item: ShopItem) => {
    equipMut.mutate({ itemKey: item.equipped ? "" : item.key, slot: item.type }, {
      onSuccess: () => toast({ title: item.equipped ? `Unequipped "${item.name}"` : `Equipped "${item.name}"! ✨` }),
    });
  };

  const handleBuyPowerup = (type: string) => {
    const def = powerupsData?.inventory.find(p => p.key === type);
    purchasePowerupMut.mutate(type, {
      onSuccess: (r) => toast({ title: `Bought ${def?.name ?? "Power-up"}! ${def?.emoji ?? "⚡"}`, description: `New balance: ${r.newBalance} pts` }),
      onError: (e: unknown) => toast({ title: "Purchase failed", description: (e as { message?: string })?.message, variant: "destructive" }),
    });
  };

  return (
    <Layout title={t.nav.shop}>
      <div className="space-y-6 pb-12">

        {/* Balance Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-yellow-400 rounded-3xl p-6 text-white shadow-xl shadow-amber-500/25"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">{t.shop.yourBalance}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black">{balance.toLocaleString()}</p>
                <p className="text-lg font-bold text-white/80">{t.shop.pts}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner mb-1">
                {activeTab === "powerups" ? "⚡" : "🛍️"}
              </div>
              {activeTab !== "powerups" && (
                <p className="text-white/70 text-xs">
                  {(shop?.items ?? []).filter((i: ShopItem) => i.owned).length} / {(shop?.items ?? []).length} {t.shop.owned}
                </p>
              )}
              {activeTab === "powerups" && (
                <p className="text-white/70 text-xs">
                  {(powerupsData?.inventory ?? []).reduce((s, p) => s + p.quantity, 0)} {t.shop.inStock}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Equipped Cosmetics Preview — only for cosmetics tabs */}
        {activeTab !== "powerups" && shop?.equipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-4"
          >
            <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">{t.shop.currentlyEquipped}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["background", "frame", "nametag"] as const).map(slot => {
                const key = (shop.equipped as Record<string, string | null>)[slot];
                const item = shop.items.find((i: ShopItem) => i.key === key);
                return (
                  <div key={slot} className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{slot}</p>
                    {item ? (
                      <div className="flex flex-col items-center gap-1">
                        {slot === "background" && <BackgroundPreview colors={item.colors} size="sm" />}
                        {slot === "frame" && <FramePreview colors={item.colors} size="sm" />}
                        {slot === "nametag" && <span className="text-xl">{item.emoji}</span>}
                        <p className="text-[10px] font-medium text-muted-foreground truncate w-full">{item.name}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/40 italic pt-1">{t.shop.none}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Power-ups inventory summary */}
        {activeTab === "powerups" && (powerupsData?.inventory ?? []).some(p => p.quantity > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-4"
          >
            <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">{t.shop.yourInventory}</p>
            <div className="flex flex-wrap gap-2">
              {(powerupsData?.inventory ?? []).filter(p => p.quantity > 0).map(p => (
                <div key={p.key} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
                  <span className="text-base">{p.emoji}</span>
                  <span className="text-xs font-bold">{p.name}</span>
                  <span className="text-xs font-black text-primary">×{p.quantity}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:border-border hover:bg-muted"
              )}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Section description */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-lg">{activeTabMeta.emoji}</span>
          <span>{activeTabMeta.desc}</span>
          {activeTab !== "powerups" && (
            <span className="ml-auto text-xs font-medium">{items.filter((i: ShopItem) => i.owned).length}/{items.length} {t.shop.owned}</span>
          )}
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: activeTab === "powerups" ? 4 : 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : activeTab === "powerups" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="powerups"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid gap-4 grid-cols-1 sm:grid-cols-2"
            >
              {(powerupsData?.inventory ?? []).map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <PowerupCard
                    item={item}
                    balance={balance}
                    onBuy={handleBuyPowerup}
                    isPending={purchasePowerupMut.isPending}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid gap-4 grid-cols-1 sm:grid-cols-2"
            >
              {items.map((item: ShopItem, i: number) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "bg-card border rounded-2xl p-4 space-y-3 transition-all hover:shadow-md",
                    item.equipped
                      ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border/50"
                  )}
                >
                  {/* Preview */}
                  <div className="relative">
                    {item.type === "background" && <BackgroundPreview colors={item.colors} />}
                    {item.type === "frame" && (
                      <div className="flex justify-center py-3">
                        <FramePreview colors={item.colors} />
                      </div>
                    )}
                    {item.type === "nametag" && (
                      <div className="flex justify-center py-3">
                        <NametagPreview item={item} />
                      </div>
                    )}
                    {item.equipped && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> {t.shop.equipped}
                      </div>
                    )}
                    {item.owned && !item.equipped && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {t.shop.ownedInventory}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <div className={cn("shrink-0 flex items-center gap-1 font-black text-sm", item.price === 0 ? "text-emerald-500" : "text-amber-500")}>
                        {item.price === 0 ? t.shop.free : (<><Star className="w-3.5 h-3.5 fill-amber-500" />{item.price.toLocaleString()}</>)}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
                  </div>

                  {/* Action */}
                  {item.owned ? (
                    <Button
                      size="sm"
                      variant={item.equipped ? "outline" : "default"}
                      className="w-full rounded-xl"
                      onClick={() => handleEquip(item)}
                      disabled={equipMut.isPending}
                    >
                      {item.equipped ? t.shop.unequip : (
                        <><Zap className="w-3.5 h-3.5 mr-1.5" /> {t.shop.equip}</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={cn("w-full rounded-xl", balance < item.price && "opacity-70")}
                      onClick={() => handlePurchase(item)}
                      disabled={purchaseMut.isPending || balance < item.price}
                      variant={balance < item.price ? "outline" : "default"}
                    >
                      {balance < item.price ? (
                        <span className="text-muted-foreground text-xs">
                          {t.shop.needMorePts.replace("{n}", (item.price - balance).toLocaleString())}
                        </span>
                      ) : item.price === 0 ? (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                          {t.shop.claimFree}
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                          {t.shop.buyPts.replace("{n}", item.price.toLocaleString())}
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Layout>
  );
}

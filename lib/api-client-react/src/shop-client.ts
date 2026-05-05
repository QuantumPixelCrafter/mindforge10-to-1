import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ShopItem {
  key: string;
  name: string;
  type: "background" | "frame" | "nametag";
  price: number;
  description: string;
  colors?: string[];
  emoji?: string;
  owned: boolean;
  equipped: boolean;
}

export interface ShopResponse {
  items: ShopItem[];
  balance: number;
  equipped: { background: string | null; frame: string | null; nametag: string | null };
}

export const getShopQueryKey = () => ["shop"] as const;

export function useGetShop() {
  return useQuery({
    queryKey: getShopQueryKey(),
    queryFn: () => customFetch<ShopResponse>("/api/shop/items"),
  });
}

export function usePurchaseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemKey: string) =>
      customFetch<{ success: boolean; newBalance: number }>("/api/shop/purchase", {
        method: "POST",
        body: JSON.stringify({ itemKey }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getShopQueryKey() }),
  });
}

export function useEquipItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemKey, slot }: { itemKey: string; slot?: string }) =>
      customFetch<{ success: boolean; equipped: Record<string, string | null> }>("/api/shop/equip", {
        method: "POST",
        body: JSON.stringify({ itemKey, slot }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getShopQueryKey() }),
  });
}

export function useUploadProfilePicture() {
  return useMutation({
    mutationFn: (imageData: string) =>
      customFetch<{ user: unknown }>("/api/auth/profile-picture", {
        method: "PUT",
        body: JSON.stringify({ imageData }),
      }),
  });
}

export function useUpdateName() {
  return useMutation({
    mutationFn: ({ firstName, lastName }: { firstName: string; lastName?: string }) =>
      customFetch<{ user: unknown }>("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ firstName, lastName }),
      }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      customFetch<{ success: boolean }>("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  });
}

export function useUpdatePreferences() {
  return useMutation({
    mutationFn: (prefs: { isPublic?: boolean; showNameOnLeaderboard?: boolean; showNameInSearch?: boolean; allowProfileView?: boolean; chatPointWarningThreshold?: number | null; preferredLanguage?: string; goalReminderDays?: number | null; receiveStrangerMessages?: boolean }) =>
      customFetch<{ user: unknown }>("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(prefs),
      }),
  });
}

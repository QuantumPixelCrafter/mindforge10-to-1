import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface PowerupDef {
  key: string;
  name: string;
  emoji: string;
  description: string;
  longDescription: string;
  price: number;
  purchasable: boolean;
  quantity: number;
}

export interface PowerupsResponse {
  inventory: PowerupDef[];
  balance: number;
}

export const getPowerupsQueryKey = () => ["powerups"] as const;

export function useGetPowerups() {
  return useQuery({
    queryKey: getPowerupsQueryKey(),
    queryFn: () => customFetch<PowerupsResponse>("/api/powerups"),
  });
}

export function usePurchasePowerup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: string) =>
      customFetch<{ success: boolean; newBalance: number }>("/api/powerups/purchase", {
        method: "POST",
        body: JSON.stringify({ type }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getPowerupsQueryKey() });
      qc.invalidateQueries({ queryKey: ["shop"] });
    },
  });
}

export function useUsePowerup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: string) =>
      customFetch<{ success: boolean; remaining: number }>("/api/powerups/use", {
        method: "POST",
        body: JSON.stringify({ type }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getPowerupsQueryKey() }),
  });
}

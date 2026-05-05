import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface MathBlitzEntry {
  rank: number;
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
  equippedNametag: string | null;
  gameLevel: number;
  score: number;
}

export interface MathBlitzLeaderboard {
  easy: MathBlitzEntry[];
  normal: MathBlitzEntry[];
  hard: MathBlitzEntry[];
}

export function useMathBlitzLeaderboard(enabled = true) {
  return useQuery<MathBlitzLeaderboard>({
    queryKey: ["math-blitz-leaderboard"],
    queryFn: () => customFetch<MathBlitzLeaderboard>("/math-blitz/leaderboard"),
    enabled,
    staleTime: 30_000,
  });
}

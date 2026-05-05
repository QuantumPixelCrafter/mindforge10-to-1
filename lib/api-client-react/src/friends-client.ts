import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// --- Types ---

export interface FriendUser {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  level: string | null;
  gameLevel: number;
  xp: number;
  equippedNametag: string | null;
  equippedBackground?: string | null;
  equippedFrame?: string | null;
  friendshipId?: number | null;
  friendshipStatus?: string | null;
  iAmRequester?: boolean;
}

export interface FriendEntry {
  friendshipId: number;
  status: string;
  iAmRequester: boolean;
  user: FriendUser | null;
}

export interface ChatMessage {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl?: string | null;
  createdAt: string;
  readAt: string | null;
  deletedForSender: boolean;
  deletedForReceiver: boolean;
  deletedForEveryone: boolean;
  editedAt: string | null;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  xpInLevel: number;
  xpNeeded: number;
  progress: number;
}

export interface PublicUserProfile {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  profileImageUrl: string | null;
  isPublic: boolean;
  level: string | null;
  gameLevel: number;
  xp: number;
  levelProgress: LevelProgress;
  equippedBackground: string | null;
  equippedFrame: string | null;
  equippedNametag: string | null;
  country: string | null;
  gradeIndex: number | null;
  createdAt: string;
  achievements: {
    earned: number;
    total: number;
    totalPoints: number;
    list: Array<{ key: string; title: string; description: string; icon: string; points: number; earned: boolean }>;
  };
  scores: { memory: number | null; bubble: number | null; quiz: number | null };
  friendCount: number;
  friendship: { id: number; status: string; iAmRequester: boolean } | null;
}

export interface LevelBoardEntry {
  rank: number;
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
  level: string | null;
  gameLevel: number;
  xp: number;
  equippedNametag: string | null;
  levelProgress: LevelProgress;
}

// --- Query keys ---
export const getFriendsQueryKey = () => ["friends"] as const;
export const getChatQueryKey = (userId: string) => ["chat", userId] as const;
export const getUserProfileQueryKey = (userId: string) => ["user-profile", userId] as const;

// --- Hooks ---

export function useGetFriends() {
  return useQuery({
    queryKey: getFriendsQueryKey(),
    queryFn: () => customFetch<FriendEntry[]>("/api/friends"),
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ["users-search", q],
    queryFn: () => customFetch<FriendUser[]>(`/api/friends/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: string) =>
      customFetch<unknown>("/api/friends/request", { method: "POST", body: JSON.stringify({ addresseeId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getFriendsQueryKey() }),
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<unknown>(`/api/friends/${id}/accept`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getFriendsQueryKey() }),
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<unknown>(`/api/friends/${id}/decline`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getFriendsQueryKey() }),
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<unknown>(`/api/friends/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: getFriendsQueryKey() }),
  });
}

export function useGetChat(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: getChatQueryKey(userId),
    queryFn: () => customFetch<ChatMessage[]>(`/api/chat/${userId}`),
    enabled: enabled && !!userId,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, content, mediaUrl }: { userId: string; content: string; mediaUrl?: string | null }) =>
      customFetch<ChatMessage & { balanceAfter?: number }>(`/api/chat/${userId}`, { method: "POST", body: JSON.stringify({ content, mediaUrl }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getChatQueryKey(vars.userId) });
      qc.invalidateQueries({ queryKey: ["chat-balance"] });
    },
  });
}

export interface UnreadChatMessage {
  id: number;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  createdAt: string;
  senderUsername: string | null;
  senderFirstName: string | null;
  senderLastName: string | null;
}

export function useUnreadChatMessages(enabled: boolean) {
  return useQuery({
    queryKey: ["chat-unread-messages"],
    queryFn: () => customFetch<{ messages: UnreadChatMessage[]; count: number }>("/api/chat/unread/messages"),
    enabled,
    refetchInterval: 30000,
  });
}

export function useGetChatBalance(enabled: boolean) {
  return useQuery({
    queryKey: ["chat-balance"],
    queryFn: () => customFetch<{ balance: number; threshold: number | null; messageCost: number }>("/api/chat/balance"),
    enabled,
    refetchInterval: 5000,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      customFetch<{ success: boolean }>(`/api/users/${userId}/block`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getFriendsQueryKey() });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      customFetch<{ success: boolean }>(`/api/users/${userId}/block`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getFriendsQueryKey() });
    },
  });
}

export function useDeleteMessageForMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ msgId, chatUserId }: { msgId: number; chatUserId: string }) =>
      customFetch<{ success: boolean }>(`/api/chat/message/${msgId}`, { method: "DELETE" }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getChatQueryKey(vars.chatUserId) });
    },
  });
}

export function useDeleteMessageForEveryone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ msgId, chatUserId }: { msgId: number; chatUserId: string }) =>
      customFetch<{ success: boolean }>(`/api/chat/message/${msgId}/everyone`, { method: "DELETE" }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getChatQueryKey(vars.chatUserId) });
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ msgId, content, chatUserId }: { msgId: number; content: string; chatUserId: string }) =>
      customFetch<{ id: number; content: string; editedAt: string }>(`/api/chat/message/${msgId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: getChatQueryKey(vars.chatUserId) });
    },
  });
}

export function useGetUserProfile(userId: string) {
  return useQuery({
    queryKey: getUserProfileQueryKey(userId),
    queryFn: () => customFetch<PublicUserProfile>(`/api/users/${userId}`),
    enabled: !!userId,
  });
}

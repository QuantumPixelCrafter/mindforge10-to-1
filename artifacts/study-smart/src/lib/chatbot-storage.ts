export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type ChatMode = "casual" | "educational";

export type Conversation = {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const KEY_PREFIX = "mf_sage_convos_";
const MODE_KEY_PREFIX = "mf_sage_mode_";
const ACTIVE_KEY_PREFIX = "mf_sage_active_";
const ACTIVE_CASUAL_PREFIX = "mf_sage_active_casual_";
const ACTIVE_EDU_PREFIX = "mf_sage_active_edu_";
const POS_KEY = "mf_sage_floating_pos";

function key(userId: string) { return `${KEY_PREFIX}${userId}`; }
function modeKey(userId: string) { return `${MODE_KEY_PREFIX}${userId}`; }
function activeKey(userId: string) { return `${ACTIVE_KEY_PREFIX}${userId}`; }
function activeModeKey(userId: string, mode: ChatMode) {
  return mode === "educational" ? `${ACTIVE_EDU_PREFIX}${userId}` : `${ACTIVE_CASUAL_PREFIX}${userId}`;
}

export function loadConversations(userId: string): Conversation[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as Conversation[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveConversations(userId: string, convos: Conversation[]) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(key(userId), JSON.stringify(convos));
  } catch {}
}

export function loadMode(userId: string): ChatMode {
  if (!userId || typeof window === "undefined") return "casual";
  try {
    const v = localStorage.getItem(modeKey(userId));
    return v === "educational" ? "educational" : "casual";
  } catch { return "casual"; }
}

export function saveMode(userId: string, mode: ChatMode) {
  if (!userId || typeof window === "undefined") return;
  try { localStorage.setItem(modeKey(userId), mode); } catch {}
}

export function loadActiveId(userId: string): string | null {
  if (!userId || typeof window === "undefined") return null;
  try { return localStorage.getItem(activeKey(userId)); } catch { return null; }
}

export function saveActiveId(userId: string, id: string | null) {
  if (!userId || typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(activeKey(userId), id);
    else localStorage.removeItem(activeKey(userId));
  } catch {}
}

export function loadActiveIdForMode(userId: string, mode: ChatMode): string | null {
  if (!userId || typeof window === "undefined") return null;
  try { return localStorage.getItem(activeModeKey(userId, mode)); } catch { return null; }
}

export function saveActiveIdForMode(userId: string, mode: ChatMode, id: string | null) {
  if (!userId || typeof window === "undefined") return;
  try {
    const k = activeModeKey(userId, mode);
    if (id) localStorage.setItem(k, id);
    else localStorage.removeItem(k);
  } catch {}
}

export function clearAllForUser(userId: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(userId));
    localStorage.removeItem(modeKey(userId));
    localStorage.removeItem(activeKey(userId));
    localStorage.removeItem(activeModeKey(userId, "casual"));
    localStorage.removeItem(activeModeKey(userId, "educational"));
  } catch {}
}

export function clearAllSageData() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith(KEY_PREFIX) || k.startsWith(MODE_KEY_PREFIX) ||
        k.startsWith(ACTIVE_KEY_PREFIX) || k.startsWith(ACTIVE_CASUAL_PREFIX) ||
        k.startsWith(ACTIVE_EDU_PREFIX)
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function loadFloatingPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return p;
  } catch {}
  return null;
}

export function saveFloatingPos(pos: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {}
}

export function newConversation(mode: ChatMode): Conversation {
  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: "New chat",
    mode,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function summariseTitle(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 40) return trimmed || "New chat";
  return trimmed.slice(0, 40) + "…";
}

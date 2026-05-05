import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { loadFloatingPos, saveFloatingPos } from "@/lib/chatbot-storage";

const HIDDEN_PREFIXES = ["/quiz", "/games", "/math-blitz"];
const SIZE = 56;
const PREF_KEY = "mf_show_floating_sage";

export function FloatingChatbot() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PREF_KEY) === "1";
  });

  // listen for preference changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREF_KEY) setEnabled(e.newValue === "1");
    };
    const onCustom = () => setEnabled(localStorage.getItem(PREF_KEY) === "1");
    window.addEventListener("storage", onStorage);
    window.addEventListener("mf-floating-sage-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mf-floating-sage-changed", onCustom);
    };
  }, []);

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = loadFloatingPos();
    if (saved) return saved;
    if (typeof window === "undefined") return { x: 20, y: 100 };
    return { x: window.innerWidth - SIZE - 20, y: window.innerHeight - SIZE - 120 };
  });

  const dragInfo = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean; dragging: boolean }>({
    startX: 0, startY: 0, origX: 0, origY: 0, moved: false, dragging: false,
  });

  const clamp = useCallback((p: { x: number; y: number }) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      x: Math.max(8, Math.min(w - SIZE - 8, p.x)),
      y: Math.max(8, Math.min(h - SIZE - 8, p.y)),
    };
  }, []);

  // keep on screen on resize
  useEffect(() => {
    const onResize = () => setPos(p => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragInfo.current = {
      startX: e.clientX, startY: e.clientY,
      origX: pos.x, origY: pos.y,
      moved: false, dragging: true,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragInfo.current.dragging) return;
    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragInfo.current.moved = true;
    setPos(clamp({ x: dragInfo.current.origX + dx, y: dragInfo.current.origY + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragInfo.current.dragging) return;
    dragInfo.current.dragging = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
    saveFloatingPos(pos);
    if (!dragInfo.current.moved) {
      setLocation("/chatbot");
    }
  };

  if (!enabled || !isAuthenticated) return null;
  if (HIDDEN_PREFIXES.some(p => location === p || location.startsWith(p + "/"))) return null;
  if (location === "/chatbot") return null;

  return (
    <button
      data-testid="floating-sage-button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: SIZE,
        height: SIZE,
        zIndex: 60,
        touchAction: "none",
      }}
      className="rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-2 border-white/30"
      aria-label="Open Sage chatbot"
    >
      <Sparkles className="w-6 h-6" />
    </button>
  );
}

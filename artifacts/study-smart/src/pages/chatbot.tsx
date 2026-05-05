import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@workspace/replit-auth-web";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Menu, Plus, Send, Sparkles, Trash2, MessageCircle, GraduationCap, Smile, X, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  type Conversation, type ChatMessage, type ChatMode,
  loadConversations, saveConversations, loadMode, saveMode,
  loadActiveIdForMode, saveActiveIdForMode, newConversation,
} from "@/lib/chatbot-storage";

const BOT_NAME = "Sage";

function preprocessMath(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_: string, m: string) => `$$${m}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_: string, m: string) => `$${m}$`);
}

export default function Chatbot() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>("casual");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage once user is available
  useEffect(() => {
    if (!userId) return;
    const loaded = loadConversations(userId);
    const savedMode = loadMode(userId);
    setMode(savedMode);

    const modeConvos = loaded.filter(c => c.mode === savedMode);
    if (modeConvos.length === 0) {
      const fresh = newConversation(savedMode);
      const all = [...loaded, fresh];
      setConvos(all);
      setActiveId(fresh.id);
      saveConversations(userId, all);
      saveActiveIdForMode(userId, savedMode, fresh.id);
    } else {
      setConvos(loaded);
      const savedActive = loadActiveIdForMode(userId, savedMode);
      const id = savedActive && modeConvos.find(c => c.id === savedActive) ? savedActive : modeConvos[0].id;
      setActiveId(id);
      saveActiveIdForMode(userId, savedMode, id);
    }
    setHydrated(true);
  }, [userId]);

  const active = useMemo(() => convos.find(c => c.id === activeId) ?? null, [convos, activeId]);

  // Scroll to bottom on message change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active?.messages.length, sending]);

  const persist = useCallback((next: Conversation[]) => {
    setConvos(next);
    if (userId) saveConversations(userId, next);
  }, [userId]);

  const handleNewChat = useCallback(() => {
    const fresh = newConversation(mode);
    const next = [fresh, ...convos];
    persist(next);
    setActiveId(fresh.id);
    if (userId) saveActiveIdForMode(userId, mode, fresh.id);
    setDrawerOpen(false);
    setInput("");
  }, [mode, convos, persist, userId]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    if (userId) saveActiveIdForMode(userId, mode, id);
    setDrawerOpen(false);
  }, [userId, mode]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = convos.filter(c => c.id !== id);
    const modeConvos = next.filter(c => c.mode === mode);
    if (modeConvos.length === 0) {
      const fresh = newConversation(mode);
      const withFresh = [fresh, ...next];
      persist(withFresh);
      setActiveId(fresh.id);
      if (userId) saveActiveIdForMode(userId, mode, fresh.id);
    } else {
      persist(next);
      if (id === activeId) {
        const newActive = modeConvos[0].id;
        setActiveId(newActive);
        if (userId) saveActiveIdForMode(userId, mode, newActive);
      }
    }
  }, [convos, activeId, mode, persist, userId]);

  const handleModeChange = useCallback((m: ChatMode) => {
    if (userId && activeId) saveActiveIdForMode(userId, mode, activeId);
    setMode(m);
    if (userId) saveMode(userId, m);
    const modeConvos = convos.filter(c => c.mode === m);
    if (modeConvos.length === 0) {
      const fresh = newConversation(m);
      const next = [fresh, ...convos];
      persist(next);
      setActiveId(fresh.id);
      if (userId) saveActiveIdForMode(userId, m, fresh.id);
    } else {
      const savedActive = userId ? loadActiveIdForMode(userId, m) : null;
      const id = savedActive && modeConvos.find(c => c.id === savedActive) ? savedActive : modeConvos[0].id;
      setActiveId(id);
      if (userId) saveActiveIdForMode(userId, m, id);
    }
  }, [userId, mode, activeId, convos, persist]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !active) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now().toString(36)}`,
      role: "user",
      content: text,
      ts: Date.now(),
    };

    const isFirstMessage = active.messages.length === 0;
    const updatedConvo: Conversation = {
      ...active,
      messages: [...active.messages, userMsg],
      title: isFirstMessage ? "New chat" : active.title,
      mode,
      updatedAt: Date.now(),
    };
    const nextConvos = convos.map(c => c.id === active.id ? updatedConvo : c);
    persist(nextConvos);
    setInput("");
    setSending(true);

    try {
      const data = await customFetch<{ reply: string; botName: string }>("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: updatedConvo.messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const reply = data.reply ?? "…";

      const botMsg: ChatMessage = {
        id: `m_${Date.now().toString(36)}_b`,
        role: "assistant",
        content: reply,
        ts: Date.now(),
      };
      const finalConvo: Conversation = {
        ...updatedConvo,
        messages: [...updatedConvo.messages, botMsg],
        updatedAt: Date.now(),
      };
      persist(convos.map(c => c.id === active.id ? finalConvo : nextConvos.find(x => x.id === c.id) ?? c).map(c => c.id === active.id ? finalConvo : c));

      if (isFirstMessage) {
        customFetch<{ title: string }>("/api/chatbot/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: text, botReply: reply }),
        }).then(({ title }) => {
          setConvos(prev => {
            const updated = prev.map(c => c.id === active.id ? { ...c, title } : c);
            if (userId) saveConversations(userId, updated);
            return updated;
          });
        }).catch(() => {});
      }
    } catch (err: any) {
      const serverMsg = err?.data?.error ?? err?.message ?? null;
      const errMsg: ChatMessage = {
        id: `m_${Date.now().toString(36)}_e`,
        role: "assistant",
        content: serverMsg ?? "I couldn't reach the server. Please try again.",
        ts: Date.now(),
      };
      const finalConvo = { ...updatedConvo, messages: [...updatedConvo.messages, errMsg], updatedAt: Date.now() };
      persist(nextConvos.map(c => c.id === active.id ? finalConvo : c));
    } finally {
      setSending(false);
    }
  }, [input, sending, active, mode, convos, persist]);

  if (!hydrated) {
    return (
      <Layout title={BOT_NAME}>
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading {BOT_NAME}…</div>
      </Layout>
    );
  }

  const modeAccent = mode === "educational" ? "from-indigo-500 to-blue-500" : "from-pink-500 to-orange-400";

  return (
    <Layout title={BOT_NAME}>
      <div className="relative max-w-3xl mx-auto h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-sage-menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", modeAccent)}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">{BOT_NAME}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{mode === "educational" ? "Study Tutor mode" : "Chill Chat mode"}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={handleNewChat}
            data-testid="button-new-chat"
            aria-label="New chat"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-2xl border border-border/50 bg-card/40 p-4 space-y-4"
        >
          {active && active.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-10">
              <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl", modeAccent)}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-lg">Hi, I'm {BOT_NAME}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {mode === "educational"
                  ? "Ask me an academic question — I'll walk you through it step-by-step."
                  : "Tell me anything that's on your mind — I'm here to chat."}
              </p>
            </div>
          )}

          {active?.messages.map(m => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 mt-0.5", modeAccent)}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm break-words",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
                      code: ({ inline, children }: any) => inline
                        ? <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-xs">{children}</code>
                        : <code className="block bg-black/10 dark:bg-white/10 rounded-lg p-3 font-mono text-xs overflow-x-auto whitespace-pre my-2">{children}</code>,
                      pre: ({ children }) => <>{children}</>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground my-2">{children}</blockquote>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">{children}</a>,
                    }}
                  >
                    {preprocessMath(m.content)}
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-2 justify-start">
              <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 mt-0.5", modeAccent)}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={mode === "educational" ? "Ask an academic question…" : `Chat with ${BOT_NAME}…`}
            rows={1}
            data-testid="input-sage-message"
            className="flex-1 resize-none px-4 py-3 rounded-2xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="rounded-2xl h-12 w-12 p-0 shrink-0"
            data-testid="button-send-message"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDrawerOpen(false)}
            data-testid="overlay-sage-drawer"
          />
          <aside className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-card border-r border-border z-50 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">{BOT_NAME}</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted"
                data-testid="button-close-drawer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 border-b border-border/60">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleModeChange("casual")}
                  data-testid="button-mode-casual"
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                    mode === "casual"
                      ? "border-pink-500 bg-pink-500/10"
                      : "border-border hover:border-pink-400/40"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shrink-0">
                    <Smile className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Chill Chat</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">Friendly, easy-going talks about anything on your mind.</p>
                  </div>
                </button>

                <button
                  onClick={() => handleModeChange("educational")}
                  data-testid="button-mode-educational"
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                    mode === "educational"
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-border hover:border-indigo-400/40"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Study Tutor</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">Solves academic problems only, in a precise professional tone.</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversations</p>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleNewChat} data-testid="button-new-chat-drawer">
                <Plus className="w-3 h-3" /> New
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
              {convos.filter(c => c.mode === mode).length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-2">No conversations yet.</p>
              )}
              {convos.filter(c => c.mode === mode).map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  data-testid={`row-conversation-${c.id}`}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-colors",
                    c.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  )}
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{c.mode === "educational" ? "Study Tutor" : "Chill Chat"}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
                    aria-label="Delete"
                    data-testid={`button-delete-${c.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-border/60 text-[10px] text-muted-foreground text-center">
              Conversations clear when you log out.
            </div>
          </aside>
        </>
      )}
    </Layout>
  );
}

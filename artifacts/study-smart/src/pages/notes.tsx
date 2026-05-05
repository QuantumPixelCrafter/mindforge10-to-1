import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useSubjectsData, useCreateSubjectAction, useDeleteSubjectAction } from "@/hooks/use-subjects";
import { useNotesData, useCreateNoteAction, useUpdateNoteAction, useDeleteNoteAction, useCommunityNotesData, usePublishNoteAction, useUnpublishNoteAction } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FolderPlus, Plus, Search, Trash2, Edit3, MoreVertical, Sparkles, Folder, AlertCircle, Maximize2, Minimize2, X, Save, Bold, Italic, Underline, List, Globe2, EyeOff, Clock, CheckCircle2, Users, Share2 } from "lucide-react";
import { QuizModal } from "@/components/quiz-modal";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

const SUBJECT_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E', '#EAB308'];

const HIGHLIGHT_COLORS = [
  { hex: "rgba(250,204,21,0.55)",  label: "Yellow" },
  { hex: "rgba(34,197,94,0.45)",   label: "Green"  },
  { hex: "rgba(96,165,250,0.55)",  label: "Blue"   },
  { hex: "rgba(236,72,153,0.45)",  label: "Pink"   },
  { hex: "rgba(249,115,22,0.5)",   label: "Orange" },
];

const HIGHLIGHT_SWATCHES = ["#FACC15", "#22C55E", "#60A5FA", "#EC4899", "#F97316"];

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const FORMAT_BUTTONS: { cmd: string; icon: React.ReactNode; title: string }[] = [
  { cmd: "bold",      icon: <Bold className="w-3.5 h-3.5" />,      title: "Bold" },
  { cmd: "italic",    icon: <Italic className="w-3.5 h-3.5" />,    title: "Italic" },
  { cmd: "underline", icon: <Underline className="w-3.5 h-3.5" />, title: "Underline" },
  { cmd: "insertUnorderedList", icon: <List className="w-3.5 h-3.5" />, title: "Bullet list" },
];

interface FormatToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onContentChange: (html: string) => void;
  compact?: boolean;
}

function FormatToolbar({ editorRef, onContentChange, compact }: FormatToolbarProps) {
  const exec = (cmd: string, value?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value);
    onContentChange(el.innerHTML);
  };

  return (
    <div className={`flex items-center gap-0.5 flex-wrap ${compact ? "" : "bg-muted/40 border border-border/50 rounded-xl px-1.5 py-1"}`}>
      {FORMAT_BUTTONS.map(({ cmd, icon, title }) => (
        <button
          key={cmd}
          type="button"
          title={title}
          onMouseDown={e => { e.preventDefault(); exec(cmd); }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {icon}
        </button>
      ))}

      <span className="w-px h-4 bg-border/60 mx-1" />

      {HIGHLIGHT_COLORS.map(({ hex, label }, i) => (
        <button
          key={label}
          type="button"
          title={`Highlight: ${label}`}
          onMouseDown={e => { e.preventDefault(); exec("hiliteColor", hex); }}
          className="w-5 h-5 rounded-full border-2 border-transparent hover:border-foreground/30 transition-all hover:scale-110"
          style={{ backgroundColor: HIGHLIGHT_SWATCHES[i] }}
        />
      ))}
    </div>
  );
}

export default function NotesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isPublicAccount = (user as any)?.isPublic === true;

  const { data: subjects = [], isLoading: loadingSubjects } = useSubjectsData();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [notesTab, setNotesTab] = useState<"my" | "community">("my");

  const { data: notes = [], isLoading: loadingNotes } = useNotesData(selectedSubjectId ?? undefined);
  const { data: communityNotes = [], isLoading: loadingCommunity } = useCommunityNotesData();

  const createSubMut = useCreateSubjectAction();
  const delSubMut = useDeleteSubjectAction();
  const createNoteMut = useCreateNoteAction();
  const updateNoteMut = useUpdateNoteAction();
  const delNoteMut = useDeleteNoteAction();
  const publishNoteMut = usePublishNoteAction();
  const unpublishNoteMut = useUnpublishNoteAction();

  const [newSubOpen, setNewSubOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubColor, setNewSubColor] = useState(SUBJECT_COLORS[0]);

  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubjectId, setNoteSubjectId] = useState<string>("");

  const [quizNoteId, setQuizNoteId] = useState<number | null>(null);
  const [quizSubjectName, setQuizSubjectName] = useState<string>("");
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const dialogEditorRef = useRef<HTMLDivElement | null>(null);
  const fullscreenEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (noteOpen && !fullscreen && dialogEditorRef.current) {
      dialogEditorRef.current.innerHTML = noteContent;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteOpen, fullscreen, editingNoteId]);

  useEffect(() => {
    if (noteOpen && fullscreen && fullscreenEditorRef.current) {
      fullscreenEditorRef.current.innerHTML = noteContent;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteOpen, fullscreen, editingNoteId]);

  const handleCreateSubject = async () => {
    if (!newSubName.trim()) return;
    try {
      await createSubMut.mutateAsync({ data: { name: newSubName, color: newSubColor, icon: "📚" } });
      setNewSubOpen(false);
      setNewSubName("");
      toast({ title: "Subject created!" });
    } catch {
      toast({ title: "Failed to create subject", variant: "destructive" });
    }
  };

  const openNewNote = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteSubjectId(selectedSubjectId ? String(selectedSubjectId) : (subjects[0] ? String(subjects[0].id) : ""));
    setFullscreen(false);
    setNoteOpen(true);
  };

  const openEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteSubjectId(String(note.subjectId));
    setFullscreen(false);
    setNoteOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      toast({ title: "Note title is required", variant: "destructive" });
      return;
    }
    if (!noteSubjectId) {
      toast({ title: "Please select a subject", variant: "destructive" });
      return;
    }
    try {
      if (editingNoteId) {
        await updateNoteMut.mutateAsync({ id: editingNoteId, data: { title: noteTitle, content: noteContent, subjectId: Number(noteSubjectId) } });
        toast({ title: "Note updated!" });
      } else {
        await createNoteMut.mutateAsync({ data: { title: noteTitle, content: noteContent, subjectId: Number(noteSubjectId) } });
        toast({ title: "Note created!" });
      }
      setNoteOpen(false);
      setFullscreen(false);
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
  const editingNote = editingNoteId ? notes.find(n => n.id === editingNoteId) : null;

  const handlePublish = async (noteId: number) => {
    try {
      const result = await publishNoteMut.mutateAsync(noteId);
      toast({ title: "Note submitted for review", description: result.message });
    } catch {
      toast({ title: "Could not submit note", variant: "destructive" });
    }
  };

  const handleUnpublish = async (noteId: number) => {
    try {
      await unpublishNoteMut.mutateAsync(noteId);
      toast({ title: "Note unpublished" });
    } catch {
      toast({ title: "Could not unpublish note", variant: "destructive" });
    }
  };

  return (
    <Layout
      title="Notes & Subjects"
      actions={
        <Button onClick={openNewNote} className="rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Note
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">

        {/* Subjects Sidebar */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-lg">Subjects</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setNewSubOpen(true)}>
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {subjects.length === 0 && !loadingSubjects && (
              <div className="text-center py-6 px-4">
                <Folder className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">Create a subject folder to get started</p>
                <Button size="sm" className="rounded-xl w-full" onClick={() => setNewSubOpen(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" /> Create Subject
                </Button>
              </div>
            )}

            {subjects.length > 0 && (
              <button
                onClick={() => setSelectedSubjectId(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
                  ${selectedSubjectId === null ? "bg-card shadow-sm border border-border font-medium" : "hover:bg-muted/50 text-muted-foreground border border-transparent"}`}
              >
                <BookOpen className="w-5 h-5 text-primary" />
                <span>All Notes</span>
                <span className="ml-auto text-xs text-muted-foreground">{notes.length || ""}</span>
              </button>
            )}

            {subjects.map((sub) => (
              <div key={sub.id} className="relative group">
                <button
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
                    ${selectedSubjectId === sub.id ? "bg-card shadow-sm border border-border font-medium" : "hover:bg-muted/50 text-muted-foreground border border-transparent"}`}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                  <span className="flex-1 truncate">{sub.name}</span>
                </button>
                <button
                  onClick={() => delSubMut.mutate({ id: sub.id })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes Area */}
        <div className="flex-1 bg-card rounded-3xl border border-border/50 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/20 space-y-3">
            {/* Tab switcher */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                <button
                  onClick={() => setNotesTab("my")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${notesTab === "my" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> My Notes
                </button>
                <button
                  onClick={() => setNotesTab("community")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${notesTab === "community" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Users className="w-3.5 h-3.5" /> Community
                  {communityNotes.length > 0 && (
                    <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px]">{communityNotes.length}</span>
                  )}
                </button>
              </div>
              {notesTab === "community" && (
                <Button size="sm" onClick={openNewNote} className="rounded-xl shadow-md shadow-primary/20 text-xs h-8 px-3">
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Note
                </Button>
              )}
            </div>
            {notesTab === "my" && (
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search notes..."
                    className="pl-9 bg-background border-border/50 rounded-xl"
                  />
                </div>
                {selectedSubjectId && (
                  <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full shrink-0">
                    {subjects.find(s => s.id === selectedSubjectId)?.name}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {notesTab === "community" ? (
              loadingCommunity ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl" />)}
                </div>
              ) : communityNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <Globe2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No community notes yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    {isPublicAccount
                      ? "Be the first to share a note! Open any note's menu and click \"Share Publicly\"."
                      : "Community notes are shared by users with public accounts. Check back later!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                  {communityNotes.map((note: any) => (
                    <div
                      key={note.id}
                      className="bg-background rounded-2xl border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      <div className="h-1.5 w-full bg-emerald-500" />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                              {note.subjectName ?? "General"} · {note.authorName}
                            </span>
                            <h4 className="font-bold text-base leading-snug truncate">{note.title}</h4>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> AI Verified
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed flex-1">
                          {note.content
                            ? note.content.replace(/<[^>]*>/g, " ").trim() || <span className="italic opacity-60">No content</span>
                            : <span className="italic opacity-60">No content yet</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : subjects.length === 0 && !loadingSubjects ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Folder className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Start by creating a subject</h3>
                <p className="text-muted-foreground max-w-sm mb-6">Create a subject folder (like "Mathematics" or "Biology") to organise your notes.</p>
                <Button onClick={() => setNewSubOpen(true)} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  <FolderPlus className="w-4 h-4 mr-2" /> Create First Subject
                </Button>
              </div>
            ) : loadingNotes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-52 bg-muted animate-pulse rounded-2xl" />)}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No notes yet</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  {selectedSubjectId
                    ? "Add your first note to this subject. The more detail you write, the better AI quizzes you'll get!"
                    : "Select a subject or create your first note."}
                </p>
                <Button onClick={openNewNote} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> Create Note
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                <AnimatePresence>
                  {filteredNotes.map((note: any) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      key={note.id}
                      className="bg-background rounded-2xl border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                    >
                      {/* Subject color bar */}
                      <div
                        className="h-1.5 w-full"
                        style={{ backgroundColor: subjects.find(s => s.id === note.subjectId)?.color ?? "#6366f1" }}
                      />

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            {!selectedSubjectId && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                {subjects.find(s => s.id === note.subjectId)?.name ?? "Unknown"}
                              </span>
                            )}
                            <h4 className="font-bold text-base leading-snug truncate">{note.title}</h4>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 text-muted-foreground">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => openEditNote(note)} className="gap-2 cursor-pointer">
                                <Edit3 className="w-4 h-4" /> Edit
                              </DropdownMenuItem>
                              {isPublicAccount && (
                                <>
                                  <DropdownMenuSeparator />
                                  {note.isPublic ? (
                                    <DropdownMenuItem
                                      onClick={() => handleUnpublish(note.id)}
                                      className="gap-2 cursor-pointer"
                                      disabled={unpublishNoteMut.isPending}
                                    >
                                      <EyeOff className="w-4 h-4" /> Unpublish
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handlePublish(note.id)}
                                      className="gap-2 cursor-pointer text-emerald-600 focus:text-emerald-600"
                                      disabled={publishNoteMut.isPending}
                                    >
                                      <Globe2 className="w-4 h-4" /> Share Publicly
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => delNoteMut.mutate({ id: note.id })}
                                className="text-destructive gap-2 cursor-pointer focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Moderation status badge */}
                        {note.isPublic && (
                          <div className="mb-2">
                            {note.moderationStatus === "pending" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                                <Clock className="w-2.5 h-2.5" /> Pending review
                              </span>
                            )}
                            {note.moderationStatus === "approved" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Public · AI Verified
                              </span>
                            )}
                            {note.moderationStatus === "rejected" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full" title={note.moderationNote ?? ""}>
                                <AlertCircle className="w-2.5 h-2.5" /> Not approved
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1 mb-4">
                          {note.content
                            ? stripHtml(note.content) || <span className="italic opacity-60">No content yet</span>
                            : <span className="italic opacity-60">No content yet</span>}
                        </p>

                        {/* Generate Quiz Button - clearly visible */}
                        <Button
                          size="sm"
                          className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90 shadow-md shadow-primary/20 font-semibold flex items-center justify-center gap-1.5 text-xs"
                          onClick={() => { setQuizNoteId(note.id); setQuizSubjectName(subjects.find(s => s.id === note.subjectId)?.name ?? ""); }}
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Generate Quiz</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={newSubOpen} onOpenChange={setNewSubOpen}>
        <DialogContent className="rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Subject Name</label>
              <Input
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateSubject()}
                placeholder="e.g. Mathematics, Biology, History…"
                className="rounded-xl"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Colour</label>
              <div className="flex gap-2">
                {SUBJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewSubColor(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${newSubColor === c ? "border-foreground scale-110 shadow-lg" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleCreateSubject} className="w-full rounded-xl" disabled={createSubMut.isPending || !newSubName.trim()}>
              {createSubMut.isPending ? "Creating…" : "Create Subject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Document Editor */}
      <AnimatePresence>
        {noteOpen && fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Toolbar */}
            <div className="shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3">
              <button
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pr-3 border-r border-border"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Exit fullscreen</span>
              </button>

              {/* Subject selector compact */}
              {subjects.length > 0 && (
                <Select value={noteSubjectId} onValueChange={setNoteSubjectId}>
                  <SelectTrigger className="h-8 rounded-lg text-xs w-40 sm:w-48 border-border/60">
                    <SelectValue placeholder="Subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex-1" />

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {noteContent.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length} words
              </span>

              {/* Share to Community in fullscreen — existing notes + public account only */}
              {editingNoteId && isPublicAccount && (
                editingNote?.isPublic ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnpublish(editingNoteId)}
                    disabled={unpublishNoteMut.isPending}
                    className="rounded-lg gap-1.5 text-muted-foreground"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Unpublish</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePublish(editingNoteId)}
                    disabled={publishNoteMut.isPending}
                    className="rounded-lg gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{publishNoteMut.isPending ? "Sharing…" : "Share"}</span>
                  </Button>
                )
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNoteOpen(false)}
                className="rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>

              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={updateNoteMut.isPending || createNoteMut.isPending || subjects.length === 0}
                className="rounded-lg shadow-md shadow-primary/20 gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {updateNoteMut.isPending || createNoteMut.isPending ? "Saving…" : "Save"}
              </Button>
            </div>

            {/* Document area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-12 sm:px-12">
                {/* Subject color accent */}
                {noteSubjectId && (
                  <div
                    className="w-10 h-1 rounded-full mb-8"
                    style={{ backgroundColor: subjects.find(s => String(s.id) === noteSubjectId)?.color ?? "transparent" }}
                  />
                )}

                {/* Title */}
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Untitled note"
                  className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 mb-6 leading-tight"
                  autoFocus
                />

                {/* Divider */}
                <div className="h-px bg-border/50 mb-6" />

                {/* Formatting toolbar */}
                <div className="mb-4">
                  <FormatToolbar editorRef={fullscreenEditorRef} onContentChange={setNoteContent} compact />
                </div>

                {/* Content */}
                <div className="relative">
                  <div
                    ref={fullscreenEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={e => setNoteContent((e.currentTarget as HTMLDivElement).innerHTML)}
                    className="w-full min-h-[60vh] bg-transparent focus:outline-none text-base leading-8 text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                    style={{ fontFamily: "inherit" }}
                  />
                  {!noteContent.replace(/<[^>]+>/g, "").trim() && (
                    <div className="absolute top-0 left-0 text-base leading-8 text-muted-foreground/40 pointer-events-none select-none">
                      Start writing your notes here…
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Editor Dialog */}
      <Dialog open={noteOpen && !fullscreen} onOpenChange={(open) => { setNoteOpen(open); if (!open) setFullscreen(false); }}>
        <DialogContent className="sm:max-w-2xl border-0 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-accent w-full" />
          <div className="p-6 md:p-8 space-y-5">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold">{editingNoteId ? "Edit Note" : "New Note"}</DialogTitle>
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Full-screen document view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            {/* Subject selector — always shown */}
            {subjects.length === 0 ? (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">No subjects yet</p>
                  <p>Create a subject folder first, then come back to add notes.</p>
                  <Button
                    size="sm"
                    className="mt-2 rounded-lg"
                    onClick={() => { setNoteOpen(false); setNewSubOpen(true); }}
                  >
                    Create Subject
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Subject</label>
                <Select value={noteSubjectId} onValueChange={setNoteSubjectId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold mb-1.5 block">Title</label>
              <Input
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Note title"
                className="rounded-xl text-base font-semibold"
                autoFocus={subjects.length > 0}
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block">
                Content
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  — The more detail you write, the better your AI quiz will be!
                </span>
              </label>
              <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/30 focus-within:ring-2 focus-within:ring-primary/30">
                <div className="px-3 pt-2.5 pb-1.5 border-b border-border/40">
                  <FormatToolbar editorRef={dialogEditorRef} onContentChange={setNoteContent} />
                </div>
                <div className="relative">
                  <div
                    ref={dialogEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={e => setNoteContent((e.currentTarget as HTMLDivElement).innerHTML)}
                    className="w-full min-h-[12rem] p-4 bg-transparent focus:outline-none text-sm leading-relaxed overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  />
                  {!noteContent.replace(/<[^>]+>/g, "").trim() && (
                    <div className="absolute top-4 left-4 text-sm text-muted-foreground/50 pointer-events-none select-none">
                      Write your study notes here. Include key concepts, definitions, examples and explanations…
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Share to Community — only for existing notes on public accounts */}
              {editingNoteId && isPublicAccount ? (
                editingNote?.isPublic ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnpublish(editingNoteId)}
                    disabled={unpublishNoteMut.isPending}
                    className="rounded-xl gap-2 text-muted-foreground border-border/60"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Unpublish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublish(editingNoteId)}
                    disabled={publishNoteMut.isPending}
                    className="rounded-xl gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {publishNoteMut.isPending ? "Sharing…" : "Share to Community"}
                  </Button>
                )
              ) : <div />}
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setNoteOpen(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={handleSaveNote}
                  disabled={updateNoteMut.isPending || createNoteMut.isPending || subjects.length === 0}
                  className="rounded-xl px-8 shadow-lg shadow-primary/20"
                >
                  {updateNoteMut.isPending || createNoteMut.isPending ? "Saving…" : "Save Note"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Modal */}
      {quizNoteId != null && (
        <QuizModal noteId={quizNoteId} subjectName={quizSubjectName} open={true} onOpenChange={(open) => { if (!open) setQuizNoteId(null); }} />
      )}
    </Layout>
  );
}

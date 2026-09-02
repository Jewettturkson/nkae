import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, ArrowLeft, Mic, Square, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authHeaders } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function NewMaterial() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Lines the extractor is unsure about (garbled OCR, merged words, broken
  // spacing) and whether the document was too long to import in full. Both
  // come back from the same extract call, and both go stale the moment the
  // user hand edits the text, so any manual edit clears them rather than
  // showing a highlight that no longer matches what's on screen.
  const [flaggedLines, setFlaggedLines] = useState<number[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [flagCursor, setFlagCursor] = useState(0);

  // Picks up subject/exam date handed off from the dashboard's "what are you
  // studying" capture, so that intent actually lands somewhere real instead
  // of being collected and then discarded. Read once on mount: this page
  // owns the fields after that.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subjectId");
    const exam = params.get("examDate");
    if (sid) setSubjectId(sid);
    if (exam) setExamDate(exam);
  }, []);

  async function handleFile(file: File) {
    const okTypes = [".pdf", ".docx", ".txt", ".mp3", ".m4a", ".wav", ".webm", ".ogg"];
    if (!okTypes.some((t) => file.name.toLowerCase().endsWith(t))) {
      toast({ title: "Unsupported file", description: "Upload a PDF, DOCX, TXT, or an audio recording (MP3, M4A, WAV).", variant: "destructive" });
      return;
    }
    setIsExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/study-materials/extract", {
        method: "POST",
        headers: await authHeaders(), // no Content-Type: the browser sets the multipart boundary
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Extraction failed");
      }
      const data = await res.json();
      setContent(data.text);
      if (!title.trim()) setTitle(data.suggestedTitle);
      setUploadedFileName(file.name);
      setTruncated(!!data.truncated);
      setFlaggedLines(Array.isArray(data.flaggedLines) ? data.flaggedLines : []);
      setFlagCursor(0);
      toast({
        title: "Text extracted",
        description: data.truncated
          ? "Long document: the first part was imported. Review before creating."
          : `${file.name} imported. Review the text, then create.`,
      });
    } catch (e: any) {
      toast({ title: "Could not read file", description: e.message, variant: "destructive" });
    }
    setIsExtracting(false);
  }

  // Jumps to and selects a flagged line inside the actual textarea, so
  // "review this" means something concrete instead of just a warning label.
  function jumpToLine(lineIndex: number) {
    const el = contentRef.current;
    if (!el) return;
    const lines = content.split("\n");
    let start = 0;
    for (let i = 0; i < lineIndex; i++) start += lines[i].length + 1;
    const end = start + (lines[lineIndex]?.length || 0);
    el.focus();
    el.setSelectionRange(start, end);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlagCursor(flaggedLines.indexOf(lineIndex));
  }

  const contentLines = useMemo(() => content.split("\n"), [content]);
  const flaggedSet = useMemo(() => new Set(flaggedLines), [flaggedLines]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const MAX_RECORD_SECONDS = 45 * 60;

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 32 kbps opus/aac is plenty for speech and keeps 45 min under the 25MB upload cap
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 2000) {
          toast({ title: "Nothing recorded", description: "The recording was empty. Try again closer to the speaker.", variant: "destructive" });
          return;
        }
        handleFile(new File([blob], `lecture-recording.${ext}`, { type }));
      };
      rec.start(1000);
      mediaRecorderRef.current = rec;
      setRecordSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_RECORD_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access in your browser settings and try again.",
        variant: "destructive",
      });
    }
  }

  const recClock = `${String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:${String(recordSeconds % 60).padStart(2, "0")}`;

  // Fetch subjects for dropdown
  const { data: subjects } = useQuery({
    queryKey: ["/api/subjects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/study-materials", data);
    },
    onSuccess: async (response) => {
      const material = await response.json();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/study-materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      
      toast({
        title: "Material Created!",
        description: "Your study material has been uploaded successfully.",
      });
      
      // Start AI processing in background
      if (content.trim()) {
        setIsGeneratingAI(true);
        try {
          await apiRequest("POST", `/api/study-materials/${material.id}/generate-ai-content`);
          toast({
            title: "AI Processing Complete!",
            description: "Summary, flashcards, and quiz questions have been generated.",
          });
        } catch (error) {
          toast({
            title: "AI Processing Failed",
            description: "Material created but AI features unavailable.",
            variant: "destructive",
          });
        }
        setIsGeneratingAI(false);
      }
      
      setLocation(`/materials/${material.id}`);
    },
    onError: (error: any) => {
      // Server messages (e.g. the daily beta limit) come through as "429: {json}"
      const raw = String(error?.message || "");
      let description = "Failed to create study material. Please try again.";
      const jsonStart = raw.indexOf("{");
      if (jsonStart !== -1) {
        try { description = JSON.parse(raw.slice(jsonStart)).message || description; } catch {}
      }
      toast({ title: "Could not create material", description, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your study material.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content for your study material.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      subjectId: subjectId ? parseInt(subjectId) : null,
      examDate: examDate || null,
      userId: (user as any)?.id,
    });
  };

  return (
    <div className="min-h-screen gradient-secondary relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 blur-2xl floating"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 blur-2xl floating" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="hover-lift"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Add Study Material
            </h1>
            <p className="text-muted-foreground text-lg">
              Upload your notes and let AI create summaries, flashcards, and quizzes
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-foreground font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Material Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-foreground/90">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Introduction to Psychology"
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium text-foreground/90">
                      Subject
                    </Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {(subjects as any[])?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="examDate" className="text-sm font-medium text-foreground/90">
                      Exam date <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="examDate"
                      type="date"
                      value={examDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">Reviews compress so everything is covered before this day.</p>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a PDF, DOCX, TXT, or audio file"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.mp3,.m4a,.wav,.webm,.ogg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                  <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  {isExtracting ? (
                    <p className="text-sm text-muted-foreground">Extracting text… (audio can take a minute or two)</p>
                  ) : uploadedFileName ? (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{uploadedFileName}</span> imported. Drop another file to replace it.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">Drop a PDF, DOCX, TXT, or lecture audio here</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse. We extract the text for you, then AI does the rest.</p>
                    </>
                  )}
                </div>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isExtracting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Mic className="h-4 w-4 text-primary" />
                    Or record a lecture right here
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                    <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                      Recording {recClock}
                      <span className="text-xs text-muted-foreground">(auto-stops at 45:00)</span>
                    </span>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Stop &amp; transcribe
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-sm font-medium text-foreground/90">
                    Content *
                  </Label>

                  {truncated ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>This document was long, only the first part was imported. Review before creating.</span>
                    </div>
                  ) : null}

                  {flaggedLines.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {flaggedLines.length} {flaggedLines.length === 1 ? "line" : "lines"} may not have imported cleanly, worth a second look.
                        </span>
                        <button
                          type="button"
                          className="shrink-0 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300"
                          onClick={() => jumpToLine(flaggedLines[flagCursor % flaggedLines.length])}
                        >
                          Jump to next
                        </button>
                      </div>

                      {/* Notebook-style read preview: the source of truth is still the textarea below,
                          this is just a scannable view with the uncertain lines underlined. */}
                      <div className="index-card max-h-48 overflow-y-auto rounded-xl border border-border p-4 pl-8 text-sm leading-relaxed">
                        {contentLines.map((line, i) => (
                          <p
                            key={i}
                            onClick={() => jumpToLine(i)}
                            className={
                              flaggedSet.has(i)
                                ? "cursor-pointer rounded px-1 text-amber-700 underline decoration-amber-500 decoration-2 underline-offset-4 hover:bg-amber-500/10 dark:text-amber-400"
                                : "px-1 text-foreground/80"
                            }
                          >
                            {line || " "}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <Textarea
                    id="content"
                    ref={contentRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      // the text just diverged from what the extractor scored, so stop
                      // pointing at line numbers that may no longer mean anything
                      if (flaggedLines.length > 0) setFlaggedLines([]);
                      if (truncated) setTruncated(false);
                    }}
                    placeholder="Paste your lecture notes, textbook chapters, or study materials here..."
                    className="min-h-[300px] resize-none"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The more detailed content you provide, the better AI can generate summaries and questions.
                  </p>
                </div>

                <div className="flex gap-4 justify-end pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/dashboard")}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-primary text-white hover-lift"
                    disabled={createMutation.isPending || isGeneratingAI}
                  >
                    {createMutation.isPending ? (
                      <>Processing...</>
                    ) : isGeneratingAI ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        Generating AI Content...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Create Material
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-foreground font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Will Generate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Smart Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    Key concepts and important points extracted automatically
                  </p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Flashcards</h3>
                  <p className="text-sm text-muted-foreground">
                    Study cards with spaced repetition scheduling
                  </p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Quiz Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    Practice questions to test your understanding
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
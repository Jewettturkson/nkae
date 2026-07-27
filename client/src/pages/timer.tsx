import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Phase = "focus" | "break";
type SessionType = "pomodoro" | "timed" | "free";

const PRESETS: { type: SessionType; label: string; minutes: number | null }[] = [
  { type: "pomodoro", label: "Pomodoro 25/5", minutes: 25 },
  { type: "timed", label: "Timed 50 min", minutes: 50 },
  { type: "free", label: "Free session", minutes: null },
];

export default function Timer() {
  const { toast } = useToast();
  const { data: subjects = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/subjects"] });
  const [preset, setPreset] = useState(PRESETS[0]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds in current phase
  const [totalFocus, setTotalFocus] = useState(0); // total focus seconds
  const [showRating, setShowRating] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval>>();

  const target = phase === "break" ? 5 * 60 : preset.minutes ? preset.minutes * 60 : null;

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => {
      setElapsed((e) => e + 1);
      if (phase === "focus") setTotalFocus((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval.current);
  }, [running, phase]);

  // phase transitions for pomodoro
  useEffect(() => {
    if (target && elapsed >= target) {
      if (preset.type === "pomodoro" && phase === "focus") {
        setPhase("break");
        setElapsed(0);
        toast({ title: "Focus block done!", description: "Take a 5 minute break." });
      } else if (phase === "break") {
        setPhase("focus");
        setElapsed(0);
        toast({ title: "Break over", description: "Back to it. You've got this." });
      } else {
        setRunning(false);
        setShowRating(true);
      }
    }
  }, [elapsed, target, phase, preset.type, toast]);

  const logSession = useMutation({
    mutationFn: (focusRating: number) =>
      apiRequest("POST", "/api/study-sessions", {
        sessionType: preset.type,
        subjectId,
        plannedDuration: preset.minutes,
        actualDuration: Math.max(1, Math.round(totalFocus / 60)),
        focusRating,
        completedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Session logged", description: "Nice work. Your stats are updated." });
      reset();
    },
  });

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setTotalFocus(0);
    setPhase("focus");
    setShowRating(false);
  };

  const mm = String(Math.floor((target ? target - elapsed : elapsed) / 60)).padStart(2, "0");
  const ss = String((target ? target - elapsed : elapsed) % 60).padStart(2, "0");
  const progress = target ? (elapsed / target) * 100 : 0;

  if (showRating) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-foreground">How focused were you?</h1>
        <p className="mt-2 text-muted-foreground">{Math.round(totalFocus / 60)} minutes of focus time.</p>
        <div className="mt-8 flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => logSession.mutate(rating)}
              className="rounded-xl border border-border p-4 transition hover:border-primary hover:bg-primary/10"
              aria-label={`Focus rating ${rating}`}
            >
              <Star className={`h-6 w-6 ${rating <= 3 ? "text-muted-foreground" : "text-amber-400"}`} />
              <span className="mt-1 block text-sm font-medium">{rating}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-foreground">Focus session</h1>

      {/* presets */}
      <div className="mt-6 flex justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.type}
            type="button"
            disabled={running}
            onClick={() => { setPreset(p); reset(); }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              preset.type === p.type ? "bg-primary text-white" : "bg-card text-muted-foreground border border-border hover:border-primary/50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* subject */}
      {subjects.length > 0 && (
        <select
          className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={subjectId ?? ""}
          onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      {/* dial */}
      <motion.div
        animate={{ scale: running ? [1, 1.02, 1] : 1 }}
        transition={{ repeat: running ? Infinity : 0, duration: 4 }}
        className={`relative mx-auto mt-10 flex h-64 w-64 items-center justify-center rounded-full ${
          phase === "break" ? "bg-emerald-500/10" : "bg-primary/10"
        }`}
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          {target ? (
            <circle
              cx="50" cy="50" r="46" fill="none"
              stroke={phase === "break" ? "#10b981" : "#6366f1"}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 289} 289`}
            />
          ) : null}
        </svg>
        <div>
          <p className="font-mono text-5xl font-bold text-foreground">{mm}:{ss}</p>
          <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">{phase === "break" ? "Break" : preset.type === "free" ? "Elapsed" : "Remaining"}</p>
        </div>
      </motion.div>

      <div className="mt-10 flex justify-center gap-3">
        <Button size="lg" onClick={() => setRunning((r) => !r)}>
          {running ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> {elapsed > 0 ? "Resume" : "Start"}</>}
        </Button>
        {(elapsed > 0 || totalFocus > 0) && (
          <>
            <Button size="lg" variant="outline" onClick={() => { setRunning(false); setShowRating(true); }}>
              Finish
            </Button>
            <Button size="lg" variant="ghost" onClick={reset} aria-label="Reset">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Layers, ListChecks, Plus, Timer } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Heatmap from "@/components/app/Heatmap";
import { AnimatedKaeMark } from "@/components/app/BrandMark";
import { useAuth } from "@/hooks/useAuth";

type Analytics = {
  todayStats: { totalMinutes: number; sessionsCompleted: number; flashcardsReviewed: number; quizzesCompleted: number };
  dueFlashcardsCount?: number;
  streakDays?: number;
  heatmap?: number[];
  weeklyGoalMinutes?: number;
  weeklyMinutes?: number[];
};

type Material = { id: number; title: string; summary: string | null; createdAt: string };

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
  }, [authLoading, isAuthenticated]);

  const { data: analytics, isLoading: statsLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics/dashboard"],
    enabled: isAuthenticated,
  });
  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ["/api/study-materials"],
    enabled: isAuthenticated,
  });

  const firstName = ((user as any)?.firstName || "").trim() || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const today = analytics?.todayStats || { totalMinutes: 0, sessionsCompleted: 0, flashcardsReviewed: 0, quizzesCompleted: 0 };
  const due = analytics?.dueFlashcardsCount ?? 0;
  const streak = analytics?.streakDays ?? 0;
  const heatmap = analytics?.heatmap ?? Array(84).fill(0);
  const goal = analytics?.weeklyGoalMinutes ?? 300;
  const weekMinutes = (analytics?.weeklyMinutes ?? []).reduce((a, b) => a + b, 0);
  const goalPct = Math.min(100, Math.round((weekMinutes / goal) * 100));

  // "Continue where you left off": the smartest next action from live data
  const nextAction = useMemo(() => {
    if (due > 0) return { label: `Review ${due} due card${due === 1 ? "" : "s"}`, href: "/flashcards", icon: Layers };
    if (materials.length === 0) return { label: "Upload your first material", href: "/materials/new", icon: Plus };
    return { label: "Start a focus session", href: "/timer", icon: Timer };
  }, [due, materials.length]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AnimatedKaeMark size={88} />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-16 md:pt-12">
      {/* greeting */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <h1 className="display mt-2 text-4xl text-foreground md:text-5xl">
          {greeting}, <span className="highlight">{firstName}</span>.
        </h1>
        {streak > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold">
            <Flame className="h-4 w-4 text-amber-500" /> {streak}-day streak
          </p>
        )}
      </motion.div>

      {/* smart CTA */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="mt-7">
        <Button
          size="lg"
          className="h-14 w-full justify-between rounded-2xl px-6 text-base md:w-auto md:min-w-[340px]"
          onClick={() => setLocation(nextAction.href)}
        >
          <span className="flex items-center gap-2.5">
            <nextAction.icon className="h-5 w-5" /> {nextAction.label}
          </span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* today stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { value: statsLoading ? "…" : `${today.totalMinutes}m`, label: "studied today" },
          { value: statsLoading ? "…" : String(today.flashcardsReviewed), label: "cards reviewed" },
          { value: statsLoading ? "…" : String(today.quizzesCompleted), label: "quizzes taken" },
          { value: statsLoading ? "…" : String(due), label: "cards due" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 + i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="display text-3xl text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* weekly goal + heatmap */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-foreground">Weekly goal</h2>
            <span className="text-sm text-muted-foreground">{Math.round(weekMinutes / 60 * 10) / 10}h of {Math.round(goal / 60)}h</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.33, 1, 0.68, 1] }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{goalPct >= 100 ? "Goal hit. Outstanding." : `${goalPct}% there${goalPct >= 60 ? ", on track" : ""}`}</p>

          <h2 className="mt-6 font-semibold text-foreground">Last 12 weeks</h2>
          <div className="mt-3 overflow-x-auto">
            <Heatmap days={heatmap} />
          </div>
        </motion.section>

        {/* library */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Library</h2>
            <Link href="/materials/new" className="text-sm font-medium text-primary hover:underline">
              + Add material
            </Link>
          </div>
          {materials.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="font-medium text-foreground">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload notes and the AI builds your summaries, cards, and quizzes.</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {materials.slice(0, 5).map((material) => (
                <li key={material.id}>
                  <Link
                    href={`/materials/${material.id}`}
                    className="group flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground group-hover:text-primary">{material.title}</p>
                      {material.summary ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{material.summary}</p> : null}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/quiz">
              <Button variant="outline" className="w-full rounded-xl"><ListChecks className="mr-2 h-4 w-4" /> Take a quiz</Button>
            </Link>
            <Link href="/timer">
              <Button variant="outline" className="w-full rounded-xl"><Timer className="mr-2 h-4 w-4" /> Focus session</Button>
            </Link>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

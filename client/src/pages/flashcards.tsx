import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Layers, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";

type RegenerateDirection = "harder" | "easier" | "reword";

type Flashcard = {
  id: number;
  front: string;
  back: string;
  correctStreak: number | null;
  totalReviews: number | null;
  nextReview: string | null;
  reviewReason: string | null;
};

export default function Flashcards() {
  const { data: allCards = [], isLoading } = useQuery<Flashcard[]>({ queryKey: ["/api/flashcards"] });
  const [showAll, setShowAll] = useState(false);
  const cards = useMemo(() => {
    if (showAll) return allCards;
    const now = Date.now();
    // spaced repetition: default to cards due now (or never reviewed)
    const due = allCards.filter((c) => !c.nextReview || new Date(c.nextReview).getTime() <= now);
    return due.length > 0 ? due : allCards;
  }, [allCards, showAll]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<number, boolean>>({});

  const review = useMutation({
    mutationFn: ({ id, correct }: { id: number; correct: boolean }) =>
      apiRequest("PATCH", `/api/flashcards/${id}/review`, { correct }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] }),
  });

  // Rewords or re-levels the card in place. Deliberately not a review: it
  // doesn't touch correctStreak/nextReview, it just changes what the
  // question says. "This was too easy" and "I got this right" are different
  // signals, so they get different controls instead of both being buried in
  // one four option grading scale.
  const regenerate = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: RegenerateDirection }) => {
      const res = await apiRequest("POST", `/api/flashcards/${id}/regenerate`, { direction });
      return (await res.json()) as Flashcard;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Flashcard[]>(["/api/flashcards"], (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) : prev,
      );
      setFlipped(false);
    },
  });

  const done = index >= cards.length && cards.length > 0;
  const correctCount = useMemo(() => Object.values(results).filter(Boolean).length, [results]);

  const grade = (correct: boolean) => {
    const card = cards[index];
    setResults((prev) => ({ ...prev, [card.id]: correct }));
    review.mutate({ id: card.id, correct });
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>;
  }

  if (allCards.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Layers className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
        <h1 className="text-xl font-semibold text-foreground">No flashcards yet</h1>
        <p className="mt-2 text-muted-foreground">Upload study material and generate flashcards to start reviewing.</p>
        <Button className="mt-6" onClick={() => (window.location.href = "/materials/new")}>Upload material</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Session complete</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {correctCount} of {cards.length} correct. Cards you missed will come back sooner: that&rsquo;s spaced repetition working.
        </p>
        <Button
          className="mt-8"
          onClick={() => {
            setIndex(0);
            setResults({});
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Review again
        </Button>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>Card {index + 1} of {cards.length}{showAll ? "" : " due"}</span>
        <button type="button" className="underline underline-offset-2 hover:text-indigo-600" onClick={() => { setShowAll((v) => !v); setIndex(0); }}>
          {showAll ? "Show due only" : "Show all cards"}
        </button>
      </div>
      <Progress value={(index / cards.length) * 100} className="mb-8" />

      {card.reviewReason ? (
        <div
          key={`reason-${card.id}`}
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          <span>{card.reviewReason}</span>
        </div>
      ) : null}

      <AnimatePresence mode="popLayout">
        <motion.div
          key={card.id}
          drag={flipped ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          onDragEnd={(_, info) => {
            if (info.offset.x > 110) grade(true);
            else if (info.offset.x < -110) grade(false);
          }}
          initial={{ x: 240, opacity: 0, rotate: 6 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={{ x: -240, opacity: 0, rotate: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={() => setFlipped((f) => !f)}
          className="index-card relative flex min-h-[300px] w-full cursor-pointer touch-pan-y items-center justify-center rounded-2xl border border-border p-8 pl-12 text-center shadow-sm"
          role="button"
          aria-label={flipped ? "Answer shown, swipe right if you got it, left if you missed" : "Tap to reveal the answer"}
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {flipped ? "Answer" : "Question"}
            </p>
            <p className="display text-2xl leading-snug text-foreground">{flipped ? card.back : card.front}</p>
            <p className="mt-5 text-xs text-muted-foreground">
              {flipped ? "Swipe right if you got it, left if you missed" : "Tap to reveal"}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {flipped ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => grade(false)}>
              Missed it
            </Button>
            <Button className="h-12 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => grade(true)}>
              Got it
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Question wasn&rsquo;t right for you?
            </span>
            <button
              type="button"
              disabled={regenerate.isPending}
              className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              onClick={() => regenerate.mutate({ id: card.id, direction: "easier" })}
            >
              Make it easier
            </button>
            <span>·</span>
            <button
              type="button"
              disabled={regenerate.isPending}
              className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              onClick={() => regenerate.mutate({ id: card.id, direction: "harder" })}
            >
              Make it harder
            </button>
            <span>·</span>
            <button
              type="button"
              disabled={regenerate.isPending}
              className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              onClick={() => regenerate.mutate({ id: card.id, direction: "reword" })}
            >
              Reword it
            </button>
          </div>
          {regenerate.isPending ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">Rewriting this card&hellip;</p>
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">Think of the answer, then tap the card.</p>
      )}
    </div>
  );
}

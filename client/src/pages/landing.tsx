import { useEffect, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers, ListChecks, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import KaeWordmark, { AnimatedKaeMark, KaeMark } from "@/components/app/BrandMark";
import { firebaseReady, signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  { icon: Sparkles, title: "AI summaries", body: "Notes in, clarity out. Summaries and key points in seconds." },
  { icon: Layers, title: "Smart flashcards", body: "Spaced repetition that resurfaces cards right before you forget them." },
  { icon: ListChecks, title: "Adaptive quizzes", body: "Active recall with explanations, generated from your own material." },
  { icon: Timer, title: "Focus sessions", body: "Pomodoro blocks, focus ratings, streaks, and your study heatmap." },
];

const STEPS = [
  { n: "01", title: "Upload", body: "Paste your notes, a chapter, anything you need to know." },
  { n: "02", title: "Generate", body: "AI builds your summary, flashcards, and a quiz in seconds." },
  { n: "03", title: "Remember", body: "Nkae brings you back at exactly the right moment." },
];

// Auto-flipping index card: the product demos itself.
function DemoCard() {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setFlipped((f) => !f), 3600);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <div className="perspective-1000 mx-auto w-full max-w-md">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
        className="preserve-3d relative aspect-[4/3] w-full"
      >
        <div className="backface-hidden index-card absolute inset-0 flex items-center justify-center rounded-3xl p-8 pl-12 text-center shadow-2xl">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Question</p>
            <p className="text-xl font-semibold leading-snug text-gray-900">What is the time complexity of binary search?</p>
          </div>
        </div>
        <div
          className="backface-hidden index-card absolute inset-0 flex items-center justify-center rounded-3xl p-8 pl-12 text-center shadow-2xl"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Answer</p>
            <p className="text-xl font-semibold leading-snug text-gray-900">O(log n): the search space halves with each comparison.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const WORDS = ["Remember", "what", "you", "learn."];
const DUSK = "#17141d";

export default function Landing() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"intro" | "hero">(() =>
    sessionStorage.getItem("nkae-intro") ? "hero" : "intro"
  );
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => {
      sessionStorage.setItem("nkae-intro", "1");
      setPhase("hero");
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  const fail = (error: unknown) =>
    toast({ title: "Sign in failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });

  const login = async () => {
    if (!firebaseReady) {
      toast({ title: "Auth not configured", description: "Add the Firebase environment variables to enable sign in." });
      return;
    }
    try {
      setBusy(true);
      await signInWithGoogle();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const emailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseReady) return;
    try {
      setBusy(true);
      await signInWithEmail(email, password);
    } catch {
      try {
        await signUpWithEmail(email, password);
      } catch (error) {
        fail(error);
      }
    } finally {
      setBusy(false);
    }
  };

  const hero = phase === "hero";
  const d = (extra: number) => (hero ? 0.35 + extra : 0);

  return (
    <LayoutGroup>
      <div style={{ backgroundColor: DUSK }} className="relative min-h-screen">
        {/* SHEET 1: intro + hero share one continuous scene */}
        <section className="sticky top-0 z-0 flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: DUSK }}>
          {/* Endel breathing glows, one continuous atmosphere */}
          <div aria-hidden className="breathe left-[8%] top-[12%] h-[420px] w-[420px] bg-[#5b4be0]/30" />
          <div aria-hidden className="breathe right-[4%] top-[42%] h-[380px] w-[380px] bg-[#8b7bf7]/20" style={{ animationDelay: "-3s" }} />
          <div aria-hidden className="breathe bottom-[-12%] left-[36%] h-[360px] w-[360px] bg-[#ffd44d]/10" style={{ animationDelay: "-6s" }} />

          {/* nav: the mark lands here after the intro */}
          <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
            <span className="flex h-[38px] items-center gap-2.5">
              {hero && (
                <motion.span layoutId="kae-brand" transition={{ duration: 0.9, ease: [0.33, 1, 0.68, 1] }}>
                  <KaeMark size={34} />
                </motion.span>
              )}
              {hero && (
                <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.8, duration: 0.5 } }}>
                  <KaeWordmark dark className="text-2xl" />
                </motion.span>
              )}
            </span>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: hero ? 1 : 0, transition: { delay: d(0.5), duration: 0.6 } }}>
              <Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={login}>
                Sign in
              </Button>
            </motion.div>
          </header>

          {/* intro: mark center stage on the SAME background, no curtain */}
          {!hero && (
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 pb-24">
              <motion.span layoutId="kae-brand">
                <AnimatedKaeMark size={116} />
              </motion.span>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 0.5 } }}
                className="font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-500"
              >
                remembrance
              </motion.p>
            </div>
          )}

          {/* hero content breathes in as the mark glides to the nav */}
          {hero && (
            <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 pb-24 pt-6 md:grid-cols-2">
              <div>
                <h1 className="text-5xl font-extrabold leading-[1.04] tracking-tight text-white md:text-6xl">
                  {WORDS.map((word, i) => (
                    <span key={word} className="inline-block overflow-hidden pb-1 align-bottom">
                      <motion.span
                        initial={{ y: "112%" }}
                        animate={{ y: 0, transition: { delay: d(0.15 + i * 0.08), duration: 0.75, ease: [0.33, 1, 0.68, 1] } }}
                        className={`inline-block pr-3 ${word === "Remember" ? "text-[#ffd44d]" : ""}`}
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: d(0.55), duration: 0.7 } }}
                  className="mt-6 max-w-md text-lg leading-relaxed text-neutral-400"
                >
                  Nkae is Twi for remembrance. Your notes become summaries, flashcards, and quizzes,
                  and Nkae brings you back at exactly the right moment.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: d(0.7), duration: 0.7 } }}
                  className="mt-9"
                >
                  <Button size="lg" disabled={busy} className="h-14 rounded-full bg-[#5b4be0] px-8 text-base text-white shadow-lg shadow-[#5b4be0]/25 hover:bg-[#6d5ef0]" onClick={login}>
                    Continue with Google <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <button
                    type="button"
                    className="mt-4 block text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-300"
                    onClick={() => setShowEmail((v) => !v)}
                  >
                    Use email instead
                  </button>
                  {showEmail && (
                    <form onSubmit={emailAuth} className="mt-4 flex max-w-sm flex-col gap-2">
                      <input
                        type="email" required placeholder="name@school.edu" value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-neutral-500"
                        aria-label="Email"
                      />
                      <input
                        type="password" required minLength={6} placeholder="Password (6+ characters)" value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-neutral-500"
                        aria-label="Password"
                      />
                      <Button type="submit" disabled={busy} className="h-11 rounded-xl bg-[#5b4be0] text-white hover:bg-[#6d5ef0]">
                        Sign in or create account
                      </Button>
                    </form>
                  )}
                  <p className="mt-4 text-xs text-neutral-600">Free while in beta. Your notes stay yours.</p>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 44, rotate: 3 }}
                animate={{ opacity: 1, y: 0, rotate: 0, transition: { delay: d(0.6), duration: 0.9, ease: [0.33, 1, 0.68, 1] } }}
              >
                <DemoCard />
                <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                  your notes become this, automatically
                </p>
              </motion.div>
            </main>
          )}
        </section>

        {/* SHEET 2: how it works, slides over the hero (Family-style stacking) */}
        <section className="sticky top-0 z-10 flex min-h-screen flex-col justify-center rounded-t-[3rem] bg-[#1f1b28] px-6 py-24 shadow-[0_-30px_60px_rgba(0,0,0,0.45)]">
          <div aria-hidden className="breathe right-[10%] top-[16%] h-[300px] w-[300px] bg-[#5b4be0]/20" style={{ animationDelay: "-2s" }} />
          <div className="relative mx-auto w-full max-w-5xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-mono text-xs uppercase tracking-[0.3em] text-[#8b7bf7]"
            >
              how it works
            </motion.p>
            <div className="mt-12 grid gap-12 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.15, ease: [0.33, 1, 0.68, 1] }}
                >
                  <p className="text-6xl font-extrabold text-white/10">{step.n}</p>
                  <h2 className="mt-3 text-2xl font-bold text-white">{step.title}</h2>
                  <p className="mt-2 leading-relaxed text-neutral-400">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SHEET 3: features on paper, slides over sheet 2 */}
        <section className="sticky top-0 z-20 flex min-h-screen flex-col justify-center rounded-t-[3rem] bg-background px-6 py-24 shadow-[0_-30px_60px_rgba(0,0,0,0.35)]">
          <div className="mx-auto w-full max-w-5xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-mono text-xs uppercase tracking-[0.3em] text-primary"
            >
              what you get
            </motion.p>
            <div className="mt-10 divide-y divide-border">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="flex items-start gap-5 py-7"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{feature.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SHEET 4: closing CTA, slides over everything, ends the stack */}
        <section className="relative z-30 flex min-h-[85vh] flex-col justify-center rounded-t-[3rem] px-6 py-24 shadow-[0_-30px_60px_rgba(0,0,0,0.5)]" style={{ backgroundColor: DUSK }}>
          <div aria-hidden className="breathe left-[30%] top-[20%] h-[340px] w-[340px] bg-[#5b4be0]/25" />
          <div className="relative mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <KaeMark size={64} className="mx-auto" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-8 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
            >
              Start remembering today.
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <Button size="lg" disabled={busy} className="mt-8 h-14 rounded-full bg-[#5b4be0] px-9 text-base text-white shadow-lg shadow-[#5b4be0]/25 hover:bg-[#6d5ef0]" onClick={login}>
                Get started free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <p className="mt-16 text-xs text-neutral-600">nkae · by Turk Labs · Built by Jewett Turkson</p>
          </div>
        </section>
      </div>
    </LayoutGroup>
  );
}

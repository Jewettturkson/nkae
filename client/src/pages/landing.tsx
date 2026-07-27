import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers, ListChecks, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import KaeWordmark, { AnimatedKaeMark, KaeMark } from "@/components/app/BrandMark";
import { firebaseReady, signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  { icon: Sparkles, title: "AI summaries", body: "Upload notes or chapters and get a clean summary with the key points pulled out for you." },
  { icon: Layers, title: "Smart flashcards", body: "Auto-generated cards on a spaced repetition schedule, so you review exactly what you are about to forget." },
  { icon: ListChecks, title: "Adaptive quizzes", body: "Multiple choice with explanations, generated from your own material. Active recall that sticks." },
  { icon: Timer, title: "Focus sessions", body: "Pomodoro blocks with focus ratings, streaks, and a heatmap of your study habit." },
];

const STEPS = [
  { n: "01", title: "Upload", body: "Paste your notes, a chapter, anything you need to know." },
  { n: "02", title: "Generate", body: "AI builds your summary, key points, flashcards, and a quiz in seconds." },
  { n: "03", title: "Remember", body: "Review on a schedule tuned to your memory. Nkae brings you back right before you forget." },
];

function IntroOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      exit={{ y: "-100%", transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#141216]"
    >
      <AnimatedKaeMark size={120} />
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 1.3, duration: 0.5 } }}
        className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500"
      >
        nkae · remembrance
      </motion.p>
    </motion.div>
  );
}

// Auto-flipping index card: the product demos itself.
function DemoCard() {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setFlipped((f) => !f), 3400);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <div className="perspective-1000 mx-auto w-full max-w-md">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
        className="preserve-3d relative aspect-[4/3] w-full"
      >
        <div className="backface-hidden index-card absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 p-8 pl-12 text-center shadow-2xl">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Question</p>
            <p className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-900">What is the time complexity of binary search?</p>
          </div>
        </div>
        <div className="backface-hidden index-card absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 p-8 pl-12 text-center shadow-2xl" style={{ transform: "rotateY(180deg)" }}>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Answer</p>
            <p className="text-xl font-semibold leading-snug text-gray-900 dark:text-gray-900">O(log n): the search space halves with each comparison.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const WORDS = ["Remember", "what", "you", "learn."];

export default function Landing() {
  const { toast } = useToast();
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("nkae-intro"));
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const introDone = () => {
    sessionStorage.setItem("nkae-intro", "1");
    setShowIntro(false);
  };

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

  const heroDelay = showIntro ? 2.3 : 0.1;

  return (
    <div className="min-h-screen bg-[#141216]">
      <AnimatePresence>{showIntro && <IntroOverlay onDone={introDone} />}</AnimatePresence>

      {/* HERO: dark ink, drifting aura, floating folds */}
      <div className="relative overflow-hidden">
        <div aria-hidden className="aura left-[-10%] top-[-20%] h-[480px] w-[480px] bg-[#5b4be0]/25" />
        <div aria-hidden className="aura right-[-15%] top-[30%] h-[420px] w-[420px] bg-[#7c6ff5]/15" style={{ animationDelay: "-6s" }} />
        <div aria-hidden className="aura bottom-[-30%] left-[30%] h-[380px] w-[380px] bg-[#ffd44d]/8" style={{ animationDelay: "-12s" }} />
        {[
          { left: "8%", top: "22%", size: 22, delay: "0s" },
          { left: "85%", top: "16%", size: 16, delay: "-2s" },
          { left: "76%", top: "68%", size: 26, delay: "-4s" },
          { left: "14%", top: "74%", size: 14, delay: "-5.5s" },
        ].map((fold, i) => (
          <svg
            key={i}
            aria-hidden
            className="fold-float absolute opacity-20"
            style={{ left: fold.left, top: fold.top, animationDelay: fold.delay }}
            width={fold.size}
            height={fold.size}
            viewBox="0 0 16 16"
          >
            <path d="M2 2 h10 l-10 12 Z" fill="#ffd44d" />
          </svg>
        ))}

        {/* nav */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: heroDelay, duration: 0.6 } }}
          className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
        >
          <span className="flex items-center gap-2.5">
            <KaeMark size={34} />
            <KaeWordmark dark className="text-2xl" />
          </span>
          <Button variant="outline" className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={login}>
            Sign in
          </Button>
        </motion.header>

        {/* hero content */}
        <main className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-28 pt-14 md:grid-cols-2 md:pt-20">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
              {WORDS.map((word, i) => (
                <span key={word} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span
                    initial={{ y: "110%" }}
                    animate={{ y: 0, transition: { delay: heroDelay + i * 0.09, duration: 0.7, ease: [0.33, 1, 0.68, 1] } }}
                    className={`inline-block pr-3 ${word === "Remember" ? "text-[#ffd44d]" : ""}`}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: heroDelay + 0.45, duration: 0.6 } }}
              className="mt-6 max-w-md text-lg leading-relaxed text-neutral-400"
            >
              Nkae is Twi for remembrance. Turn your notes into summaries, flashcards, and quizzes
              with AI, then come back at exactly the right moment.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: heroDelay + 0.6, duration: 0.6 } }}
              className="mt-9"
            >
              <Button size="lg" disabled={busy} className="h-14 rounded-full bg-[#5b4be0] px-8 text-base text-white hover:bg-[#6d5ef0]" onClick={login}>
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
            initial={{ opacity: 0, y: 40, rotate: 3 }}
            animate={{ opacity: 1, y: 0, rotate: 0, transition: { delay: heroDelay + 0.5, duration: 0.8, ease: [0.33, 1, 0.68, 1] } }}
          >
            <DemoCard />
            <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
              Your notes become this, automatically
            </p>
          </motion.div>
        </main>
      </div>

      {/* HOW IT WORKS + FEATURES: light paper sheet */}
      <div className="rounded-t-[2.5rem] bg-background">
        <section className="mx-auto max-w-6xl px-6 pb-8 pt-20">
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <p className="font-mono text-sm text-primary">{step.n}</p>
                <h2 className="mt-2 border-t border-border pt-4 text-2xl font-bold text-foreground">{step.title}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20 rounded-3xl bg-[#141216] p-10 text-center md:p-14"
          >
            <KaeMark size={56} className="mx-auto" />
            <h2 className="mt-6 text-3xl font-extrabold text-white md:text-4xl">Start remembering today.</h2>
            <Button size="lg" disabled={busy} className="mt-7 h-13 rounded-full bg-[#5b4be0] px-8 text-white hover:bg-[#6d5ef0]" onClick={login}>
              Get started free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </section>

        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          nkae · by Turk Labs · Built by Jewett Turkson
        </footer>
      </div>
    </div>
  );
}

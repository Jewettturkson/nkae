import { motion } from "framer-motion";
import { ArrowRight, Layers, ListChecks, Sparkles, Timer } from "lucide-react";
import KaeWordmark from "@/components/app/BrandMark";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { firebaseReady, signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI summaries",
    body: "Upload notes or chapters and get a clean summary with the key points pulled out for you.",
  },
  {
    icon: Layers,
    title: "Smart flashcards",
    body: "Auto-generated cards on a spaced repetition schedule, so you review exactly what you are about to forget.",
  },
  {
    icon: ListChecks,
    title: "Adaptive quizzes",
    body: "Multiple choice with explanations, generated from your own material. Active recall that actually sticks.",
  },
  {
    icon: Timer,
    title: "Focus sessions",
    body: "Pomodoro and timed blocks with focus ratings, streaks, and a heatmap of your study habit.",
  },
];

export default function Landing() {
  const { toast } = useToast();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <p className="flex items-center text-2xl">
          <KaeWordmark />
        </p>
        <Button variant="outline" className="rounded-full" onClick={login}>
          Sign in
        </Button>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 text-center md:pt-24">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          className="display text-5xl leading-[1.08] text-foreground md:text-7xl"
        >
          Learn <em className="highlight not-italic">smarter</em>,
          <br />
          not harder.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          Turn your notes into summaries, flashcards, and quizzes with AI, then study them with
          methods that science says actually work.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-9"
        >
          <Button size="lg" disabled={busy} className="h-14 rounded-full px-8 text-base" onClick={login}>
            Continue with Google <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <button
            type="button"
            className="mx-auto mt-3 block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => setShowEmail((v) => !v)}
          >
            Use email instead
          </button>
          {showEmail && (
            <form onSubmit={emailAuth} className="mx-auto mt-4 flex max-w-sm flex-col gap-2">
              <input
                type="email" required placeholder="name@school.edu" value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-xl border border-border bg-card px-4 text-sm"
                aria-label="Email"
              />
              <input
                type="password" required minLength={6} placeholder="Password (6+ characters)" value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-xl border border-border bg-card px-4 text-sm"
                aria-label="Password"
              />
              <Button type="submit" disabled={busy} className="h-11 rounded-xl">
                Sign in or create account
              </Button>
            </form>
          )}
          <p className="mt-3 text-xs text-muted-foreground">No credit card. Your notes stay yours.</p>
        </motion.div>

        {/* features */}
        <div className="mt-20 grid gap-4 text-left sm:grid-cols-2">
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
              <h2 className="mt-4 font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        nkae · by Turk Labs · Built by Jewett Turkson
      </footer>
    </div>
  );
}

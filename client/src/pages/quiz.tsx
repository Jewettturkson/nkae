import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, ListChecks, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type QuizQuestion = {
  id: number;
  question: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
};

export default function Quiz() {
  const { data: questions = [], isLoading } = useQuery<QuizQuestion[]>({ queryKey: ["/api/quiz-questions"] });
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ListChecks className="mx-auto mb-4 h-10 w-10 text-primary/50" />
        <h1 className="text-xl font-semibold text-foreground">No quiz questions yet</h1>
        <p className="mt-2 text-muted-foreground">Upload study material and generate a quiz to test yourself.</p>
        <Button className="mt-6" onClick={() => (window.location.href = "/materials/new")}>Upload material</Button>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-6xl font-black text-primary">{pct}%</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {pct >= 80 ? "Excellent work!" : pct >= 50 ? "Solid, keep going." : "Tough one. Review and retry."}
        </h1>
        <p className="mt-2 text-muted-foreground">{score} of {questions.length} correct.</p>
        <Button
          className="mt-8"
          onClick={() => {
            setIndex(0);
            setScore(0);
            setSelected(null);
            setFinished(false);
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Retake quiz
        </Button>
      </div>
    );
  }

  const q = questions[index];
  const answered = selected !== null;
  const isCorrect = selected === q.correctAnswer;

  const next = () => {
    if (index + 1 >= questions.length) setFinished(true);
    else setIndex((i) => i + 1);
    setSelected(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {index + 1} of {questions.length}</span>
        <span>{score} correct</span>
      </div>
      <Progress value={(index / questions.length) * 100} className="mb-8" />

      <motion.div key={q.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-semibold leading-relaxed text-foreground">{q.question}</h1>
        <div className="mt-6 space-y-3">
          {(q.options || []).map((option) => {
            let style = "border-border bg-card hover:border-primary/50 hover:bg-primary/10";
            if (answered) {
              if (option === q.correctAnswer) style = "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              else if (option === selected) style = "border-destructive/40 bg-destructive/10 text-destructive";
              else style = "border-border bg-card opacity-60";
            }
            return (
              <button
                key={option}
                type="button"
                disabled={answered}
                onClick={() => {
                  setSelected(option);
                  if (option === q.correctAnswer) setScore((s) => s + 1);
                }}
                className={`w-full rounded-xl border p-4 text-left font-medium transition-colors ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {answered && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-xl border border-primary/20 bg-primary/10 p-4">
            <p className="font-semibold text-foreground">{isCorrect ? "Correct!" : `Correct answer: ${q.correctAnswer}`}</p>
            {q.explanation ? <p className="mt-1 text-sm text-muted-foreground">{q.explanation}</p> : null}
            <Button className="mt-4" onClick={next}>
              {index + 1 >= questions.length ? "See results" : "Next question"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

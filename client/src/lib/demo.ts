// Demo mode: when built with VITE_DEMO=1, intercepts fetch("/api/...") and
// serves seeded data so the full app can be previewed statically,
// with no database, auth server, or OpenAI key.

export const DEMO = import.meta.env.VITE_DEMO === "1";

const demoUser = {
  id: "demo-user",
  email: "demo@nkae.study",
  firstName: "Demo",
  lastName: "Student",
  profileImageUrl: null,
  university: "Wilmington University",
  major: "Computer Science",
  graduationYear: 2028,
  bio: "Previewing PrepPal AI in demo mode.",
};

const subjects = [
  { id: 1, name: "Biology", color: "#22c55e", userId: "demo-user" },
  { id: 2, name: "Computer Science", color: "#6366f1", userId: "demo-user" },
  { id: 3, name: "Calculus", color: "#f59e0b", userId: "demo-user" },
];

const materials = [
  { id: 1, subjectId: 1, userId: "demo-user", title: "Cell Structure & Organelles", content: "", summary: "Cells are the fundamental unit of life. Eukaryotic cells contain membrane-bound organelles: the nucleus stores DNA, mitochondria produce ATP through cellular respiration, ribosomes synthesize proteins, and the endoplasmic reticulum transports materials.", createdAt: "2026-07-20T10:00:00Z" },
  { id: 2, subjectId: 2, userId: "demo-user", title: "Big-O Notation & Complexity", content: "", summary: "Big-O notation describes the upper bound of an algorithm's growth rate. O(1) is constant, O(log n) logarithmic (binary search), O(n) linear, O(n log n) typical of efficient sorts, and O(n²) quadratic (nested loops).", createdAt: "2026-07-22T15:30:00Z" },
  { id: 3, subjectId: 3, userId: "demo-user", title: "Derivatives & Chain Rule", content: "", summary: "The derivative measures instantaneous rate of change. The chain rule handles composite functions: d/dx f(g(x)) = f'(g(x)) · g'(x). Common derivatives: d/dx xⁿ = nxⁿ⁻¹, d/dx sin x = cos x.", createdAt: "2026-07-24T09:15:00Z" },
];

const flashcards = [
  { id: 1, studyMaterialId: 1, userId: "demo-user", front: "What organelle produces ATP?", back: "The mitochondria, through cellular respiration. Often called the powerhouse of the cell.", difficulty: 1, correctStreak: 2, totalReviews: 4 },
  { id: 2, studyMaterialId: 1, userId: "demo-user", front: "What is the function of ribosomes?", back: "Protein synthesis: they translate mRNA into chains of amino acids.", difficulty: 2, correctStreak: 0, totalReviews: 1 },
  { id: 3, studyMaterialId: 2, userId: "demo-user", front: "What is the time complexity of binary search?", back: "O(log n): the search space halves with each comparison.", difficulty: 1, correctStreak: 3, totalReviews: 5 },
  { id: 4, studyMaterialId: 2, userId: "demo-user", front: "What complexity class is a typical efficient sorting algorithm?", back: "O(n log n), e.g. merge sort and heapsort.", difficulty: 2, correctStreak: 1, totalReviews: 2 },
  { id: 5, studyMaterialId: 3, userId: "demo-user", front: "State the chain rule.", back: "d/dx f(g(x)) = f'(g(x)) · g'(x)", difficulty: 3, correctStreak: 0, totalReviews: 0 },
  { id: 6, studyMaterialId: 3, userId: "demo-user", front: "What is d/dx sin x?", back: "cos x", difficulty: 1, correctStreak: 4, totalReviews: 6 },
];

const quizQuestions = [
  { id: 1, studyMaterialId: 1, userId: "demo-user", question: "Which organelle stores the cell's genetic material?", options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi apparatus"], correctAnswer: "Nucleus", explanation: "The nucleus houses DNA and coordinates cell activities.", difficulty: 1 },
  { id: 2, studyMaterialId: 2, userId: "demo-user", question: "Which of these has O(log n) time complexity?", options: ["Linear scan", "Binary search", "Bubble sort", "Nested loop join"], correctAnswer: "Binary search", explanation: "Binary search halves the search space each step.", difficulty: 1 },
  { id: 3, studyMaterialId: 2, userId: "demo-user", question: "What is the complexity of two nested loops over n items?", options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], correctAnswer: "O(n²)", explanation: "Each of n outer iterations runs n inner iterations.", difficulty: 2 },
  { id: 4, studyMaterialId: 3, userId: "demo-user", question: "What is d/dx of x³?", options: ["x²", "3x²", "3x", "x³/3"], correctAnswer: "3x²", explanation: "Power rule: d/dx xⁿ = nxⁿ⁻¹.", difficulty: 1 },
  { id: 5, studyMaterialId: 1, userId: "demo-user", question: "Where does protein synthesis occur?", options: ["Ribosomes", "Lysosomes", "Vacuoles", "Cell wall"], correctAnswer: "Ribosomes", explanation: "Ribosomes translate mRNA into proteins.", difficulty: 2 },
];

const heatmapDays = Array.from({ length: 84 }, (_, i) => {
  const wave = Math.sin(i / 5) * 25 + 25;
  const noise = (i * 37) % 53;
  return i % 9 === 0 ? 0 : Math.max(0, Math.round((wave + noise) / 2));
});

const analytics = {
  todayStats: { totalMinutes: 47, sessionsCompleted: 2, flashcardsReviewed: 12, quizzesCompleted: 1 },
  dueFlashcardsCount: flashcards.length,
  streakDays: 6,
  weeklyGoalMinutes: 300,
  weeklyMinutes: [32, 45, 20, 60, 38, 47, 0],
  heatmap: heatmapDays,
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function installDemo() {
  if (!DEMO) return;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("/api/")) return realFetch(input, init);
    const method = (init?.method || "GET").toUpperCase();
    await new Promise((r) => setTimeout(r, 150)); // simulate latency

    if (url.startsWith("/api/auth/user")) return json(demoUser);
    if (url.startsWith("/api/subjects")) return method === "POST" ? json({ id: 99, ...JSON.parse(String(init?.body || "{}")) }, 201) : json(subjects);
    const materialMatch = url.match(/^\/api\/study-materials\/(\d+)$/);
    if (materialMatch) {
      const found = materials.find((m) => m.id === Number(materialMatch[1]));
      return found ? json({ ...found, keyPoints: ["Understand the core structures", "Memorize the key formulas", "Practice with generated questions"] }) : json({ message: "not found" }, 404);
    }
    if (url.includes("/generate-ai-content")) return json({ flashcardsCreated: 8, quizQuestionsCreated: 5 });
    if (url.startsWith("/api/study-materials")) return method === "POST" ? json(materials[0], 201) : json(materials);
    if (url.startsWith("/api/flashcards") && url.includes("/review")) return json({ ok: true });
    if (url.startsWith("/api/flashcards/generate")) return json(flashcards.slice(0, 3), 201);
    if (url.startsWith("/api/flashcards")) return json(flashcards);
    if (url.startsWith("/api/quiz-questions/generate")) return json(quizQuestions.slice(0, 3), 201);
    if (url.startsWith("/api/quiz-questions")) return json(quizQuestions);
    if (url.startsWith("/api/study-sessions")) return json(method === "POST" ? { id: 1 } : []);
    if (url.startsWith("/api/study-goals")) return json([]);
    if (url.startsWith("/api/analytics/dashboard")) return json(analytics);
    if (url.startsWith("/api/profile")) return json(demoUser);
    if (url.startsWith("/api/login") || url.startsWith("/api/logout")) return json({ ok: true });
    return json({ message: "demo: not found" }, 404);
  };
}

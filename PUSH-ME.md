# Publish PrepPal AI to GitHub

```bash
cd preppal-ai
git init && git add -A
git commit -m "PrepPal AI: full-stack AI study assistant (React, Express, Drizzle, OpenAI)"
# create a repo named preppal-ai on github.com/new (private first), then:
git remote add origin https://github.com/Jewettturkson/preppal-ai.git
git push -u origin main
```

Safe to make public: no secrets are committed (.env excluded, keys read from environment).
After pushing: add description "AI study assistant — summaries, flashcards, adaptive quizzes. React + Express + Drizzle + OpenAI", topics `react` `typescript` `openai` `drizzle` `express`, and pin it next to project-aequitas.

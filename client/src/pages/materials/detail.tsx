import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Layers, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Material = {
  id: number;
  title: string;
  summary: string | null;
  keyPoints: string[] | null;
  content: string | null;
  createdAt: string;
};

export default function MaterialDetail() {
  const [, params] = useRoute("/materials/:id");
  const id = params?.id;
  const { data: material, isLoading } = useQuery<Material>({
    queryKey: [`/api/study-materials/${id}`],
    enabled: !!id && id !== "new",
  });

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!material) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground">Material not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-foreground">{material.title}</h1>

      {material.summary ? (
        <Card className="mt-8">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="leading-relaxed text-foreground/90">{material.summary}</CardContent>
        </Card>
      ) : null}

      {material.keyPoints && material.keyPoints.length > 0 ? (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-foreground/90">
              {material.keyPoints.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/100" />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/flashcards">
          <Button className="w-full" size="lg"><Layers className="mr-2 h-4 w-4" /> Review flashcards</Button>
        </Link>
        <Link href="/quiz">
          <Button className="w-full" size="lg" variant="outline"><ListChecks className="mr-2 h-4 w-4" /> Take the quiz</Button>
        </Link>
      </div>
    </div>
  );
}

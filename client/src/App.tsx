import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { DEMO } from "@/lib/demo";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import NewMaterial from "@/pages/materials/new";
import Flashcards from "@/pages/flashcards";
import Quiz from "@/pages/quiz";
import Timer from "@/pages/timer";
import MaterialDetail from "@/pages/materials/detail";
import Concepts from "@/pages/concepts";
import AppNav from "@/components/app/AppNav";
import { useAuth } from "@/hooks/useAuth";

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <>
      <AppNav />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/flashcards" component={Flashcards} />
        <Route path="/quiz" component={Quiz} />
        <Route path="/profile" component={Profile} />
        <Route path="/materials/new" component={NewMaterial} />
        <Route path="/materials/:id" component={MaterialDetail} />
        <Route path="/timer" component={Timer} />
        <Route path="/concepts" component={Concepts} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {DEMO ? (
          <WouterRouter hook={useHashLocation}>
            <AppRoutes />
          </WouterRouter>
        ) : (
          <AppRoutes />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

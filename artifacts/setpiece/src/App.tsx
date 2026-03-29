import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import TeamDetail from "./pages/TeamDetail";
import SetPieceEditor from "./pages/SetPieceEditor";
import PlayerPWA from "./pages/PlayerPWA";
import PlayerQuiz from "./pages/PlayerQuiz";
import NotFound from "./pages/not-found";

// The generated Orval hooks use customFetch which relies on the global fetch.
// Set up React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public / Auth */}
      <Route path="/" component={Landing} />
      
      {/* Coach Dashboard (Protected via API returning null user) */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/teams/:teamId" component={TeamDetail} />
      <Route path="/teams/:teamId/set-pieces/:setPieceId/editor" component={SetPieceEditor} />
      
      {/* Player View (Mobile PWA accessible via token) */}
      <Route path="/p/:shareToken" component={PlayerPWA} />
      <Route path="/p/:shareToken/quiz" component={PlayerQuiz} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

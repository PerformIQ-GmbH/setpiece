import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TeamDashboard from "./pages/TeamDashboard";
import Players from "./pages/Players";
import Templates from "./pages/Templates";
import SetPieceEditor from "./pages/SetPieceEditor";
import Matchdays from "./pages/Matchdays";
import MatchdayDetail from "./pages/MatchdayDetail";
import Readiness from "./pages/Readiness";
import GhostMode from "./pages/GhostMode";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import PlayerPWA from "./pages/PlayerPWA";
import PlayerQuiz from "./pages/PlayerQuiz";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/not-found";
import { InstallPrompt } from "./components/InstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/teams/:teamId" component={TeamDashboard} />
      <Route path="/teams/:teamId/players" component={Players} />
      <Route path="/teams/:teamId/templates" component={Templates} />
      <Route path="/teams/:teamId/set-pieces/:setPieceId/editor" component={SetPieceEditor} />
      <Route path="/teams/:teamId/matchdays" component={Matchdays} />
      <Route path="/teams/:teamId/matchdays/:matchdayId" component={MatchdayDetail} />
      <Route path="/teams/:teamId/readiness" component={Readiness} />
      <Route path="/teams/:teamId/ghost/:setPieceId" component={GhostMode} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/settings" component={Settings} />
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
          <AppRouter />
          <InstallPrompt />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

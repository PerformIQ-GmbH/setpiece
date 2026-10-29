import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { DemoProvider } from "@/contexts/DemoContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/not-found";
import { InstallPrompt } from "./components/InstallPrompt";

import { Contact, Privacy } from "./pages/PublicInfo";
import { PublicFooter } from "./components/PublicLayout";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const Players = lazy(() => import("./pages/Players"));
const Templates = lazy(() => import("./pages/Templates"));
const SetPieceEditor = lazy(() => import("./pages/SetPieceEditor"));
const Matchdays = lazy(() => import("./pages/Matchdays"));
const MatchdayDetail = lazy(() => import("./pages/MatchdayDetail"));
const Readiness = lazy(() => import("./pages/Readiness"));
const GhostMode = lazy(() => import("./pages/GhostMode"));
const Settings = lazy(() => import("./pages/Settings"));
const PlayerPWA = lazy(() => import("./pages/PlayerPWA"));
const PlayerQuiz = lazy(() => import("./pages/PlayerQuiz"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const DemoEntry = lazy(() => import("./pages/DemoEntry"));
const DemoTeamDashboard = lazy(() => import("./pages/DemoTeamDashboard"));
const DemoPlayers = lazy(() => import("./pages/DemoPlayers"));
const DemoSetPieces = lazy(() => import("./pages/DemoSetPieces"));
const DemoSetPieceViewer = lazy(() => import("./pages/DemoSetPieceViewer"));
const DemoMatchdays = lazy(() => import("./pages/DemoMatchdays"));
const DemoMatchdayDetail = lazy(() => import("./pages/DemoMatchdayDetail"));
const DemoReadiness = lazy(() => import("./pages/DemoReadiness"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function DemoWrap({ component: C }: { component: React.ComponentType }) {
  return <DemoProvider><C /></DemoProvider>;
}

function PlayerPublicLinks() {
  const [location] = useLocation();
  return location.startsWith('/p/') || location.startsWith('/join/') ? <PublicFooter /> : null;
}

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
      <Route path="/kontakt" component={Contact} />
      <Route path="/datenschutz" component={Privacy} />
      <Route path="/settings" component={Settings} />
      <Route path="/join/:token" component={JoinTeam} />
      <Route path="/p/:shareToken" component={PlayerPWA} />
      <Route path="/p/:shareToken/quiz" component={PlayerQuiz} />

      <Route path="/demo">{() => <DemoWrap component={DemoEntry} />}</Route>
      <Route path="/demo/teams/:teamId">{() => <DemoWrap component={DemoTeamDashboard} />}</Route>
      <Route path="/demo/teams/:teamId/players">{() => <DemoWrap component={DemoPlayers} />}</Route>
      <Route path="/demo/teams/:teamId/templates">{() => <DemoWrap component={DemoSetPieces} />}</Route>
      <Route path="/demo/teams/:teamId/set-pieces/:setPieceId/editor">{() => <DemoWrap component={DemoSetPieceViewer} />}</Route>
      <Route path="/demo/teams/:teamId/matchdays">{() => <DemoWrap component={DemoMatchdays} />}</Route>
      <Route path="/demo/teams/:teamId/matchdays/:matchdayId">{() => <DemoWrap component={DemoMatchdayDetail} />}</Route>
      <Route path="/demo/teams/:teamId/readiness">{() => <DemoWrap component={DemoReadiness} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConfirmProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Suspense fallback={<div role="status" aria-live="polite" aria-busy="true" className="flex min-h-[60vh] items-center justify-center bg-background px-5 text-center text-foreground"><p className="text-base">Seite wird geladen …</p></div>}>
              <AppRouter />
            </Suspense>
            <PlayerPublicLinks />
            <InstallPrompt />
          </WouterRouter>
          <Toaster />
        </ConfirmProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

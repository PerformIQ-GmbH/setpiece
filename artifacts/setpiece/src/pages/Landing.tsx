import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Move, CheckCircle, Shield, Zap } from 'lucide-react';
import { useGetCurrentAuthUser } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  React.useEffect(() => {
    if (auth?.user) {
      setLocation('/dashboard');
    }
  }, [auth, setLocation]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
        <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="Tactical background" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Move className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">SETPIECE</span>
        </div>
        <Button onClick={handleLogin} className="rounded-full px-6 font-semibold" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Coach Login'}
        </Button>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-semibold mb-6 inline-block">
            Built by PerformIQ
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Execute Every Set Piece <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">With Precision.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The ultimate tactical editor for football coaches. Design routines, assign roles, track player readiness via mobile quizzes, and dominate matchday.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-full bg-card/50 backdrop-blur-sm hover:bg-card">
              View Demo
            </Button>
          </div>
        </motion.div>

        {/* Feature grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full"
        >
          {[
            { icon: Move, title: "Tactical Editor", desc: "Design complex routines on an interactive digital pitch." },
            { icon: Zap, title: "Mobile Ready", desc: "Players get scoped access via QR codes—no app install required." },
            { icon: Shield, title: "Readiness Tracking", desc: "Ensure player comprehension with automated tap-zone quizzes." }
          ].map((f, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 text-left flex flex-col items-start gap-4 hover:border-primary/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}

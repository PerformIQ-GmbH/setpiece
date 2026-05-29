import { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetQuizQuestions, useSubmitQuiz } from '@workspace/api-client-react';
import { Loader2, CheckCircle2, XCircle, ChevronRight, ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function PlayerQuiz() {
  const { toast } = useToast();
  const [, params] = useRoute('/p/:shareToken/quiz');
  const shareToken = params?.shareToken || '';

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const setPieceId = urlParams.get('setPieceId') || '';
  const playerId = urlParams.get('playerId') || '';
  const roleId = urlParams.get('roleId') || '';

  const { data: quizData, isLoading, error } = useGetQuizQuestions(shareToken, { setPieceId, playerId: playerId || undefined });
  const submitQuiz = useSubmitQuiz();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number; correct?: number; total: number } | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  if (error || !quizData || !quizData.questions?.length) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-3">Quiz Unavailable</h1>
        <p className="text-muted-foreground mb-8 text-sm max-w-xs">No quiz questions are available for this set piece.</p>
        <Link href={`/p/${shareToken}`}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Set Pieces</Button>
        </Link>
      </div>
    );
  }

  const questions = quizData.questions;
  const currentQ = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const hasAnswered = currentQ?.id in answers;

  const handleAnswer = (answer: unknown) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: answer }));
  };

  const handleNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => {
      let normalised = answer;
      if (answer === 'yes') normalised = true;
      if (answer === 'no') normalised = false;
      return { questionId, answer: normalised };
    });
    try {
      const res = await submitQuiz.mutateAsync({
        shareToken,
        data: {
          playerId,
          setPieceId,
          roleId: roleId || undefined,
          answers: formattedAnswers,
        },
      });
      setResult(res);
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not submit quiz, please try again.',
        variant: 'destructive',
      });
    }
  };

  if (result) {
    const correctCount = result.correct ?? Math.round((result.score / 100) * result.total);
    const isPassed = result.passed;
    // TODO: needs per-question result in quiz API
    // The quiz API only returns the aggregate { passed, score, correct, total }
    // and strips correctAnswer / per-question correctness, so we cannot render a
    // per-question review list here without inventing data.

    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-white">
        <div className="max-w-md mx-auto min-h-screen bg-[var(--surface-1)] flex flex-col items-center justify-center p-8 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="mb-8"
          >
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto ${isPassed ? 'bg-primary/15' : 'bg-destructive/10'}`}>
              {isPassed ? (
                <Trophy className="w-14 h-14 text-primary" />
              ) : (
                <XCircle className="w-14 h-14 text-destructive" />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-display font-bold mb-3">
              {isPassed ? 'Quiz Passed!' : 'Not Quite...'}
            </h1>

            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-primary">{result.score}%</p>
                <p className="text-xs text-muted-foreground mt-1">Score</p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <p className="text-4xl font-display font-bold text-white">{correctCount}<span className="text-muted-foreground text-lg">/{result.total}</span></p>
                <p className="text-xs text-muted-foreground mt-1">Correct</p>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mb-8 ${isPassed ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
              {isPassed ? (
                <><CheckCircle2 className="w-4 h-4" /> Marked as quiz-ready</>
              ) : (
                <><RotateCcw className="w-4 h-4" /> Review and try again</>
              )}
            </div>
          </motion.div>

          <div className="w-full space-y-3">
            <Link href={`/p/${shareToken}`} className="block">
              <Button className="w-full py-5 rounded-2xl text-base">
                Back to Set Pieces
              </Button>
            </Link>
            {!isPassed && (
              <Button
                variant="outline"
                className="w-full py-5 rounded-2xl"
                onClick={() => {
                  setResult(null);
                  setCurrentIdx(0);
                  setAnswers({});
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Retry Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const progressPct = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-white">
      <div className="max-w-md mx-auto min-h-screen bg-[var(--surface-1)] flex flex-col">
        <header className="p-4 border-b border-white/[0.06] bg-[var(--surface-2)] flex items-center gap-4 sticky top-0 z-10 backdrop-blur-xl">
          <Link href={`/p/${shareToken}`}>
            <button className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center transition-colors hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h2 className="font-display font-bold text-lg">Readiness Quiz</h2>
            <p className="text-xs text-muted-foreground">Question {currentIdx + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {questions.map((_: unknown, i: number) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < currentIdx ? 'bg-primary' :
                  i === currentIdx ? 'bg-primary w-4' :
                  'bg-white/10'
                }`}
              />
            ))}
          </div>
        </header>

        <div className="w-full h-1 bg-white/[0.04]">
          <motion.div
            className="h-1 bg-gradient-to-r from-primary to-emerald-400 rounded-r-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        <main className="flex-1 p-6 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 self-start">
                {currentQ.type === 'tap_zone' ? 'Tap Zone' : 'Yes / No'}
              </div>

              <h3 className="text-xl font-display font-bold mb-8 leading-snug">{currentQ.prompt}</h3>

              {currentQ.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-4">
                  {['yes', 'no'].map(val => (
                    <button
                      key={val}
                      onClick={() => handleAnswer(val)}
                      className={`p-6 rounded-2xl border-2 text-lg font-bold capitalize transition-all active:scale-[0.97] ${
                        answers[currentQ.id] === val
                          ? 'bg-primary/15 border-primary text-white shadow-lg shadow-primary/10'
                          : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 text-white/80'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {currentQ.type === 'tap_zone' && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-sm text-muted-foreground mb-4">Tap the approximate area on the pitch</p>
                  <div className="relative aspect-[2/3] bg-emerald-900/80 rounded-xl overflow-hidden border border-white/15">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full cursor-crosshair"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                        const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                        handleAnswer({ x, y });
                      }}
                    >
                      <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" fill="none">
                        <rect x="2" y="2" width="96" height="96" />
                        <rect x="20" y="2" width="60" height="25" />
                        <rect x="35" y="2" width="30" height="10" />
                        <circle cx="50" cy="100" r="15" />
                      </g>
                      {answers[currentQ.id] != null && typeof answers[currentQ.id] === 'object' ? (
                        <>
                          <circle
                            cx={(answers[currentQ.id] as { x: number; y: number }).x}
                            cy={(answers[currentQ.id] as { x: number; y: number }).y}
                            r="6"
                            fill="var(--color-primary)"
                            fillOpacity="0.2"
                            stroke="var(--color-primary)"
                            strokeWidth="0.5"
                          />
                          <circle
                            cx={(answers[currentQ.id] as { x: number; y: number }).x}
                            cy={(answers[currentQ.id] as { x: number; y: number }).y}
                            r="3"
                            fill="var(--color-primary)"
                            stroke="white"
                            strokeWidth="1"
                          />
                        </>
                      ) : null}
                    </svg>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="p-5 pb-8" style={{ background: 'linear-gradient(to top, var(--surface-0) 50%, transparent)' }}>
          <Button
            onClick={handleNext}
            disabled={!hasAnswered || submitQuiz.isPending}
            className="w-full py-5 text-base rounded-2xl premium-glow"
          >
            {submitQuiz.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : isLast ? (
              'Submit Quiz'
            ) : (
              <>Next Question <ChevronRight className="w-5 h-5 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

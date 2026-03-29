import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetQuizQuestions, useSubmitQuiz } from '@workspace/api-client-react';
import { Loader2, CheckCircle2, XCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';

export default function PlayerQuiz() {
  const [, params] = useRoute('/p/:shareToken/quiz');
  const shareToken = params?.shareToken || '';

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const setPieceId = urlParams.get('setPieceId') || '';
  const playerId = urlParams.get('playerId') || '';
  const roleId = urlParams.get('roleId') || '';

  const { data: quizData, isLoading, error } = useGetQuizQuestions(shareToken, { setPieceId });
  const submitQuiz = useSubmitQuiz();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number; total: number } | null>(null);

  if (isLoading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (error || !quizData || !quizData.questions?.length) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Quiz Unavailable</h1>
        <p className="text-muted-foreground mb-6">No quiz questions are available for this set piece.</p>
        <Link href={`/p/${shareToken}`}>
          <Button variant="outline" className="border-white/20"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Set Pieces</Button>
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
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
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
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="max-w-md mx-auto min-h-screen bg-[#111111] flex flex-col items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
            {result.passed ? (
              <CheckCircle2 className="w-24 h-24 text-primary mx-auto mb-6" />
            ) : (
              <XCircle className="w-24 h-24 text-destructive mx-auto mb-6" />
            )}
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">{result.passed ? 'Quiz Passed!' : 'Not Quite...'}</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Score: <span className="text-white font-bold">{result.score}/{result.total}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {result.passed ? 'Great work! You are now marked as quiz-ready.' : 'Review the set piece and try again.'}
          </p>
          <Link href={`/p/${shareToken}`}>
            <Button className="rounded-2xl px-8 py-6 text-lg">Back to Set Pieces</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-md mx-auto min-h-screen bg-[#111111] flex flex-col">
        <header className="p-4 border-b border-white/10 bg-[#1A1A1A] flex items-center gap-4 sticky top-0 z-10">
          <Link href={`/p/${shareToken}`}>
            <button className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Readiness Quiz</h2>
            <p className="text-xs text-muted-foreground">Question {currentIdx + 1} of {questions.length}</p>
          </div>
        </header>

        <div className="w-full bg-black/30 h-1">
          <div className="bg-primary h-1 transition-all duration-300" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>

        <main className="flex-1 p-6 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                {currentQ.type.replace('_', ' ')}
              </span>
              <h3 className="text-xl font-bold mb-8">{currentQ.prompt}</h3>

              {currentQ.type === 'multiple_choice' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        answers[currentQ.id] === option
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-[#1A1A1A] border-white/10 hover:border-white/30 text-white/90'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentQ.type === 'yes_no' && (
                <div className="grid grid-cols-2 gap-4">
                  {['yes', 'no'].map(val => (
                    <button
                      key={val}
                      onClick={() => handleAnswer(val)}
                      className={`p-6 rounded-xl border text-lg font-bold capitalize transition-all ${
                        answers[currentQ.id] === val
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-[#1A1A1A] border-white/10 hover:border-white/30 text-white/90'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {currentQ.type === 'tap_zone' && (
                <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-4">Tap the approximate area on the pitch</p>
                  <div className="relative aspect-[2/3] bg-emerald-900 rounded-lg overflow-hidden border border-white/20">
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
                      {answers[currentQ.id] && typeof answers[currentQ.id] === 'object' && (
                        <circle
                          cx={(answers[currentQ.id] as { x: number; y: number }).x}
                          cy={(answers[currentQ.id] as { x: number; y: number }).y}
                          r="4"
                          fill="var(--color-primary)"
                          stroke="white"
                          strokeWidth="1"
                        />
                      )}
                    </svg>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          <Button
            onClick={handleNext}
            disabled={!hasAnswered || submitQuiz.isPending}
            className="w-full py-6 text-lg rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {submitQuiz.isPending ? 'Submitting...' : isLast ? 'Submit Quiz' : 'Next Question'}
            {!isLast && <ChevronRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

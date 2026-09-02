#!/usr/bin/env python3
"""Enhance EnhancedMillionaireGame.tsx with premium effects"""
import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/components/livegames/EnhancedMillionaireGame.tsx"

with open(FILE, "r") as f:
    code = f.read()

# 1. Add showCelebrationRays state after shakeKey/questionKey states
old = 'const [questionKey, setQuestionKey] = useState(0);'
new = 'const [questionKey, setQuestionKey] = useState(0);\n  const [showCelebrationRays, setShowCelebrationRays] = useState(false);'
code = code.replace(old, new, 1)

# 2. Enhance handleAnswer - add mini confetti on correct, celebration rays on final win
old_confetti_win = '''if (currentLevel === (game?.total_questions || prizeStructure.length)) {
          setStatus('won');
          setShakeKey(k => k + 1);
          setFlashClass("game-flash-gold");
          setTimeout(() => setFlashClass(""), 800);
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.3, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] }), 200);
          setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.7, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] }), 400);
          setTimeout(() => {
            const end = Date.now() + 3000;
            const iv = setInterval(() => {
              if (Date.now() > end) return clearInterval(iv);
              confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
              confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
            }, 80);
          }, 600);'''

new_confetti_win = '''if (currentLevel === (game?.total_questions || prizeStructure.length)) {
          setStatus('won');
          setShakeKey(k => k + 1);
          setShowCelebrationRays(true);
          setFlashClass("game-flash-gold");
          setTimeout(() => setFlashClass(""), 1200);
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.55 } });
          setTimeout(() => confetti({ particleCount: 150, spread: 140, origin: { x: 0.2, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 150);
          setTimeout(() => confetti({ particleCount: 150, spread: 140, origin: { x: 0.8, y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a"] }), 300);
          setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.3 }, colors: ["#fbbf24", "#ffffff"], shapes: ["star"] }), 500);
          setTimeout(() => {
            const end = Date.now() + 4000;
            const iv = setInterval(() => {
              if (Date.now() > end) return clearInterval(iv);
              confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
              confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#ffffff"] });
            }, 60);
          }, 800);'''
code = code.replace(old_confetti_win, new_confetti_win, 1)

# 3. Add mini confetti burst on each correct answer (non-final)
old_correct = '''toast.success("Resposta Correta!");'''
new_correct = '''toast.success("Resposta Correta!");
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ["#22c55e", "#4ade80", "#ffffff"] });
          setTimeout(() => confetti({ particleCount: 20, spread: 40, origin: { x: 0.5, y: 0.6 }, colors: ["#22c55e", "#ffffff"] }), 150);'''
code = code.replace(old_correct, new_correct, 1)

# 4. Add celebration rays and extra effects on wrong answer
old_lost = '''} else {
        setStatus('lost');
        const safePrize = calculateSafePrize();'''
new_lost = '''} else {
        setStatus('lost');
        setShakeKey(k => k + 1);
        setTimeout(() => {
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, colors: ["#ef4444", "#991b1b"] });
        }, 500);
        const safePrize = calculateSafePrize();'''
code = code.replace(old_lost, new_lost, 1)

# 5. Enhance main wrapper - add celebration rays overlay
old_wrapper = '''{flashClass && <div className={\`fixed inset-0 z-[100] pointer-events-none ${flashClass}\`} />}
      <div className="game-particle game-particle-1"'''
new_wrapper = '''{flashClass && <div className={\`fixed inset-0 z-[100] pointer-events-none ${flashClass}\`} />}
      {showCelebrationRays && <div className="celebration-rays" />}
      <div className="game-particle game-particle-1"'''
code = code.replace(old_wrapper, new_wrapper, 1)

# 6. Enhance the question box - add urgent border glow when time is low
old_question_box = '''className="relative bg-black/60 backdrop-blur-xl border-2 border-primary/30 p-8 md:p-12 rounded-[2rem] text-center shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden"'''
new_question_box = '''className={\`relative bg-black/60 backdrop-blur-xl border-2 ${timeLeft <= 5 && !answered ? "border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]" : timeLeft <= 10 && !answered ? "border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.2)]" : "border-primary/30 shadow-[0_0_40px_rgba(0,0,0,0.5)]"} p-8 md:p-12 rounded-[2rem] text-center overflow-hidden\`}'''
code = code.replace(old_question_box, new_question_box, 1)

# 7. Enhance win overlay with win-overlay-enter class
old_win_overlay = '''className="text-center space-y-8 p-12 rounded-[3rem] border-2 border-white/10 bg-white/5"'''
new_win_overlay = '''className="text-center space-y-8 p-12 rounded-[3rem] border-2 border-white/10 bg-white/5 win-overlay-enter game-shimmer"'''
code = code.replace(old_win_overlay, new_win_overlay, 1)

# 8. Enhance lose overlay - add red glow
old_lose_circle = '''<div className="w-24 h-24 bg-red-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">'''
new_lose_circle = '''<motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="w-24 h-24 bg-red-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">'''
code = code.replace(old_lose_circle, new_lose_circle, 1)

# Close the motion.div for lose circle
old_lose_close = '''<XCircle className="w-12 h-12 text-white" />
                  </div>'''
new_lose_close = '''<XCircle className="w-12 h-12 text-white" />
                  </motion.div>'''
code = code.replace(old_lose_close, new_lose_close, 1)

# 9. Enhance the restart button with glow
old_restart = '''<Button size="lg" className="px-12 py-8 text-xl font-black rounded-full" onClick={restartGame}>TENTAR NOVAMENTE</Button>'''
new_restart = '''<Button size="lg" className="px-12 py-8 text-xl font-black rounded-full spin-btn-glow" onClick={restartGame}>TENTAR NOVAMENTE</Button>'''
code = code.replace(old_restart, new_restart, 1)

# 10. Reset celebration rays on restart
old_restart_fn = '''const restartGame = () => {
    setCurrentLevel(1);
    setStatus('playing');
    setAnswered(false);
    setSelectedAnswer(null);
    setDisabledOptions([]);
    setTimeLeft(game?.time_per_question || 30);
    setLifelinesUsed({});
  };'''
new_restart_fn = '''const restartGame = () => {
    setCurrentLevel(1);
    setStatus('playing');
    setAnswered(false);
    setSelectedAnswer(null);
    setDisabledOptions([]);
    setTimeLeft(game?.time_per_question || 30);
    setLifelinesUsed({});
    setShowCelebrationRays(false);
  };'''
code = code.replace(old_restart_fn, new_restart_fn, 1)

with open(FILE, "w") as f:
    f.write(code)

print("EnhancedMillionaireGame.tsx enhanced successfully!")

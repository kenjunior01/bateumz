#!/usr/bin/env python3
"""Enhance ChallengeRoulette.tsx with premium effects"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/components/livegames/ChallengeRoulette.tsx"

with open(FILE, "r") as f:
    code = f.read()

# 1. Add state variables for effects
old_states = '''  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [rotation, setRotation] = useState(0);'''
new_states = '''  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [rotation, setRotation] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashClass, setFlashClass] = useState("");
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);'''
code = code.replace(old_states, new_states, 1)

# 2. Enhance spin completion - add flash, shake, multi-stage confetti, dramatic reveal
old_spin_end = '''setSpinning(false);
        const segAngle = 360 / segments.length;
        const normalizedAngle = ((360 - (totalRotation % 360)) % 360 + 360) % 360;
        const idx = Math.floor(normalizedAngle / segAngle) % segments.length;
        setResult(segments[idx]);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        toast.success(`\u{1F3AF} Desafio: ${segments[idx].challenge_text}`);'''
new_spin_end = '''setSpinning(false);
        const segAngle = 360 / segments.length;
        const normalizedAngle = ((360 - (totalRotation % 360)) % 360 + 360) % 360;
        const idx = Math.floor(normalizedAngle / segAngle) % segments.length;
        setResult(segments[idx]);
        setTimeout(() => {
          setShakeKey(k => k + 1);
          setFlashClass("game-flash-gold");
          setTimeout(() => {
            setFlashClass("");
            setShowResult(true);
          }, 500);
        }, 200);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.3, y: 0.5 }, colors: ["#8b5cf6", "#ec4899", "#fbbf24", "#ffffff"] }), 200);
        setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.7, y: 0.5 }, colors: ["#8b5cf6", "#ec4899", "#fbbf24", "#ffffff"] }), 400);
        setTimeout(() => {
          const end = Date.now() + 2000;
          const iv = setInterval(() => {
            if (Date.now() > end) return clearInterval(iv);
            confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#8b5cf6", "#ec4899"] });
            confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#8b5cf6", "#ec4899"] });
          }, 80);
        }, 600);
        toast.success(`\u{1F3AF} Desafio: ${segments[idx].challenge_text}`);'''
code = code.replace(old_spin_end, new_spin_end, 1)

# 3. Reset showResult when spinning starts
old_spin_start = '''setSpinning(true);
    setResult(null);'''
new_spin_start = '''setSpinning(true);
    setResult(null);
    setShowResult(false);
    setFlashClass("");'''
code = code.replace(old_spin_start, new_spin_start, 1)

# 4. Enhance the wheel card wrapper with glow and flash
old_wheel_card = '''<Card>
            <CardContent className="flex flex-col items-center py-6">
              <canvas ref={canvasRef} width={320} height={320} className="max-w-full" />'''
new_wheel_card = '''<Card className={"relative overflow-hidden " + (spinning ? "neon-border-gold" : "")}>
            {flashClass && <div className={"absolute inset-0 z-10 pointer-events-none " + flashClass} />}
            <div className="game-particle game-particle-1" style={{ top: "10%", left: "5%" }} />
            <div className="game-particle game-particle-2" style={{ top: "20%", right: "10%" }} />
            <div className="game-particle game-particle-3" style={{ bottom: "15%", left: "15%" }} />
            <CardContent className="flex flex-col items-center py-6">
              <div className={"relative " + (spinning ? "wheel-glow-spinning" : "wheel-glow-idle")}>
                <canvas ref={canvasRef} width={320} height={320} className="max-w-full" />
              </div>'''
code = code.replace(old_wheel_card, new_wheel_card, 1)

# 5. Enhance spin button with glow
old_spin_btn = '''<Button\n                onClick={spin}\n                disabled={spinning || segments.length < 2}\n                className="mt-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-1.5 px-6"'''
new_spin_btn = '''<Button\n                onClick={spin}\n                disabled={spinning || segments.length < 2}\n                className={"mt-4 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white gap-1.5 px-6 " + (segments.length >= 2 && !spinning ? "spin-btn-glow" : "")}'''
code = code.replace(old_spin_btn, new_spin_btn, 1)

# 6. Enhance result reveal with dramatic animation
old_result = '''{result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center p-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30"
                >
                  <p className="text-[10px] text-muted-foreground uppercase">Desafio sorteado</p>
                  <p className="text-base font-extrabold">\u{1F3AF} {result.challenge_text}</p>
                </motion.div>
              )}'''
new_result = '''<AnimatePresence>
              {result && showResult && (
                <motion.div
                  key="result-reveal"
                  initial={{ opacity: 0, scale: 0.7, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 20 }}
                  className="mt-4 text-center p-4 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30 game-shimmer"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Desafio sorteado</p>
                  <p className="text-lg font-extrabold mt-1">\u{1F3AF} {result.challenge_text}</p>
                </motion.div>
              )}
            </AnimatePresence>'''
code = code.replace(old_result, new_result, 1)

# 7. Add AnimatePresence to imports if not already there
if 'AnimatePresence' not in code:
    code = code.replace('import { motion } from "framer-motion";', 'import { motion, AnimatePresence } from "framer-motion";')

# 8. Wrap the entire selected roulette section in a shakeKey div for screen shake
old_selected = '''{selectedId && (
        <div className="grid lg:grid-cols-2 gap-4">'''
new_selected = '''{selectedId && (
        <div key={shakeKey} className={"grid lg:grid-cols-2 gap-4 " + (shakeKey > 0 ? "game-screen-shake" : "")}>'''
code = code.replace(old_selected, new_selected, 1)

with open(FILE, "w") as f:
    f.write(code)

print("ChallengeRoulette.tsx enhanced successfully!")

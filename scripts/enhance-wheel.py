#!/usr/bin/env python3
import re

path = "/home/z/my-project/bateumz-cb2c44d1/src/components/livegames/PrizeWheel.tsx"
with open(path, "r") as f:
    content = f.read()

# 1. Enhance spin completion - add screen shake, flash, celebration, multi-confetti
old_spin_end = """        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setRotation(finalRotation);
          setSpinning(false);
          setResult(winner);
          onWin?.(winner);

          const landed = getSegmentAtPointer(finalRotation, prizes.length);
          if (landed !== winningIndex) {
            console.warn("Wheel alignment check:", { landed, winningIndex, segmentAngleDeg });
          }

          if (particleEffects && !isNoWinLabel(winner.label) && winner.rewardType !== "none") {
            fireConfetti(winner.effectType || defaultEffect || "confetti");
          }
        }"""

new_spin_end = """        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setRotation(finalRotation);
          setSpinning(false);

          const isWin = !isNoWinLabel(winner.label) && winner.rewardType !== "none";

          setShakeKey(prev => prev + 1);
          setFlashClass(isWin ? "game-flash-gold" : "game-flash-white");
          setTimeout(() => setFlashClass(""), 700);

          if (isWin) {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 2000);
          }

          setTimeout(() => {
            setResult(winner);
            onWin?.(winner);

            const landed = getSegmentAtPointer(finalRotation, prizes.length);
            if (landed !== winningIndex) {
              console.warn("Wheel alignment check:", { landed, winningIndex, segmentAngleDeg });
            }

            if (particleEffects && isWin) {
              fireConfetti(winner.effectType || defaultEffect || "confetti");
              setTimeout(() => fireConfetti("stars"), 300);
              if (winner.rewardValue) {
                setTimeout(() => {
                  const end = Date.now() + 2000;
                  const interval = setInterval(() => {
                    if (Date.now() > end) return clearInterval(interval);
                    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] });
                    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ["#fbbf24", "#f59e0b", "#ffffff"] });
                  }, 50);
                }, 500);
              }
            }
          }, 400);
        }"""

content = content.replace(old_spin_end, new_spin_end)

# 2. Enhance main wrapper - add shake, flash, celebration, particles
old_wrapper = """    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans"
         style={{ 
           backgroundColor: currentTheme.backgroundColor,
           backgroundImage: branding?.backgroundImageUrl ? `url(${branding.backgroundImageUrl})` : 'none',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           color: currentTheme.textColor
         }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />"""

new_wrapper = """    <div key={shakeKey} className={`min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans ${shakeKey > 0 ? (result && !isNoWinLabel(result.label) && result.rewardType !== "none" ? "game-screen-shake-intense" : "game-screen-shake") : ""}`}
         style={{ 
           backgroundColor: currentTheme.backgroundColor,
           backgroundImage: branding?.backgroundImageUrl ? `url(${branding.backgroundImageUrl})` : 'none',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           color: currentTheme.textColor
         }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {flashClass && <div className={`fixed inset-0 z-[100] pointer-events-none ${flashClass}`} />}
      {showCelebration && <div className="celebration-rays z-[90]" />}
      <div className="game-particle game-particle-1" style={{ top: '10%', left: '15%' }} />
      <div className="game-particle game-particle-2" style={{ top: '20%', right: '20%' }} />
      <div className="game-particle game-particle-3" style={{ bottom: '30%', left: '10%' }} />
      <div className="game-particle game-particle-4" style={{ top: '60%', right: '15%' }} />
      <div className="game-particle game-particle-5" style={{ bottom: '15%', right: '30%' }} />
      <div className="game-particle game-particle-6" style={{ top: '40%', left: '80%' }} />"""

content = content.replace(old_wrapper, new_wrapper)

# 3. Enhance pointer with bounce during spin and Flame icon
old_pointer = """          <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 drop-shadow-2xl">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-primary shadow-lg relative" style={{ borderColor: currentTheme.primaryColor }}>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent" style={{ borderTopColor: currentTheme.primaryColor }} />
              </div>
              <Sparkles className="w-6 h-6" style={{ color: currentTheme.primaryColor }} />
            </div>
          </div>"""

new_pointer = """          <div className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 drop-shadow-2xl ${spinning ? "wheel-pointer-bounce" : ""}`}>
            <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 shadow-lg relative ${spinning ? "neon-border-gold" : ""}`} style={{ borderColor: currentTheme.primaryColor }}>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent" style={{ borderTopColor: currentTheme.primaryColor }} />
              </div>
              {spinning ? (
                <Flame className="w-6 h-6 animate-pulse" style={{ color: currentTheme.primaryColor }} />
              ) : (
                <Sparkles className="w-6 h-6" style={{ color: currentTheme.primaryColor }} />
              )}
            </div>
          </div>"""

content = content.replace(old_pointer, new_pointer)

# 4. Enhance wheel container with glow effects
old_wheel_container = """          <div className="relative p-6 rounded-full bg-white/5 border-2 border-white/10 backdrop-blur-sm shadow-[0_0_80px_rgba(0,0,0,0.6)]" style={{ borderColor: `${currentTheme.primaryColor}40` }}>"""

new_wheel_container = """          <div className={`relative p-6 rounded-full bg-white/5 border-2 backdrop-blur-sm shadow-[0_0_80px_rgba(0,0,0,0.6)] ${spinning ? "wheel-glow-spinning neon-border-gold" : "wheel-glow-idle"}`} style={{ borderColor: `${currentTheme.primaryColor}40` }}>"""

content = content.replace(old_wheel_container, new_wheel_container)

# 5. Enhance spin button with glow
old_spin_btn = """                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full 
                flex flex-col items-center justify-center font-black text-sm transition-all duration-300 z-20
                ${spinning || loading ? 'bg-gray-500 scale-95 opacity-50 cursor-not-allowed' : 'bg-white hover:scale-110 shadow-2xl active:scale-90 cursor-pointer'}`}"""

new_spin_btn = """                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full 
                flex flex-col items-center justify-center font-black text-sm transition-all duration-300 z-20
                ${spinning || loading ? 'bg-gray-500 scale-95 opacity-50 cursor-not-allowed' : 'bg-white hover:scale-110 shadow-2xl active:scale-90 cursor-pointer spin-btn-glow'}`}"""

content = content.replace(old_spin_btn, new_spin_btn)

# 6. Enhance result card with shimmer and win animation
old_result_card = """                className={`rounded-3xl p-8 text-center space-y-4 shadow-2xl border-2 ${
                  result.rewardType === "none" || isNoWinLabel(result.label)
                    ? "bg-secondary/90 text-muted-foreground border-white/20"
                    : "border-white/20"
                }`}
                style={"""

new_result_card = """                className={`win-overlay-enter rounded-3xl p-8 text-center space-y-4 shadow-2xl border-2 game-shimmer ${
                  result.rewardType === "none" || isNoWinLabel(result.label)
                    ? "bg-secondary/90 text-muted-foreground border-white/20"
                    : "border-white/20"
                }`}
                style={"""

content = content.replace(old_result_card, new_result_card)

with open(path, "w") as f:
    f.write(content)

print("PrizeWheel enhanced successfully!")

#!/usr/bin/env python3
"""Add premium CSS for company profile page to index.css"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/index.css"

with open(FILE, "r") as f:
    content = f.read()

new_css = '''

/* ============================================ COMPANY PROFILE PREMIUM STYLES ============================================ */

/* Profile hero animated gradient mesh */
@keyframes profile-hero-shift {
  0%, 100% { background-position: 0% 50%; }
  25% { background-position: 50% 100%; }
  50% { background-position: 100% 50%; }
  75% { background-position: 50% 0%; }
}
.profile-hero-gradient {
  background-size: 400% 400%;
  animation: profile-hero-shift 12s ease infinite;
}

/* Floating orbs for hero background */
@keyframes orb-float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(60px, -40px) scale(1.15); }
  50% { transform: translate(-30px, -80px) scale(0.9); }
  75% { transform: translate(-60px, -20px) scale(1.05); }
}
@keyframes orb-float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-50px, -60px) scale(1.2); }
  66% { transform: translate(40px, -30px) scale(0.85); }
}
@keyframes orb-float-3 {
  0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.6; }
  50% { transform: translate(30px, -50px) scale(1.1); opacity: 1; }
}

.profile-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
}
.profile-orb-1 { width: 300px; height: 300px; top: -20%; left: -5%; animation: orb-float-1 15s ease-in-out infinite; }
.profile-orb-2 { width: 250px; height: 250px; top: 10%; right: -8%; animation: orb-float-2 18s ease-in-out infinite; }
.profile-orb-3 { width: 200px; height: 200px; bottom: -10%; left: 30%; animation: orb-float-3 20s ease-in-out infinite; }

/* Logo glow pulse */
@keyframes logo-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color, rgba(251,191,36,0.3)), 0 0 40px var(--glow-color-soft, rgba(251,191,36,0.1)); }
  50% { box-shadow: 0 0 35px var(--glow-color, rgba(251,191,36,0.5)), 0 0 70px var(--glow-color-soft, rgba(251,191,36,0.2)); }
}
.profile-logo-glow {
  animation: logo-glow-pulse 3s ease-in-out infinite;
}

/* Glassmorphism card for stats */
@keyframes stat-card-in {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.stat-card-animate {
  animation: stat-card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 3D tilt card hover */
.profile-3d-card {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
  transform-style: preserve-3d;
  perspective: 800px;
}
.profile-3d-card:hover {
  transform: translateY(-6px) rotateX(2deg);
  box-shadow: 0 20px 60px -15px rgba(0,0,0,0.15), 0 0 30px -10px var(--card-glow, rgba(251,191,36,0.15));
}

/* Game card shine sweep for profile */
@keyframes profile-card-shine {
  0% { left: -100%; }
  100% { left: 200%; }
}
.profile-game-card {
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.profile-game-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  pointer-events: none;
  z-index: 2;
}
.profile-game-card:hover::after {
  animation: profile-card-shine 0.7s ease-out;
}
.profile-game-card:hover {
  transform: translateY(-4px) scale(1.01);
}

/* Animated tab indicator */
@keyframes tab-indicator-slide {
  0% { transform: scaleX(0.8); opacity: 0.5; }
  100% { transform: scaleX(1); opacity: 1; }
}

/* Join card gradient border animation */
@keyframes join-border-rotate {
  0% { --join-angle: 0deg; }
  100% { --join-angle: 360deg; }
}
@keyframes join-glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Verified badge shine */
@keyframes verified-shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.verified-badge-shine {
  background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
  background-size: 200% 100%;
  animation: verified-shine 3s ease-in-out infinite;
}

/* Live session timeline line */
@keyframes timeline-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
.live-timeline-dot {
  position: relative;
}
.live-timeline-dot::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  animation: timeline-pulse 2s ease-in-out infinite;
}

/* Empty state float animation */
@keyframes empty-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.empty-float {
  animation: empty-float 3s ease-in-out infinite;
}

/* Color swatch hover */
.color-swatch {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.color-swatch:hover {
  transform: scale(1.15) translateY(-4px);
  box-shadow: 0 8px 25px -5px var(--swatch-color, rgba(0,0,0,0.3));
}

/* Responsive profile */
@media (max-width: 768px) {
  .profile-orb { filter: blur(80px); opacity: 0.6; }
  .profile-orb-1 { width: 200px; height: 200px; }
  .profile-orb-2 { width: 180px; height: 180px; }
  .profile-orb-3 { width: 150px; height: 150px; }
  .profile-3d-card:hover { transform: translateY(-3px); }
  .profile-game-card:hover { transform: translateY(-2px); }
}
'''

# Append before the last closing comment or at end
content = content.rstrip() + "\n" + new_css

with open(FILE, "w") as f:
    f.write(content)

print("OK: Added premium company profile CSS")

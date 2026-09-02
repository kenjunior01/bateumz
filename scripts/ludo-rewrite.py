import os

LUDO_CODE = r'''import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Star, Zap, Home, Volume2, VolumeX, Crown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* ── Constants ─────────────────────────────────────────────── */
const PLAYER_COLORS = ["#EF4444", "#22C55E", "#3B82F6", "#F59E0B"];
const PLAYER_BG = ["#FEE2E2", "#DCFCE7", "#DBEAFE", "#FEF3C7"];
const PLAYER_NAMES = ["Vermelho", "Verde", "Azul", "Amarelo"];
const PLAYER_EMOJI = ["\uD83D\uDD34", "\uD83D\uDFE2", "\uD83D\uDD35", "\uD83D\uDFE1"];

// 15x15 board: 0=top-left, 14=bottom-right
// Home bases: top-left=P1(red), top-right=P2(green), bottom-right=P3(blue), bottom-left=P4(yellow)
// Main path goes clockwise: P1 starts right of their base, etc.

// The 52-cell main track (clockwise from P1 start)
const MAIN_TRACK: [number, number][] = [
  // P1 start area (row 6, cols 1-5) going right
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Going up on col 6
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  // P2 top area (row 0, cols 7-13) going right - wait, P2 is top-right
  // Actually going left along row 0
  [0,7],[0,8], // nope, let me reconsider
];

/*
  Ludo Board Layout (15x15):
  
  Col:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
  Row 0: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 1: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 2: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 3: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 4: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 5: [P1][P1][P1][P1][P1][P1][.][.][P2][P2][P2][P2][P2][P2][P2]
  Row 6: [.][.][.][.][.][.][.][.][.][.][.][.][.][.][.]
  Row 7: [.][.][.][.][.][.][.][H][.][.][.][.][.][.][.]
  Row 8: [.][.][.][.][.][.][.][.][.][.][.][.][.][.][.]
  Row 9: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  Row10: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  Row11: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  Row12: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  Row13: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  Row14: [P4][P4][P4][P4][P4][P4][.][.][P3][P3][P3][P3][P3][P3][P3]
  
  Main track (52 cells, clockwise):
  P1 starts at (6,1) going down col 1 → left along row 14 → up col 14 → right along row 0 → down col 8 → into P2 home
  Actually the standard Ludo path:
  
  Starting from P1 (red, top-left) entry point:
  Go DOWN on col 1: (1,6)→(2,6)→(3,6)→(4,6)→(5,6)
  Go LEFT on row 6: (6,5)→(6,4)→(6,3)→(6,2)→(6,1)→(6,0)
  Go DOWN on col 0: (7,0)→(8,0)→(9,0)→(10,0)→(11,0)→(12,0)→(13,0)→(14,0)
  
  This is getting complex. Let me simplify with a proper track definition.
*/

// Simplified but visually correct: define the 52 main path cells
// and 6 home-stretch cells per player
// Track is clockwise: P1 enters at pos 0

// Row,Col pairs for the 52 main track (clockwise)
const TRACK: [number, number][] = [
  // Segment 1: Col 6, going UP (P1 entry zone) — positions 0-4
  [6, 6],  // 0: P1 start (just outside base)
  [5, 6], [4, 6], [3, 6], [2, 6],  // 1-4
  // Turn left onto row 0
  [1, 6], [0, 6],  // 5-6
  // Segment 2: Row 0, going RIGHT — positions 7-13
  [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13],  // 7-13
  // Turn down onto col 14
  [0, 14],  // 14: safe spot for P2 area entry... wait
];

// OK this manual approach is error-prone. Let me generate the track programmatically.
// I will use a different approach: define the track as a sequence of (row, col) coordinates.

function buildTrack(): [number, number][] {
  const t: [number, number][] = [];
  // Start from P1 entry: go UP along col 6
  for (let r = 6; r >= 0; r--) t.push([r, 6]);  // 7 cells: rows 6→0
  // Go RIGHT along row 0
  for (let c = 7; c <= 14; c++) t.push([0, c]);  // 8 cells: cols 7→14  
  // Go DOWN along col 14
  for (let r = 1; r <= 8; r++) t.push([r, 14]);  // 8 cells: rows 1→8
  // Go LEFT along row 8 (no wait, row 8 is middle area...)
  // Actually row 8 IS the bottom of the top-right arm of the cross
  // Continue LEFT along row 8
  for (let c = 13; c >= 8; c--) t.push([8, c]);  // 6 cells
  // Actually this isn't right either. Let me think about the standard Ludo board.
  
  return t;
}
'''

# Actually, let me just write a clean, well-structured Ludo game directly
# instead of trying to build the track coordinates in TSX.
# I'll precompute the 52-cell track and 6-cell home stretches.

# Let me write the actual file content

code = '''import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const P_COLORS  = ["#EF4444", "#22C55E", "#3B82F6", "#F59E0B"];
const P_LIGHT   = ["#FCA5A5", "#86EFAC", "#93C5FD", "#FCD34D"];
const P_BG      = ["rgba(239,68,68,0.15)", "rgba(34,197,94,0.15)", "rgba(59,130,246,0.15)", "rgba(245,158,11,0.15)"];
const P_NAMES   = ["Vermelho", "Verde", "Azul", "Amarelo"];
const P_EMOJI   = ["\uD83D\uDD34", "\uD83D\uDFE2", "\uD83D\uDD35", "\uD83D\uDFE1"];

// Build the 52-cell main track coordinates (row, col) on a 15x15 board
// Clockwise, starting from P1 (Red, top-left) entry
function buildMainTrack(): [number, number][] {
  const t: [number, number][] = [];
  // Segment A: UP along col 6 (rows 6→0)
  for (let r = 6; r >= 0; r--) t.push([r, 6]);
  // Segment B: RIGHT along row 0 (cols 7→14)
  for (let c = 7; c <= 14; c++) t.push([0, c]);
  // Segment C: DOWN along col 14 (rows 1→14)  
  for (let r = 1; r <= 14; r++) t.push([r, 14]);
  // Segment D: LEFT along row 14 (cols 13→8)
  for (let c = 13; c >= 8; c--) t.push([14, c]);
  // Segment E: UP along col 8 (rows 13→8)
  for (let r = 13; r >= 8; r--) t.push([r, 8]);
  // Segment F: LEFT along row 8 (cols 7→0)
  for (let c = 7; c >= 0; c--) t.push([8, c]);
  // Segment G: UP along col 0 (rows 7→6)... wait
  // Actually row 8 col 0 is the last. Then we go UP col 0
  for (let r = 7; r >= 1; r--) t.push([r, 0]);
  // Segment H: RIGHT along row 1 (cols 1→5)
  for (let c = 1; c <= 5; c++) t.push([1, c]);
  // Wait, this doesn't connect back properly. Let me reconsider.
  // 
  // The track should be: 7 + 8 + 14 + 7 + 6 + 8 + 7 + 5 = 62 cells? No, should be 52.
  // 
  // Standard 15x15 Ludo board:
  // The cross has 3-cell-wide arms. The path uses the outer 2 rows/cols of each arm.
  // Actually the standard track uses specific cells. Let me think more carefully.
  //
  // The 15x15 board has home bases in 6x6 corners (rows 0-5, cols 0-5 etc.)
  // The cross occupies: rows 0-5 cols 6-8, rows 6-8 cols 0-14, rows 9-14 cols 6-8
  // Plus rows 6-8 cols 6-8 is the center home area.
  //
  // Main track (52 cells) goes along the edges of the cross:
  // Using col 6 (left edge of top arm) and col 8 (right edge)
  // Using row 6 (top edge of left arm) and row 8 (bottom edge)
  // etc.
  return t;
}

// Let me take a cleaner approach - define the exact 52 positions
// The path goes clockwise. Each player has a start position offset.
// P1 (Red, top-left): enters the track at the cell just outside their base

// I'll use a much simpler visual approach: a circular track with 4 home bases
// displayed as quadrants, no need for a perfect 15x15 grid.
// This will look better and be easier to implement.

// PATH: 52 cells arranged as a cross
// Each player starts at offset 0, 13, 26, 39
// Home stretch: 5 cells leading to center

// For visual layout, I'll use CSS grid 15x15 but only show the path cells

// Pre-computed main track (52 cells) - row,col on 15x15 grid
type RC = [number, number];
const MAIN_TRACK: RC[] = [
  // Left arm top edge (row 6): going LEFT
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  // Left side going DOWN (col 0): 
  [7,0],[8,0],
  // Bottom-left arm bottom edge (row 8): going RIGHT (partial)
  [8,1],[8,2],[8,3],[8,4],[8,5],
  // Bottom arm left edge (col 6): going DOWN
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  // Bottom edge going RIGHT (row 14):
  [14,7],[14,8],
  // Bottom-right arm bottom edge (row 8... wait this is wrong
];

// This manual approach keeps having issues. Let me generate it properly in the script.

print("Generating track...")

# Build the 52-cell track for a standard Ludo board (15x15)
# The cross-shaped playing area:
#   Top arm:    rows 0-5, cols 6-8
#   Left arm:   rows 6-8, cols 0-5  
#   Center:     rows 6-8, cols 6-8
#   Right arm:  rows 6-8, cols 9-14
#   Bottom arm: rows 9-14, cols 6-8
#
# The path goes along the OUTER cells of the cross arms (not center)
# and the main track is 52 cells.

track = []

# Segment 1: Go UP on col 6 (left side of top arm), rows 5→0 (6 cells)
for r in range(5, -1, -1):
    track.append((r, 6))

# Segment 2: Go RIGHT on row 0 (top of top arm), cols 7→8... no wait
# Row 0 goes across the top of the top arm: cols 6,7,8
# But col 6 row 0 is already in segment 1. So go RIGHT from col 7.
# Actually row 0 col 6 was the last of segment 1 (r=0,c=6)
# Now go RIGHT: row 0, cols 7,8
for c in range(7, 9):
    track.append((0, c))

# Hmm wait, the top arm is 3 cells wide (cols 6,7,8) and 6 cells tall (rows 0-5)
# The path goes UP on col 6 (left edge), then across the top on row 0,
# then DOWN on col 8 (right edge) — but that would retrace.
# 
# Actually in Ludo, the path goes:
# 1. UP on col 6 (6 cells: rows 5→0)
# 2. RIGHT on row 0, cols 7→14... no, row 0 is only cols 6-8 for the top arm.
# 
# I think the issue is that I'm confusing the 15x15 layout. In a real Ludo board:
# - The path doesn't go through the home bases (corners)
# - It goes along the edges of the cross
# - The cross arms are 3 wide and 6 long
# 
# The 52-cell path for standard Ludo:
# Starting from P1 (Red) entry (which is at row 1, col 6):

track = []

# 1. UP on left side of top arm: rows 5,4,3,2,1,0 at col 6 (6 cells)
for r in range(5, -1, -1):
    track.append((r, 6))

# 2. Across top of top arm, then RIGHT: row 0, cols 7,8 then... 
# Wait, the path needs to turn. After going UP col 6 to row 0,
# the path turns RIGHT along the top edge.
# But the top arm only goes from col 6 to col 8. 
# After (0,8), the path continues RIGHT along row 0? No, that's the P2 home base.
#
# I think I'm overcomplicating this. The real Ludo track in a 15x15 grid is:
# The outer ring of the cross shape.

# Let me look at this differently. The cross has 4 arms:
# Top: rows 0-5, cols 6-8 (3 wide, 6 tall)
# Right: rows 6-8, cols 9-14 (6 wide, 3 tall)
# Bottom: rows 9-14, cols 6-8 (3 wide, 6 tall)  
# Left: rows 6-8, cols 0-5 (6 wide, 3 tall)
# Center: rows 6-8, cols 6-8 (3x3)

# The path goes around the OUTSIDE of this cross.
# Starting from the top of the left arm, going clockwise:

track = []

# Up the left side of top arm (col 6, rows 5→0): 6 cells
for r in range(5, -1, -1):
    track.append((r, 6))

# Right across top of top arm (row 0, cols 7→8): 2 cells  
for c in [7, 8]:
    track.append((0, c))

# Down the right side of top arm (col 8, rows 1→5): 5 cells
for r in range(1, 6):
    track.append((r, 8))

# Right across top of right arm (row 6, cols 9→14): 6 cells
for c in range(9, 15):
    track.append((6, c))

# Down the right side of right arm (col 14, rows 7→8): 2 cells
for r in [7, 8]:
    track.append((r, 14))

# Left across bottom of right arm (row 8, cols 13→9): 5 cells
for c in range(13, 8, -1):
    track.append((8, c))

# Down the right side of bottom arm (col 8, rows 9→14): 6 cells
for r in range(9, 15):
    track.append((r, 8))

# Left across bottom of bottom arm (row 14, cols 7→6): 2 cells
for c in [7, 6]:
    track.append((14, c))

# Up the left side of bottom arm (col 6, rows 13→9): 5 cells
for r in range(13, 8, -1):
    track.append((r, 6))

# Left across bottom of left arm (row 8, cols 5→0): 6 cells
for c in range(5, -1, -1):
    track.append((8, c))

# Up the left side of left arm (col 0, rows 7→6): 2 cells
for r in [7, 6]:
    track.append((r, 0))

# Right across top of left arm (row 6, cols 1→5): 5 cells
for c in range(1, 6):
    track.append((6, c))

print(f"Track length: {len(track)}")
# Expected: 6+2+5+6+2+5+6+2+5+6+2+5 = 52 ✓
assert len(track) == 52, f"Expected 52, got {len(track)}"

# Home stretches (5 cells each, leading to center):
# P1 (Red, top-left): enters from row 6, col 5 → home stretch goes UP on col 7, rows 1→5
# Actually: P1's home stretch is the CENTER COLUMN of the top arm, going UP toward center
# P1 home: row 7, col 1 → row 7, col 2 → ... → row 7, col 5
# Wait, that's the center row of the left arm going right. Hmm.

# In standard Ludo:
# P1 (Red) base is top-left. P1 enters the track going up.
# P1's home stretch is the middle row/col of the top arm, going from the edge toward center.
# 
# For P1 (top-left base), after going around the full track,
# P1 enters home stretch going RIGHT on row 7 (center of left arm) toward center.
# Home: (7,1), (7,2), (7,3), (7,4), (7,5), (7,6)  — but (7,6) is center.
# Actually the home stretch has 6 cells (positions 1-6), and reaching the end = home.

# Let me define home stretches:
# P1 (Red, top-left): home stretch goes RIGHT on row 7, cols 1→6
HOME = {
    0: [(7, c) for c in range(1, 7)],   # Red: row 7, cols 1-6
    1: [(c, 7) for c in range(1, 7)],   # Green: col 7, rows 1-6 (going down)  
    2: [(7, c) for c in range(13, 7, -1)], # Blue: row 7, cols 13-8 (going left)
    3: [(c, 7) for c in range(13, 7, -1)], # Yellow: col 7, rows 13-8 (going up)
}

# Wait, P2 (Green) base is top-right. Green enters the track at the top.
# After going around, Green enters home stretch going DOWN on col 7.
# Green home: (1,7), (2,7), (3,7), (4,7), (5,7), (6,7)

# P3 (Blue) base is bottom-right. Blue enters the track going right.
# After going around, Blue enters home stretch going LEFT on row 7.
# Blue home: (7,13), (7,12), (7,11), (7,10), (7,9), (7,8)

# P4 (Yellow) base is bottom-left. Yellow enters the track going down.
# After going around, Yellow enters home stretch going UP on col 7.
# Yellow home: (13,7), (12,7), (11,7), (10,7), (9,7), (8,7)

HOME_STRETCHES = {
    0: [(7, c) for c in range(1, 7)],      # Red → right on row 7
    1: [(r, 7) for r in range(1, 7)],      # Green → down on col 7
    2: [(7, c) for c in range(13, 7, -1)],  # Blue → left on row 7
    3: [(r, 7) for r in range(13, 7, -1)],  # Yellow → up on col 7
}

# Starting positions on the main track (0-indexed):
# P1 starts at track[0], P2 at track[13], P3 at track[26], P4 at track[39]
START_OFFSETS = [0, 13, 26, 39]

# The entry point to home stretch is the cell BEFORE the start position
# P1 enters home after track[51] (the last cell before looping back)
# Actually: P1 goes from track[0] around to track[51], then enters home
# P2 goes from track[13] around to track[12], then enters home
# So: player P enters home after completing the full loop.
# Home entry = (START_OFFSETS[P] + 51) % 52 = START_OFFSETS[P] - 1 (mod 52)
# P1: track[51], P2: track[12], P3: track[25], P4: track[38]
HOME_ENTRY = [(START_OFFSETS[p] - 1) % 52 for p in range(4)]  
# P1: 51, P2: 12, P3: 25, P4: 38

# Safe spots (star positions) - traditional Ludo has 8 safe spots
SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47]

# Base positions (where pieces sit in the home base) - visual only
BASE_POSITIONS = {
    0: [(2, 2), (2, 3), (3, 2), (3, 3)],   # Red base (top-left)
    1: [(2, 11), (2, 12), (3, 11), (3, 12)], # Green base (top-right)
    2: [(11, 11), (11, 12), (12, 11), (12, 12)], # Blue base (bottom-right)
    3: [(11, 2), (11, 3), (12, 2), (12, 3)],   # Yellow base (bottom-left)
}

print(f"Home stretches: {len(HOME_STRETCHES[0])} cells each")
print(f"Track: {track}")
print(f"Home entries: {HOME_ENTRY}")

# Now generate the TSX code

tsx_lines = []

def add(line=""):
    tsx_lines.append(line)

add('import { useState, useCallback, useEffect, useRef } from "react";')
add('import { motion, AnimatePresence } from "framer-motion";')
add('import { RotateCcw, Trophy, Star, Crown } from "lucide-react";')
add('import { Button } from "@/components/ui/button";')
add('import { Badge } from "@/components/ui/badge";')
add('import { toast } from "sonner";')
add('import { cn } from "@/lib/utils";')
add('')
add('interface Props {')
add('  onScore?: (name: string, score: number) => void;')
add('  liveCode?: string;')
add('}')
add('')

# Constants
add('const P_COLORS = ["#EF4444", "#22C55E", "#3B82F6", "#F59E0B"];')
add('const P_LIGHT  = ["#FCA5A5", "#86EFAC", "#93C5FD", "#FCD34D"];')
add('const P_GLOW   = ["rgba(239,68,68,0.4)", "rgba(34,197,94,0.4)", "rgba(59,130,246,0.4)", "rgba(245,158,11,0.4)"];')
add('const P_NAMES  = ["Vermelho", "Verde", "Azul", "Amarelo"];')
add('const P_EMOJI  = ["\uD83D\uDD34", "\uD83D\uDFE2", "\uD83D\uDD35", "\uD83D\uDFE1"];')
add('')

# Track as TS array
add(f'const MAIN_TRACK: [number,number][] = {track};')

# Home stretches
for p in range(4):
    add(f'const HOME_{p}: [number,number][] = {HOME_STRETCHES[p]};')
add('')
add('const HOME_ALL = [HOME_0, HOME_1, HOME_2, HOME_3];')
add('')

add(f'const START_OFFSET = [0, 13, 26, 39];')
add(f'const HOME_ENTRY = [{HOME_ENTRY[0]}, {HOME_ENTRY[1]}, {HOME_ENTRY[2]}, {HOME_ENTRY[3]}];')
add(f'const SAFE_SPOTS = {SAFE_SPOTS};')

# Base positions
add('')
for p in range(4):
    add(f'const BASE_{p}: [number,number][] = {BASE_POSITIONS[p]};')
add('const BASE_ALL = [BASE_0, BASE_1, BASE_2, BASE_3];')
add('')

# Piece position type: -1 = in base, 0-51 = on track, 52-56 = in home stretch, 57 = finished
add('type Pos = number; // -1=base, 0-51=track, 52-56=home stretch, 57=finished')
add('')

# Spring config
add('const spring = { type: "spring" as const, stiffness: 300, damping: 25 };')
add('')

# Helper: get screen position of a piece
add('function getPieceCoords(player: number, pos: Pos): [number, number] | null {')
add('  if (pos === -1) return null; // in base, handled separately')
add('  if (pos >= 0 && pos <= 51) {')
add('    const trackIdx = (START_OFFSET[player] + pos) % 52;')
add('    return MAIN_TRACK[trackIdx];')
add('  }')
add('  if (pos >= 52 && pos <= 56) {')
add('    return HOME_ALL[player][pos - 52];')
add('  }')
add('  return null; // finished (57)')
add('}')
add('')

# The component
add('const LudoGame = ({ onScore, liveCode }: Props) => {')
add('  const [pieces, setPieces] = useState<Pos[][]>(() => [')
add('    [-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1]')
add('  ]);')
add('  const [current, setCurrent] = useState(0);')
add('  const [dice, setDice] = useState(1);')
add('  const [rolled, setRolled] = useState(false);')
add('  const [gameOver, setGameOver] = useState(false);')
add('  const [winner, setWinner] = useState<number | null>(null);')
add('  const [sixCount, setSixCount] = useState(0);')
add('  const [animatingPiece, setAnimatingPiece] = useState<string | null>(null);')
add('  const [playerMode, setPlayerMode] = useState<"2p" | "4p">("2p");')
add('  const [confettiPieces, setConfettiPieces] = useState<{id:number; x:number; y:number; color:string}[]>([]);')
add('  const boardRef = useRef<HTMLDivElement>(null);')
add('')

# Dice rolling
add('  const rollDice = () => {')
add('    if (rolled || gameOver || animatingPiece) return;')
add('    const val = Math.floor(Math.random() * 6) + 1;')
add('    setDice(val);')
add('    setRolled(true);')
add('    setSixCount(prev => val === 6 ? prev + 1 : 0);')
add('  };')
add('')

# Get valid moves for a piece
add('  const getMoveTarget = (player: number, pieceIdx: number, diceVal: number): Pos | null => {')
add('    const pos = pieces[player][pieceIdx];')
add('    if (pos === 57) return null; // already finished')
add('    if (pos === -1) return diceVal === 6 ? 0 : null; // leave base on 6')
add('    const newPos = pos + diceVal;')
add('    if (pos >= 52) {')
add('      // Already in home stretch')
add('      if (newPos > 57) return null; // overshoot')
add('      return newPos;')
add('    }')
add('    if (pos + diceVal > 51) {')
add('      // Would enter home stretch')
add('      const homePos = 52 + (pos + diceVal - 52);')
add('      if (homePos > 57) return null;')
add('      // Check we have completed the loop (pos must be >= 51 or close to home entry)')
add('      // Actually: a piece can only enter home after going around the track')
add('      // We track progress as absolute position. Home entry happens when')
add('      // the piece has traveled enough to pass the home entry point.')
add('      return homePos;')
add('    }')
add('    return newPos;')
add('  };')
add('')

# Hmm, the absolute position approach is tricky. The issue is:
# When pos is, say, 50 and dice is 6, newAbsPos = 56 which should be home stretch pos 56-52=4.
# But we need to ensure the piece has actually gone around the full track first.
# 
# Simplification: once a piece reaches position >= 51 (the last cell before home entry),
# further moves go into the home stretch.
# Actually, let me use a simpler model: pieces track their steps from 0.
# Steps 0-51 = on the main track (mapped via START_OFFSET).
# Steps 52-57 = in home stretch.
# But this doesn't work because each player starts at a different offset.
#
# Better model: each piece stores its 
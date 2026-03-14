# Stats Page — Games Played & Win Rate Visual Refresh — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Games Played and Win Rate stat cards on the My Stats page more visually interesting: Win Rate with a horizontal progress bar (green/red by ≥50%), Games Played with an icon and blue left-border accent.

**Architecture:** Add two dedicated card components inside `components/player-stats-view.tsx` (no new files): `GamesPlayedCard` (icon left + value + label, `border-l-4 border-blue-400` and optional `bg-blue-50/30`) and `WinRateCard` (value + horizontal bar + label + sub). Replace the first two `StatCard` usages in the summary grid with these. Update the stats route loading skeleton so the first two slots mirror the new card layout (icon placeholder, bar placeholder). No new data or API; mobile-first grid unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react (Gamepad2 for games played).

**Resolved open questions (from brainstorm):**
- Icon position: left of number.
- Accent style: left border.
- Accent color: blue (`border-blue-400`, optional `bg-blue-50`).

---

## Task 1: Add GamesPlayedCard component

**Files:**
- Modify: `components/player-stats-view.tsx` (after `StatCard`, before `RecentGameRow`)

**Step 1: Add the component**

Insert a new function component `GamesPlayedCard` after `StatCard` (after line 63), before `RecentGameRow`. It should:
- Accept `value: number` and `label: string` (e.g. `"Games Played"`).
- Render a card with: `rounded-xl border border-l-4 border-blue-400 bg-blue-50/30 p-4` (or `bg-white` with only left border if preferred for contrast).
- Layout: flex row, items-center, gap-3. Left: icon from lucide-react (`Gamepad2`, size 24, `text-blue-600`). Right: div with value as `text-2xl font-bold text-gray-900`, then `text-xs font-medium text-gray-500` for label.
- Use same outer structure as StatCard (rounded-xl border bg-white) but add `border-l-4 border-blue-400` and optionally `bg-blue-50/50` for subtle tint.

**Step 2: Add import**

At top of file, add to imports: `Gamepad2` from `"lucide-react"`.

**Step 3: Verify**

Run: `npm run build`  
Expected: Build succeeds. No TypeScript or lint errors in `player-stats-view.tsx`.

---

## Task 2: Add WinRateCard component

**Files:**
- Modify: `components/player-stats-view.tsx` (after `GamesPlayedCard`, before `RecentGameRow`)

**Step 1: Add the component**

Insert a new function component `WinRateCard` after `GamesPlayedCard`. Props: `value: string` (e.g. `"65%"` or `"–"`), `sub: string` (e.g. `"12W – 8L"`), `percent: number | null` (0–100 or null for bar fill).

- Outer: `rounded-xl border bg-white p-4 text-center`. If `percent !== null && percent >= 50` add `border-green-200 bg-green-50`; else if `percent !== null && percent < 50` add `border-red-100 bg-red-50` (match existing StatCard highlight behavior).
- Content order: (1) Value paragraph: `text-2xl font-bold` with green-700 when ≥50%, red-600 when <50%, gray-900 when null. (2) Horizontal bar: wrapper `mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden`; inner div for fill: `h-full rounded-full` with `bg-green-500` when percent ≥ 50, `bg-red-500` when percent < 50, `bg-gray-300` when null; width style `width: ${percent ?? 0}%`. (3) Label: `text-xs font-medium text-gray-500` ("Win Rate"). (4) Sub: `text-xs text-gray-400` below label.
- When `percent === null`, show value "–" and bar at 0% (empty gray track only).

**Step 2: Verify**

Run: `npm run build`  
Expected: Build succeeds.

---

## Task 3: Use new cards in the summary grid

**Files:**
- Modify: `components/player-stats-view.tsx` (summary stats grid, lines 194–201)

**Step 1: Replace first two StatCards**

- Replace `<StatCard label="Games Played" value={played} />` with `<GamesPlayedCard value={played} label="Games Played" />`.
- Replace the Win Rate `StatCard` (label "Win Rate", value, sub, highlight) with `<WinRateCard value={winRate !== null ? `${winRate}%` : "–"} sub={\`${wins}W – ${losses}L\`} percent={winRate} />`.

**Step 2: Verify**

Run: `npm run build`. Manually open `/stats` (or run dev and check) to confirm Games Played shows icon + blue accent and Win Rate shows bar and correct colors.

---

## Task 4: Update stats loading skeleton

**Files:**
- Modify: `app/(player)/stats/loading.tsx` (stats grid skeleton, lines 17–24)

**Step 1: Match first two slots to new card layout**

- Keep `grid grid-cols-2 gap-3 sm:grid-cols-4` and 4 slots. Do not use a single `Array.from({ length: 4 }).map()` for all four; render the first two slots with custom markup, then the remaining two with the existing generic card skeleton.
- First slot (Games Played): `<div className="rounded-xl border border-l-4 border-blue-200 bg-white p-4 flex items-center gap-3">` with icon placeholder `h-6 w-6 rounded bg-gray-200 animate-pulse motion-reduce:animate-none shrink-0`, then `<div className="space-y-1">` containing value block `h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none` and label block `h-3 w-16 rounded bg-gray-200 animate-pulse motion-reduce:animate-none`.
- Second slot (Win Rate): `<div className="rounded-xl border bg-white p-4 text-center space-y-2">` with value block `h-7 w-12 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto`, bar block `h-2 w-full rounded-full bg-gray-200 animate-pulse motion-reduce:animate-none`, label block `h-3 w-20 rounded bg-gray-200 animate-pulse motion-reduce:animate-none mx-auto`.
- Third and fourth slots: use the same generic card as today (e.g. `rounded-xl border bg-white p-4 text-center space-y-2` with value + label blocks), so the grid still has four items and layout matches.

**Step 2: Verify**

Run: `npm run build`. Optionally load `/stats` with throttling to see skeleton; confirm no layout shift when content loads.

---

## Task 5: Final verification

**Step 1: Build**

Run: `npm run build`  
Expected: Next.js production build and TypeScript checks pass.

**Step 2: Manual check (if possible)**

- Open My Stats page. Confirm Games Played card has icon and blue left border; Win Rate card has number, horizontal bar (green when ≥50%, red when <50%), and "XW – YL" sub.
- Confirm mobile view (narrow width): 2 columns; no overflow or broken layout.
- Confirm loading state: first two skeleton cards approximate the new shapes.

**Step 3: Commit**

```bash
git add components/player-stats-view.tsx app/\(player\)/stats/loading.tsx
git commit -m "feat(stats): visual refresh for Games Played and Win Rate cards"
```

---

## Reference

- Brainstorm: `docs/brainstorms/2026-03-14-stats-cards-visual-brainstorm.md`
- Current StatCard and grid: `components/player-stats-view.tsx` lines 43–63, 193–214
- Skeleton: `app/(player)/stats/loading.tsx` lines 16–24
- Mobile-first: `.cursor/rules/mobile-first.mdc`
- Skeleton loading: `.cursor/rules/skeleton-loading.mdc`

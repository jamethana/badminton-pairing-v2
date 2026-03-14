# Stats Page — Games Played & Win Rate Visual Refresh

**Date:** 2026-03-14

---

## What We're Building

Make the **Games Played** and **Win Rate** boxes on the My Stats page more visually interesting while keeping the same data and grid layout:

- **Win Rate:** Horizontal progress bar showing the percentage (e.g. 65% = bar 65% filled). Bar color reflects performance (green ≥50%, red &lt;50%). Number and "XW – YL" sub remain.
- **Games Played:** Icon (e.g. shuttlecock or activity/game icon) plus a light accent — subtle background tint or left border — so it reads as a primary "hero" stat.

Both stay in the existing summary grid (first row, mobile 2-col / sm 4-col). No new data or API changes.

---

## Why This Approach

- **Horizontal bar** is familiar, works well on narrow screens, and fits the existing "semantic color" pattern (green/red) already used for wins/losses.
- **Icon + accent** for Games Played gives a clear visual hierarchy and matches the desire for a mix without adding heavy UI (no gauge for both).
- Aligns with repo patterns: semantic colors, rounded cards, mobile-first grid. Skeleton loading will be updated so placeholders match the new card shapes (bar for win rate, icon slot for games played).

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Win rate visualization | Horizontal bar under the number | Clear, compact, good on mobile; reuses green/red semantics |
| Games played treatment | Icon + light accent (border or bg tint) | "Hero" feel without a second gauge; keeps layout simple |
| Bar color (win rate) | Green when ≥50%, red when &lt;50%, neutral when no data | Matches existing highlight and session stats text colors |
| Component shape | Dedicated variants for these two cards | Clear intent; skeleton can mirror each variant; avoids one overloaded StatCard |
| Icon for games played | Single, small icon (e.g. Lucide `Gamepad2` or `Activity`; or custom shuttle if available) | Recognizable "games" metaphor; position TBD in open questions |
| Accent for games played | Left border or very subtle bg; color TBD (blue vs slate) | Different from win-rate green so the two cards are distinct |

---

## Implementation Sketch

- **Games Played card:** New variant or small wrapper: icon (position TBD) + number + label, card with left border or subtle bg tint (exact color TBD). Reuse existing `StatCard`-like container structure.
- **Win Rate card:** New variant: value (e.g. "65%") + full-width horizontal bar (height ~2, rounded, bg gray-200; fill with green-500 or red-500 by %), then label + "XW – YL". Null win rate: show "–" and empty or neutral bar.
- **Skeleton:** In `app/(player)/stats/loading.tsx`, first two grid slots: (1) card with icon-shaped placeholder + value block, (2) card with value block + thin bar-shaped block; keep same grid structure to avoid layout shift.

---

## Open Questions

- **Icon position:** Left of number vs above number — to be decided in plan/implementation.
- **Accent style:** Left border only vs subtle background tint vs both — to be decided in plan/implementation.
- **Accent color:** Blue vs slate (or other) — to be decided in plan/implementation; must stay distinct from win-rate green/red.

---

## Out of Scope

- Changing other stat cards (Current Streak, Best Win Streak, Sessions, etc.) in this change
- New metrics or time-period filters
- Animation or motion (deferred)

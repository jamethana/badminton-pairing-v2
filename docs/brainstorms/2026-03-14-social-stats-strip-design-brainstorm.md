# Social Stats — Unique Design (Strip Layout) — Brainstorm

**Date:** 2026-03-14

---

## What We're Building

A **distinct presentation** for the three social stats (Unique Partners, Unique Opponents, Players Met) so they don't blend with the gameplay stat cards:

- **Replace** the current third row of three `StatCard` components with a **single full-width horizontal strip** (bar or pill).
- **Content:** Label inline on the left, then the three numbers. Example: **Social** · 12 partners · 14 opponents · 18 met
- No separate card boxes; one continuous strip that reads as "social" at a glance.

---

## Why This Approach

- **Layout** is the differentiator: gameplay stats stay as individual cards; social stats become one strip. No new colors or icons required unless we add them later.
- **Label inline** keeps the strip self-explanatory ("Social" or "Court connections") without an extra heading block.
- **Single element** reduces visual noise and clearly groups the three numbers as one concept.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Layout | One horizontal strip (full-width) | Distinct from card grid; reads as one "social" block |
| Label | Inline inside strip, left side | e.g. "Social · 12 partners · 14 opponents · 18 met" — no separate heading |
| Strip style | Bar or pill (rounded), subtle background/border | Different from StatCard; still consistent with page (e.g. same border radius family) |
| Data & logic | Unchanged | Same `uniquePartners`, `uniqueOpponents`, `uniquePlayersMet` from `CareerStats`; only the UI component changes |

---

## Implementation Notes (for plan)

- In [components/player-stats-view.tsx](components/player-stats-view.tsx): remove the existing third row of three `StatCard`s for social stats. Add one new component or block: a full-width strip with left-aligned label + three stats (e.g. "Social" then "·" and "X partners · Y opponents · Z met"). Use a single `div` with appropriate padding, border/background, and rounded corners so it reads as a strip.
- Copy: "Social" (or "Court connections") as the label; "partners", "opponents", "met" as the short labels after each number.
- Mobile: strip can wrap to two lines if needed (e.g. label + first stat on line 1, other two on line 2), or stay one line with smaller text; prefer keeping "Social · …" readable.

---

## Open Questions

_(none — resolved in dialogue)_

---

## Out of Scope

- Changing the data or where social stats are computed
- Adding icons or color accents (can be a follow-up)
- Changing Top Partner / Top Rival cards

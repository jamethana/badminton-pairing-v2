# Social Stats for My Stats Page — Brainstorm

**Date:** 2026-03-14

---

## What We're Building

Three new "social" stat cards on the My Stats page showing how broadly a player has connected with the club:

- **Unique Partners** — number of distinct players you've teamed up with
- **Unique Opponents** — number of distinct players you've faced across the net
- **Players Met** — combined total of unique people you've shared a court with (partners ∪ opponents)

---

## Why This Approach

All three values are computable from the existing `pairings` data already fetched for the page — no additional DB queries or schema changes needed. They complement the existing partner/rival cards by giving a broader social picture rather than just highlighting one "top" player.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Placement | Third row of stat cards in the summary grid | Consistent with existing card style; no new section needed |
| Layout | `grid-cols-3` row (matching existing 3-card row pattern) | Clean grouping of the three related numbers |
| Deduplication | Set union of partner IDs + opponent IDs for "Players Met" | Simple and correct; already available from `getPartner` / `getOpponents` helpers |
| Where to compute | `computeCareerStats` in `lib/utils/player-career-stats.ts` | Keeps all derived stats in one place |

---

## Implementation Sketch

```ts
// New fields on CareerStats
uniquePartners: number;
uniqueOpponents: number;
uniquePlayersMet: number;
```

Computed by collecting partner IDs into a Set and opponent IDs into another Set, then `uniquePlayersMet = partnerSet.union(opponentSet).size` (or manual union).

---

## Open Questions

_(none — all resolved during brainstorm)_

---

## Out of Scope

- Ranking or listing the "new" players — just the count for now
- Filtering by time period (e.g. this year's new connections)

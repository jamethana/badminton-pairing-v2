# Moderator Session — Players Tab UI Upgrade (Proactive Refresh)

**Date:** 2026-03-15

---

## What We're Exploring

Proactive refresh of the **Players** tab on the moderator session page now that "+ Add Player" has moved here from the Game tab. No specific pain reported; goal is to align the tab with project UX rules and with the global moderator Players page where it makes sense.

---

## Current State

- **Add Player:** Expandable block (gray panel) with search, multi-select existing users, optional "Create new player (name slot)" form, Cancel / Add.
- **List:** Sort pills + tappable rows (avatar, stats, skill bar). Tap row → Edit dialog (active, skill, remove from session).
- **Remove:** Uses `window.confirm`; edit flow and list UX otherwise match the 2026-03-15 edit-player brainstorm.

---

## Gaps (from codebase review)

| Gap | Detail |
|-----|--------|
| **Tap targets** | "+ Add Player" and "Add (n)" use `px-3 py-1` / `py-1.5` + `text-xs` — likely under 44px. Mobile-first rule asks for ≥ 44px for critical actions. |
| **Remove confirmation** | Session uses `window.confirm`; global Players and other flows use Dialog. Aligning to Dialog improves consistency and accessibility. |
| **Add UI styling** | Session: gray expandable + soft green button. Global Players: green panel + solid green button. Different visual weight; optional to align. |
| **Empty state** | Session: "Click '+ Add Player' to get started." Global also mentions LINE/sign-in. Optional to add LINE hint for moderators. |

---

## Approaches

### A. Minimal upgrade (recommended)

- **Scope:** Fix tap targets on Add Player actions (button and footer Add) to meet 44px; replace "Remove from session" confirmation with an in-dialog confirm step (or small Dialog) instead of `window.confirm`.
- **Pros:** Small change set, satisfies mobile-first and consistency with rest of app. No layout or flow redesign.
- **Cons:** Add block still looks different from global Players (gray vs green panel).
- **When:** Best when the goal is "bring this tab up to spec" without a visual overhaul.

### B. Moderate alignment

- **Scope:** Everything in A, plus: style the Add Player block like global Players (e.g. green panel, solid green "+ Add Player" button); optionally align empty-state copy (e.g. mention LINE where relevant).
- **Pros:** Session and global Players feel like one system; clearer hierarchy for the add action.
- **Cons:** More styling and copy touchpoints; need to avoid breaking existing behavior.
- **When:** Best when you want the two "Players" experiences to feel visually consistent.

### C. Defer

- **Scope:** No change. Rely on current behavior.
- **Pros:** Zero effort; current UX is functional.
- **Cons:** Tap targets and confirm pattern remain out of line with rules and other screens.
- **When:** Best if prioritising other work; revisit when touching this tab again.

---

## Recommendation

**A. Minimal upgrade.** Proactive refresh is well served by fixing the two clear rule/consistency gaps (tap targets, remove confirmation) without redesigning the add block. If you later want the tab to match global Players visually, B can build on A.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Proactive scope | Minimal upgrade first | YAGNI; tap targets + Dialog for remove address the main gaps. |
| Remove confirmation | Dialog (or in-dialog step) | Matches rest of app; better a11y than `window.confirm`. |
| Add block styling | Leave as-is in minimal | Can align to global Players in a follow-up (approach B). |

---

## Open Questions

- None. Proceeding with approach A is sufficient; if you prefer B or C, that can be noted in the plan.

---

## Next Steps

- Choose approach (A, B, or C).
- If A or B: run `/workflows:plan` (or create a short plan) to implement tap-target fixes and replace `window.confirm` for remove; for B, add styling and copy tasks.

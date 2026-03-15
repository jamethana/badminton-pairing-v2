# Moderator Session — Edit Player on Players Tab (Tap Card)

**Date:** 2026-03-15

---

## What We're Building

On the **moderator session** page (`/moderator/sessions/[id]`), when the moderator is on the **Players** tab, tapping a player row opens an edit flow. The user can:

1. **Toggle active** — Mark the player as active or inactive (same "zzz" state as today).
2. **Change skill level** — Set level 1–10 (updates the user's global skill level, same as moderator global players).
3. **Remove from session** — Remove the player from this session, with confirmation.

No display-name editing in this flow. All three actions use existing APIs.

---

## Why This Approach

- **Dialog (modal)** for the edit UI: The same page already uses `Dialog` for AssignmentModal, ResultModal, and quick-result confirmations. Reusing that pattern keeps behavior consistent and avoids introducing a new primitive (e.g. Sheet). Dialog works on mobile with adequate tap targets and focus management.
- **Tap entire row** to open: Matches "tap card" mental model; no need to hunt for a small edit icon. The row can get a subtle tappable affordance (e.g. chevron, or `cursor-pointer` + hover/press state) so it’s clear it’s interactive.
- **Single place for session + skill:** Moderators can fix a typo in skill or toggle active without switching to the Game tab (for remove) or the global players list (for skill). Remove stays in the same modal with a confirm step to avoid accidents.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | Tap the whole player row on the Players tab | "Tap card" = tap row; clear and mobile-friendly. |
| Edit UI | Dialog (modal) | Aligns with existing assign/result dialogs on this page; no new component type. |
| Toggle active | Switch/checkbox in dialog | Explicit; save on change (immediate PATCH). |
| Skill level | Control for 1–10 (e.g. select or number input) | Matches `users.skill_level` and existing moderator players edit; API: `PATCH /api/players/[userId]` with `skill_level`. |
| Remove from session | Button in dialog → confirm (browser confirm or in-dialog) | Reuse same pattern as Game tab remove (confirm then DELETE). After remove, close dialog and update list. |
| APIs | `PATCH /api/sessions/[id]/players/[playerId]` (is_active), `PATCH /api/players/[userId]` (skill_level), `DELETE /api/sessions/[id]/players/[playerId]` | All exist; no backend changes. |
| Where to implement | `court-dashboard-client.tsx` (inline dialog state) or a small `EditSessionPlayerModal` component | Plan can decide; keep state (selected sp, saving, error) local to the session dashboard. |
| Save behavior | Save on change | Toggle active and skill level each trigger an immediate PATCH; no explicit Save button. Matches other quick edits on this page. |
| Row affordance | Tappable only | `cursor-pointer` and subtle active/press state; no chevron or "Edit" label. |

---

## Resolved Questions

- **Save behavior:** Apply on every change (1A). Toggle and skill level send immediately; Remove remains a separate action with confirm.
- **Row affordance:** Tappable row only (2A). Cursor and press state; no chevron.

---

## Out of Scope

- Editing **display name** in this flow (can be added later if needed).
- Changing **session_players** or **users** schema.
- Edit from the **Game** tab (remove stays on Game tab as today; this feature adds edit from Players tab only).

---
## Implementation Sketch

- **Players tab:** Make each player row a `<button>` or tappable `<div>` with `onClick` that sets "selected session player for edit" state. Ensure accessible (role, label, keyboard).
- **Edit dialog:** When a session player is selected, render a `Dialog` (existing shadcn `Dialog`) with:
  - Title: e.g. "Edit [display_name]"
  - Toggle: "Active" (switch bound to `is_active`); on toggle → PATCH session player immediately, then update local state / refetch.
  - Skill: Control for 1–10 (e.g. `<select>` or number input); on change → PATCH `/api/players/[user_id]` with `skill_level` immediately, then update local session players (user is joined) or refetch.
  - Remove: "Remove from session" button → confirm → DELETE session player → close dialog, update list (or refetch).
- **No Save button:** Active and skill save on change; Remove is a separate action with confirm.
- **Row:** Tappable with `cursor-pointer` and subtle active/press state only (no chevron).
- **Loading/error:** Disable controls or show inline saving state per field if desired; on API error, revert or show toast. Realtime will also update the list if another moderator changes the same player.
- **Skeleton:** No new loading state for the list itself; dialog content is synchronous (current player data). Optional: skeleton inside dialog if we ever load extra data there.

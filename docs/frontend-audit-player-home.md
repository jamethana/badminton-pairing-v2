## Frontend Audit – Player Home & Sessions List

**Scope**: Player home route and user sessions list, reviewed against Vercel Web Interface Guidelines and local audit skills.

Routes / components:
- `app/(player)/page.tsx`
- `components/user-sessions-list.tsx`

---

### Anti-Patterns Verdict

- **Verdict**: Pass – UI reads as hand-written Tailwind + shadcn, not generic AI output.
- **Main concerns**: Copy quality in hero (intentional joke for unreleased build), ad-hoc theming, and missing standardized focus-visible patterns.

---

## Detailed Findings by File

### `app/(player)/page.tsx`

#### 1. Content & Copy

- **Severity**: High (for production), but currently intentional / deferred.
- **Status**: **Deferred** – tracked separately; hero copy left as intentional placeholder.

#### 2. Theming & Tokens

- **Severity**: Medium
- **Status**: **Resolved** – replaced `text-gray-900` with `text-foreground` and `text-gray-500` with `text-muted-foreground`. Layout background (`app/(player)/layout.tsx`) changed from `bg-gray-50` to `bg-muted`.

#### 3. Live Session Banner – Visual Design & Reuse

- **Severity**: Medium
- **Status**: **Resolved** – banner refactored to use the new `AlertCard` component (`components/alert-card.tsx`). Uses `Card`, `CardHeader`, `CardContent`, `Badge` internally with design tokens only. No custom green palette.

#### 4. Link Focus & Interaction States

- **Severity**: Low
- **Status**: **Resolved** – `AlertCard` links have explicit `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` styles.

---

### `components/user-sessions-list.tsx`

#### 1. Theming & Design System Usage

- **Severity**: Medium
- **Status**: **Resolved** – component uses `Card`, `CardHeader`, `CardContent` with token-based classes (`bg-card`, `text-foreground`, `text-muted-foreground`). Status pill replaced with `Badge` using semantic variants.

#### 2. Toggle Button – Consistency & Focus

- **Severity**: Medium
- **Status**: **Resolved** – replaced custom `<button>` with `Button` (`variant="outline"`, `size="xs"`), inheriting built-in focus styles.

#### 3. Long-Content Handling in List Rows

- **Severity**: Medium
- **Status**: **Resolved** – added `min-w-0` to text container, `truncate` on `session.name`.

#### 4. Status Badge Semantics & Styling

- **Severity**: Low
- **Status**: **Resolved** – uses `Badge` with variant mapping: `active` → `secondary`, `completed` → `outline`, `draft` → `ghost`.

#### 5. Focus & Interaction States for List Rows

- **Severity**: Low
- **Status**: **Resolved** – link rows use `hover:bg-accent` (theme-aware) and explicit `focus-visible:ring-2 focus-visible:ring-ring` pattern.

---

### `components/moderator-recent-sessions-list.tsx` (light-touch extension)

- **Status**: **Resolved** – full normalization applied:
  - Wrapped in `Card`/`CardHeader`/`CardContent` with token-based classes.
  - Custom `STATUS_STYLES` replaced with `Badge` variant mapping (same as `UserSessionsList`).
  - Custom toggle `<button>` replaced with `Button` (`variant="outline"`, `size="xs"`).
  - Link rows use `hover:bg-accent`, explicit `focus-visible` ring, `min-w-0` + `truncate`.
  - Text colors normalized to `text-foreground` / `text-muted-foreground`.

### Additional light-touch fixes

- `app/sessions/[id]/page.tsx` – `bg-gray-50` → `bg-muted`, heading/meta colors → tokens.
- `app/moderator/sessions/[id]/page.tsx` – heading colors → tokens, status `<span>` → `Badge`.
- `app/moderator/page.tsx` – heading/meta colors → tokens, stat card `bg-white` → `bg-card`, sessions list wrapper removed (component is now self-contained `Card`).
- `app/(player)/stats/page.tsx` and `app/(player)/stats/history/page.tsx` – heading/meta colors → tokens, back-link colors → tokens.
- `app/(player)/loading.tsx` – `bg-white` → `bg-card`.

---

## New Patterns & Components

### `components/alert-card.tsx` – Reusable notice banner

Props:
- `badgeLabel: string` – label text for the badge (e.g. "Live Session")
- `badgeVariant?: BadgeVariant` – shadcn Badge variant (default: `"secondary"`)
- `items: { id: string; label: string; href: string }[]` – list of linked items

Internally composes `Card`, `CardHeader`, `CardContent`, `Badge`, and `Link` with proper focus-visible styles.

### Focus-visible convention

All interactive list rows and inline links should use:
```
outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

### Token mapping reference

| Hard-coded class | Token replacement |
|---|---|
| `text-gray-900` / `text-gray-800` | `text-foreground` |
| `text-gray-500` / `text-gray-400` | `text-muted-foreground` |
| `bg-white` | `bg-card` |
| `bg-gray-50` | `bg-muted` or `bg-background` |
| `hover:bg-gray-50` / `hover:bg-gray-100` | `hover:bg-accent` |
| `border-gray-*` | `border-border` |

### Badge variant mapping for session status

| Status | Variant |
|---|---|
| `active` | `secondary` |
| `completed` | `outline` |
| `draft` | `ghost` |

---

## Remaining Follow-Up Work

1. **Hero copy rewrite** – Replace placeholder intro paragraph with production-quality copy (tracked separately).
2. **Full-app token sweep** – Normalize remaining hard-coded colors across moderator players, session form, result modal, assignment modal, match history list, and other components.
3. **Global focus utility abstraction** – Consider a shared Tailwind plugin or utility class for the focus-visible ring pattern to reduce repetition.
4. **Skeleton loading token normalization** – Loading files still use `bg-gray-200` for shimmer (matches existing `skeleton.tsx` convention); consider migrating both to a token if dark-mode skeletons are needed.

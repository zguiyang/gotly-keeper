# Design System — Gotly Keeper (Ethereal Archive)

## 1. Visual Theme & Atmosphere

Gotly Keeper uses an "Ethereal Archive" design language: a cool-blue Material-influenced system built on precise semantic tokens. The palette is blue-gray rather than warm-neutral, with a clear light/dark mode split. The page background is a near-white cool gray (`#f7f8fa`) in light mode and a deep near-black (`#111417`) in dark mode. Text is a cool near-black (`#191c1e`) rather than warm black.

The primary font is **Inter** for body/UI and **Manrope** for headings — both loaded via CSS. The type scale uses standard rem steps with no aggressive negative letter-spacing. The weight range is 400–700.

Borders use semantic tokens (`--border: #d9dde5` light / `#3a444c` dark) rather than opacity-based whispers. The shadow system uses atmospheric layering with moderate opacity, distinct between light and dark modes.

**Key Characteristics:**
- Inter (body/UI) + Manrope (headings), with PingFang SC / Noto Sans SC CJK fallbacks
- Cool blue-gray palette — no warm undertones
- Primary accent: `#0051b1` (light) / `#a6c8ff` (dark)
- Semantic border tokens, not opacity-based whispers
- Atmospheric shadow system with separate light/dark values
- Base radius token: `0.5rem` (8px)

---

## 2. Color Palette & Roles

### Light Mode (`:root`)

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#f7f8fa` | Page background |
| `--foreground` | `#191c1e` | Primary text |
| `--surface` | `#f8fafc` | Surface layer |
| `--surface-container-lowest` | `#ffffff` | Elevated surface (cards) |
| `--card` | `#ffffff` | Card background |
| `--card-foreground` | `#191c1e` | Card text |
| `--popover` | `#ffffff` | Popover background |
| `--popover-foreground` | `#191c1e` | Popover text |
| `--primary` | `#0051b1` | Primary action color |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--primary-container` | `#0768df` | Primary container / accent |
| `--primary-dim` | `#004aba` | Dimmed primary |
| `--primary-fixed` | `#dae2ff` | Fixed primary tint |
| `--primary-fixed-dim` | `#aec6ff` | Fixed primary dim tint |
| `--secondary` | `#5b6677` | Secondary text / muted action |
| `--secondary-foreground` | `#ffffff` | Text on secondary |
| `--secondary-fixed` | `#edf0f4` | Secondary surface tint |
| `--tertiary` | `#615b77` | Tertiary accent |
| `--tertiary-fixed` | `#c9e6ff` | Tertiary tint |
| `--muted` | `#f3f5f8` | Muted background |
| `--muted-foreground` | `#5f6673` | Muted text |
| `--accent` | `#0768df` | Interactive accent |
| `--accent-foreground` | `#ffffff` | Text on accent |
| `--destructive` | `#ba1a1a` | Error / destructive |
| `--border` | `#d9dde5` | Default border |
| `--input` | `#c8ced8` | Input border |
| `--ring` | `#7aa7e8` | Focus ring |
| `--on-surface-variant` | `#5f6673` | Secondary on-surface text |

#### Sidebar (Light)
| Token | Value |
|-------|-------|
| `--sidebar` | `#f2f4f6` |
| `--sidebar-foreground` | `#191c1e` |
| `--sidebar-primary` | `#0051b1` |
| `--sidebar-primary-foreground` | `#ffffff` |
| `--sidebar-accent` | `#dae2ff` |
| `--sidebar-accent-foreground` | `#003993` |
| `--sidebar-border` | `#d9dde5` |
| `--sidebar-ring` | `#7aa7e8` |

#### Content Type Colors (Light)
| Token | Value | Role |
|-------|-------|------|
| `--type-note` | `#2f3a32` | Note text |
| `--type-note-bg` | `#f6f1e8` | Note background |
| `--type-link` | `#3e5668` | Link text |
| `--type-link-bg` | `#eaf1f5` | Link background |
| `--type-todo` | `#49634a` | Todo text |
| `--type-todo-bg` | `#eef4ea` | Todo background |

---

### Dark Mode (`.dark`)

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#111417` | Page background |
| `--foreground` | `#f4f7fa` | Primary text |
| `--surface` | `#15191d` | Surface layer |
| `--surface-container-lowest` | `#1b2025` | Elevated surface |
| `--card` | `#1b2025` | Card background |
| `--card-foreground` | `#f7f9fb` | Card text |
| `--popover` | `#1b2025` | Popover background |
| `--popover-foreground` | `#f7f9fb` | Popover text |
| `--primary` | `#a6c8ff` | Primary action color |
| `--primary-foreground` | `#071521` | Text on primary |
| `--primary-container` | `#243d5e` | Primary container |
| `--primary-dim` | `#8bb3ff` | Dimmed primary |
| `--primary-fixed` | `#25384c` | Fixed primary tint |
| `--primary-fixed-dim` | `#304c6d` | Fixed primary dim tint |
| `--secondary` | `#a9b0b7` | Secondary text |
| `--secondary-foreground` | `#071521` | Text on secondary |
| `--secondary-fixed` | `#273039` | Secondary surface tint |
| `--tertiary` | `#c6d3ff` | Tertiary accent |
| `--tertiary-fixed` | `#302b4b` | Tertiary tint |
| `--muted` | `#20262c` | Muted background |
| `--muted-foreground` | `#aab2bb` | Muted text |
| `--accent` | `#243d5e` | Interactive accent |
| `--accent-foreground` | `#c6d3ff` | Text on accent |
| `--destructive` | `#ff9b95` | Error / destructive |
| `--border` | `#3a444c` | Default border |
| `--input` | `#46535d` | Input border |
| `--ring` | `#a6c8ff` | Focus ring |
| `--on-surface-variant` | `#aab2bb` | Secondary on-surface text |

#### Sidebar (Dark)
| Token | Value |
|-------|-------|
| `--sidebar` | `#171c21` |
| `--sidebar-foreground` | `#f7f9fb` |
| `--sidebar-primary` | `#a6c8ff` |
| `--sidebar-primary-foreground` | `#003993` |
| `--sidebar-accent` | `#243d5e` |
| `--sidebar-accent-foreground` | `#c6d3ff` |
| `--sidebar-border` | `#303942` |
| `--sidebar-ring` | `#a6c8ff` |

#### Content Type Colors (Dark)
| Token | Value |
|-------|-------|
| `--type-note` | `#ded3c3` |
| `--type-note-bg` | `#302d27` |
| `--type-link` | `#c2d7e2` |
| `--type-link-bg` | `#22313a` |
| `--type-todo` | `#cbdbc5` |
| `--type-todo-bg` | `#253125` |

---

## 3. Typography

### Font Families

| Token | Value | Role |
|-------|-------|------|
| `--font-sans` | `"Inter", "PingFang SC", "Noto Sans SC", sans-serif` | Base sans-serif |
| `--font-mono` | `ui-monospace, "SF Mono", "Fira Code", monospace` | Code / mono |
| `--font-heading` | `"Manrope", var(--font-sans)` | Headings (h1–h6) |
| `--font-headline` | `"Manrope", var(--font-sans)` | Display headlines |
| `--font-body` | `"Inter", var(--font-sans)` | Body text |
| `--font-label` | `"Inter", var(--font-sans)` | Labels / UI text |

### Type Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | `0.75rem` (12px) | Micro labels, timestamps |
| `--text-sm` | `0.875rem` (14px) | Captions, metadata |
| `--text-base` | `1rem` (16px) | Body text |
| `--text-lg` | `1.125rem` (18px) | Large body |
| `--text-xl` | `1.25rem` (20px) | Sub-headings |
| `--text-2xl` | `1.5rem` (24px) | Section headings |
| `--text-3xl` | `1.875rem` (30px) | Page headings |
| `--text-4xl` | `2.25rem` (36px) | Display headings |

### Line Heights

| Token | Value |
|-------|-------|
| `--leading-tight` | `1.25` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.625` |
| `--leading-loose` | `1.8` |

### Base Rules
- `body`: Inter, `line-height: var(--leading-relaxed)` (1.625), `-webkit-font-smoothing: antialiased`
- `h1–h6`: Manrope, `font-weight: 600`, `line-height: var(--leading-tight)` (1.25)
- `.font-label`: Inter, `font-size: var(--text-sm)`, `letter-spacing: 0.01em`

---

## 4. Border Radius

| Token | Value | Tailwind alias | Usage |
|-------|-------|----------------|-------|
| `--radius-sm` | `0.125rem` (2px) | `rounded-sm` | Micro elements |
| `--radius-md` | `0.25rem` (4px) | `rounded` | Buttons, inputs |
| `--radius-lg` | `0.5rem` (8px) | `rounded-lg` | Cards, containers |
| `--radius-xl` | `0.75rem` (12px) | `rounded-xl` | Large cards |
| `--radius-2xl` | `1rem` (16px) | `rounded-2xl` | Featured blocks |
| `--radius-3xl` | `1.5rem` (24px) | `rounded-3xl` | Hero elements |
| `--radius-4xl` | `2rem` (32px) | `rounded-4xl` | Decorative |
| `--radius-full` | `9999px` | `rounded-full` | Pills, badges, avatars |

> Base `--radius` token: `0.5rem` (used by shadcn components as default)

---

## 5. Shadows

### Light Mode
| Token | Value |
|-------|-------|
| `--shadow-soft` | `0 18px 46px -28px rgba(25, 28, 30, 0.18)` |
| `--shadow-elevation-1` | `0 1px 4px -2px rgba(25, 28, 30, 0.1)` |
| `--shadow-elevation-2` | `0 8px 20px -16px rgba(25, 28, 30, 0.16)` |
| `--shadow-elevation-3` | `0 14px 32px -24px rgba(25, 28, 30, 0.2)` |
| `--shadow-note-card` | `0 1px 3px rgba(25, 28, 30, 0.08)` |

### Dark Mode
| Token | Value |
|-------|-------|
| `--shadow-soft` | `0 18px 46px -30px rgba(0, 0, 0, 0.46)` |
| `--shadow-elevation-1` | `0 8px 20px -18px rgba(0, 0, 0, 0.42)` |
| `--shadow-elevation-2` | `0 14px 30px -24px rgba(0, 0, 0, 0.44)` |
| `--shadow-elevation-3` | `0 20px 42px -30px rgba(0, 0, 0, 0.48)` |
| `--shadow-note-card` | `0 1px 3px rgba(0, 0, 0, 0.24)` |

---

## 6. Status & Semantic Colors

| Token | Maps to | Role |
|-------|---------|------|
| `--color-status-pending` | `--secondary` | Pending state |
| `--color-status-success` | `--primary` | Success state |
| `--color-status-error` | `--destructive` | Error state |
| `--color-status-muted` | `--muted-foreground` | Muted/inactive |
| `--color-status-completed` | `--on-surface-variant` | Completed state |
| `--color-status-urgent` | `--destructive` | Urgent/critical |

---

## 7. Layout Principles

### Spacing
- Base unit: 8px (Tailwind default scale)
- Body line-height: 1.625 (relaxed) for comfortable reading

### Grid & Container
- Standard Tailwind container with responsive padding
- Sidebar layout pattern (see `--sidebar` tokens)

### Responsive Breakpoints
Standard Tailwind breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px

---

## 8. Component Defaults

### Buttons
- Primary: `bg-primary text-primary-foreground`, radius `--radius-md` (4px)
- Secondary: `bg-secondary text-secondary-foreground`
- Destructive: `bg-destructive`
- Focus ring: `--ring` token (`#7aa7e8` light / `#a6c8ff` dark)

### Cards
- Background: `--card` (`#ffffff` light / `#1b2025` dark)
- Border: `--border`
- Radius: `--radius-lg` (8px) default, `--radius-xl` (12px) for larger cards

### Inputs
- Background: `--surface-container-lowest`
- Border: `--input`
- Focus ring: `--ring`

### Badges / Pills
- Radius: `--radius-full` (9999px)
- Font size: `--text-xs` (12px), `letter-spacing: 0.01em`

---

## 9. Agent Prompt Guide

### Quick Color Reference (Light Mode)
- Page background: `#f7f8fa`
- Card / elevated surface: `#ffffff`
- Primary text: `#191c1e`
- Secondary text: `#5f6673`
- Primary action: `#0051b1`
- Accent: `#0768df`
- Border: `#d9dde5`
- Focus ring: `#7aa7e8`
- Destructive: `#ba1a1a`
- Muted bg: `#f3f5f8`

### Quick Color Reference (Dark Mode)
- Page background: `#111417`
- Card / elevated surface: `#1b2025`
- Primary text: `#f4f7fa`
- Secondary text: `#aab2bb`
- Primary action: `#a6c8ff`
- Accent: `#243d5e`
- Border: `#3a444c`
- Focus ring: `#a6c8ff`
- Destructive: `#ff9b95`

### Iteration Rules
1. Use cool blue-gray palette — no warm undertones
2. Headings: Manrope weight 600, `line-height: 1.25`
3. Body: Inter weight 400, `line-height: 1.625`
4. Primary blue is `#0051b1` (light) / `#a6c8ff` (dark) — not Notion Blue
5. Default card radius is `0.5rem`; pills use `9999px`
6. Shadows use `rgba(25, 28, 30, ...)` in light mode, `rgba(0, 0, 0, ...)` in dark mode
7. Always use semantic CSS tokens (`--primary`, `--border`, etc.) over raw hex values in components

# Frontend Architecture Principles (AI-Executable, Naming-Agnostic)

## 1. Purpose

This document defines frontend architecture through behavior boundaries rather than frameworks, directories, naming conventions, or specific tools.

It is reusable across:

- frontend-backend separated applications
- full-stack applications
- SSR applications
- SPA applications
- desktop-like web applications
- embedded frontend modules

The goal is to keep frontend systems:

- maintainable
- replaceable
- behaviorally consistent
- low in cognitive overhead
- stable as they grow

This document is naming-agnostic and framework-agnostic by design.

---

## 2. Core Principles

### 2.1 Behavior and Presentation Separation

Frontend code must separate behavior from presentation.

Rules:

- view is responsible for rendering
- logic is responsible for decisions and state transitions
- data is responsible for external access and synchronization
- styles are responsible for appearance only

Meaning:

- components must not contain business logic
- rendering code must not decide data policy, async policy, or state ownership
- style must not become a hidden carrier of logic

### 2.2 Only Three Behavior Types

All frontend code must belong to exactly one behavior type:

1. **View code**  
   Renders UI and emits user intent.
2. **Logic code**  
   Controls interaction behavior, state transitions, and async flow decisions.
3. **Data code**  
   Interacts with external systems, persistence, and remote state.

This classification is conceptual, not structural. It does not prescribe directories or filenames.

### 2.3 Single-Behavior Unit Rule (Hard Constraint)

A code unit must implement only one behavior type.

A unit may be:

- a file
- a class
- a function
- a module
- a component
- a reusable helper abstraction

Rules:

- do not mix rendering, logic orchestration, and external data access in the same unit
- if behavior mixing appears, split the unit before merge
- mixed-behavior units fail architecture review by default

Clarification:

- Simple event binding, prop shaping, view-model mapping, and calling a hook from a component do not count as mixed behavior by themselves.
- Split only when a unit owns substantial rendering plus substantial orchestration or external data policy.
- Do not introduce thin files whose only purpose is to satisfy labels when a direct component or hook remains easier to understand.

Forbidden mixing examples:

- a component that renders UI and directly fetches remote data
- a hook/helper that both controls interaction flow and performs rendering
- a reusable function that both transforms data and mutates shared UI state implicitly

### 2.4 Unidirectional Flow Rule

Frontend flows must follow this direction:

```text
User -> View -> Logic -> Data -> Logic -> View
```

Rules:

- do not bypass Logic to let View call Data directly
- do not let Data mutate View state directly
- all external responses re-enter through Logic before reaching View

### 2.5 Ownership Clarity Rule

State and decision ownership must be explicit.

Rules:

- each state has one owning logic unit
- shared state changes must have one explicit coordination boundary
- "who updates this state and why" must be answerable from code structure

### 2.6 Boundary Translation Rule

Different layers should not leak raw models across boundaries.

Rules:

- View models are for rendering only
- Logic models are for behavior decisions
- Data models are for transport, cache, persistence, and provider contracts
- conversion is explicit at boundaries

---

## 3. Behavior Definitions

### 3.1 View Code

Responsibilities:

- render UI from given state
- emit user intent events
- keep markup and style composition clear

Forbidden:

- direct remote calls
- data persistence operations
- business decision branching
- hidden side effects unrelated to rendering

### 3.2 Logic Code

Responsibilities:

- own interaction state
- decide transitions and async lifecycle
- coordinate between view intent and data capabilities

Allowed:

- process-level branching, retries, cancellation, optimistic update policy
- adapting data responses into view-ready state

Forbidden:

- direct rendering responsibilities
- direct style concerns
- embedding provider-specific transport details

### 3.3 Data Code

Responsibilities:

- communicate with APIs, storage, and external systems
- map transport details to internal data contracts
- implement data capability contracts required by Logic

Forbidden:

- deciding UI behavior policy
- rendering concerns
- owning user-interaction state transitions

---

## 4. UI Implementation and Styling Placement Rules

This repository separates two decisions:

1. **Component selection:** use shadcn/ui first for UI primitives and product
   interface building blocks.
2. **Style expression:** use Tailwind utilities first for styling, layout, and
   state presentation instead of custom CSS.

These rules apply to all frontend UI work, including work produced through
design, layout, polish, redesign, or animation skills.

### 4.1 shadcn/ui-First Implementation Rule

Use shadcn/ui components as the default building blocks for product UI.

Component implementation order:

1. **Direct shadcn/ui component:** use a shadcn/ui component directly when it
   fits the UI need, such as a button, card, dialog, menu, input, checkbox,
   badge, separator, skeleton, alert, or textarea. If the needed primitive is
   not installed but exists in shadcn/ui, add it through the approved shadcn
   workflow before building a custom equivalent.
2. **Composed shadcn/ui implementation:** when one direct component is not
   enough, compose the UI from shadcn/ui primitives plus Tailwind `className`
   styling and minimal DOM wrappers as needed. Use this for forms, grouped
   controls, page sections, panels, toolbars, and locally adjusted variants.
3. **Fully custom Tailwind/DOM implementation:** only when the first two layers
   cannot reasonably express the interaction, structure, or visual requirement,
   build the UI manually with Tailwind utilities and DOM elements. Even then,
   keep using shadcn/ui primitives for any available controls inside the custom
   structure.

Rules:

1. Do not hand-roll controls that already exist as shadcn/ui primitives, such
   as buttons, inputs, dialogs, menus, checkboxes, toggles, badges, separators,
   skeletons, alerts, cards, and form field structure.
2. Do not switch between shadcn/ui and fully custom markup for equivalent UI
   patterns in the same feature. Pick one shared composition and reuse it.
3. Use built-in shadcn/ui variants and composition APIs before adding visual
   overrides.
4. Create local wrapper components outside `components/ui/**` when repeated
   shadcn composition becomes a product pattern.
5. Fully custom Tailwind/DOM is an exception path, not a peer default. Before
   using it for a reusable or interactive UI element, the agent must be able to
   state why direct shadcn/ui and composed shadcn/ui were not sufficient.

### 4.2 Tailwind-First Styling Rule

Prefer Tailwind utilities in `className` for ordinary presentation concerns
on shadcn/ui components, local shadcn-based compositions, layout wrappers, and
custom DOM exceptions.

Use Tailwind utilities for:

- layout
- spacing
- sizing
- width and max-width
- responsive behavior
- typography
- colors from existing theme tokens
- borders and radii
- shadows
- transitions
- hover, active, focus, and disabled states
- reduced-motion variants when Tailwind can express the behavior clearly

Rules:

1. Do not create custom CSS selectors when Tailwind utilities can express the
   same behavior clearly.
2. Use Tailwind to adapt layout, spacing, sizing, state, and responsive behavior
   around shadcn/ui components.
3. Prefer `cn()` or local component composition when class lists become
   conditional or repeated.
4. Extract a local component when repeated Tailwind class composition becomes
   hard to read.
5. Do not move page-specific or component-specific styling into global CSS just
   to shorten JSX.
6. Do not implement an available shadcn/ui primitive with raw DOM merely because
   Tailwind can style the raw DOM.

### 4.2.1 Design Token Source-of-Truth Rule

Design tokens are the only default color source for frontend UI.

Purpose:

- keep contrast decisions centralized
- make light/dark theme changes work through one token system
- preserve shadcn/ui semantic-token behavior
- avoid one-off page colors that cannot be audited or themed reliably

Rules:

1. Define real color values in the global design-token surface only.
2. In pages, components, hooks, client code, and frontend config, express color
   through Tailwind utilities backed by semantic tokens.
3. Prefer semantic token utilities such as `bg-background`, `text-foreground`,
   `text-muted-foreground`, `border-border`, `ring-primary/30`,
   `bg-primary/10`, `from-primary`, and `to-primary-container`.
4. Do not use raw color literals in frontend implementation files, including
   hex values, `rgb()`/`rgba()`, `hsl()`/`hsla()`, or arbitrary Tailwind color
   utilities such as `text-[#54647a]`.
5. Do not use Tailwind built-in palette utilities for product UI colors, such
   as `bg-amber-50`, `text-emerald-700`, `border-slate-200`, `text-white`, or
   `bg-black/30`.
6. For status UI, use semantic status tokens instead of palette colors:
   `status-pending`, `status-success`, `status-error`, and `status-muted`.
7. If a repeated product pattern needs a new color role, add or request a
   semantic token instead of choosing a local palette color.
8. If custom CSS is necessary, use theme variables such as `var(--primary)`,
   `var(--background)`, or `var(--status-success)` inside the CSS rather than
   hardcoded color values.

Allowed exceptions:

- global token definitions in `app/globals.css`
- external brand colors or user-supplied content colors that must remain exact
- CSS effects that cannot be expressed clearly with token utilities, such as
  complex masks, glows, or gradients, when they are still based on theme
  variables where possible
- explicitly user-approved one-off visual exceptions

Exception requirements:

1. The user must approve the exception before implementation.
2. The code must keep the exception local to the owning UI.
3. The exception line must include `DESIGN_TOKEN_EXCEPTION:` with a short reason.
4. When possible, the exception must still derive from theme variables rather
   than raw color literals.

### 4.3 Global CSS Boundary Rule

`app/globals.css` is a shared system surface, not a page styling file.

Allowed in `app/globals.css`:

- Tailwind, animation, and shadcn imports
- Tailwind v4 `@theme` registrations
- `:root` and `.dark` semantic tokens
- global design tokens intentionally used across the application
- `@layer base` element defaults
- truly reusable global utilities used across multiple routes or component
  families
- browser primitives that Tailwind cannot express cleanly

Forbidden in `app/globals.css`:

- page-specific selectors
- route-specific selectors
- one-off component selectors
- page layout classes such as custom containers, grids, section spacing, and
  responsive rules that are used by only one route
- hover, focus, animation, or media-query behavior for a single page or a single
  component

Before editing `app/globals.css`, the agent must be able to state why the new
style is globally reusable or impossible to express cleanly with Tailwind.

### 4.4 Custom CSS Exception Rule

Custom CSS is allowed only when it is the smallest clear solution.

Allowed exceptions:

- pseudo-elements that materially simplify markup
- keyframes or complex animations not covered by Tailwind utilities
- masks, advanced gradients, `color-mix()`, or other browser features that are
  clearer as CSS than as arbitrary Tailwind values
- shared primitives that are used in multiple independent UI areas
- framework or library integration requirements

Rules:

1. Keep custom CSS as close to the owning UI as the stack reasonably allows.
2. If custom CSS is page-specific, prefer a page-local component abstraction over
   `app/globals.css`.
3. If a custom selector is global, give it a generic reusable name rather than a
   route-specific prefix.
4. Do not use custom CSS as a substitute for ordinary Tailwind responsive,
   spacing, sizing, or layout utilities.

### 4.5 Design Skill Boundary Rule

Design skills may improve visual direction, hierarchy, interaction, and polish,
but they do not override this repository's shadcn/ui-first component selection
rules or Tailwind-first styling placement rules.

Rules:

1. A design skill must work through the existing Tailwind/shadcn styling system
   unless the user explicitly approves a different styling approach.
2. A design skill must not replace available shadcn/ui controls with fully
   custom DOM just to achieve a visual effect.
3. Design tokens belong in global CSS only when they are intended for repeated
   cross-application use.
4. Page-specific visual treatments belong in JSX class composition or local
   components, not in `app/globals.css`.
5. If a design skill suggests custom markup or global CSS for convenience, treat
   that suggestion as advisory and apply this file's stricter implementation and
   placement boundaries.

### 4.6 shadcn/ui Primitive Boundary Rule

Files under `components/ui/**` are foundational UI primitives. Treat them as
design-system source, not feature implementation files.

Default rule:

- do not modify `components/ui/**` for page-specific or feature-specific
  styling, layout, copy, behavior, or state needs

Prefer:

- composing existing primitives at the usage site
- creating app-level or feature-level wrapper components outside
  `components/ui/**`
- using existing variants, semantic tokens, and `className`
- changing shared design tokens only when the intended effect is
  application-wide

Allowed exceptions:

- the user explicitly requests a `components/ui/**` change
- the task is an intentional shadcn/ui registry update with reviewed diffs
- a confirmed primitive-level bug cannot be fixed cleanly at the usage site
- the change is an intentional design-system-wide behavior or style change

Before modifying `components/ui/**`, the agent must state why the change cannot
be made through composition, a wrapper, existing variants, semantic tokens, or a
usage-site `className`.

### 4.7 UI Decision Trace Rule

For any non-trivial UI implementation or refactor, include a short decision
trace in the conversation before editing:

- direct shadcn/ui components being used
- local shadcn-based compositions being created or reused
- any custom DOM/Tailwind exception and why shadcn/ui is insufficient
- any `components/ui/**` change and why a wrapper or usage-site composition is
  insufficient

Keep the trace brief. Its purpose is to prevent implementation drift, not to
create durable documentation.

---

## 5. Review and Enforcement Rules

### 5.1 Merge Gate

Changes fail architecture review when:

- one unit mixes multiple behavior types
- flow direction is bypassed
- ownership of state or decisions is ambiguous
- an available shadcn/ui primitive is replaced with custom DOM without a
  justified exception
- equivalent UI patterns in the same feature mix shadcn/ui composition and
  hand-rolled markup without a shared local abstraction
- frontend implementation files introduce raw colors, Tailwind built-in color
  palettes, or arbitrary color utilities without a user-approved
  `DESIGN_TOKEN_EXCEPTION:`
- page-specific or component-specific styling is added to `app/globals.css`
  without a valid global-CSS exception
- Tailwind-expressible layout, responsive, spacing, sizing, or state styling is
  moved into custom CSS selectors
- `components/ui/**` is modified for feature-specific styling, layout, copy,
  behavior, or state without an allowed primitive-boundary exception

### 5.2 AI Implementation Checklist

Before generating frontend code:

1. classify each new/changed unit as View, Logic, or Data
2. verify each unit owns one behavior type only
3. verify flow is `User -> View -> Logic -> Data -> Logic -> View`
4. verify boundary model conversion is explicit
5. verify state ownership and transition ownership are explicit
6. choose UI components through the three-layer shadcn/ui order:
   direct shadcn/ui component, composed shadcn/ui implementation, then fully
   custom Tailwind/DOM exception
7. verify Tailwind utilities support shadcn composition and ordinary styling
   instead of replacing available primitives
8. verify any custom DOM/Tailwind exception has a brief reason
9. verify colors come from semantic design tokens or have a user-approved
   `DESIGN_TOKEN_EXCEPTION:`
10. verify status UI uses `status-pending`, `status-success`, `status-error`,
   or `status-muted` tokens instead of Tailwind built-in palette colors
11. verify any `app/globals.css` edit is globally reusable or justified by a
   custom-CSS exception
12. verify any `components/ui/**` edit is justified by an allowed
   primitive-boundary exception

Before committing frontend UI changes:

1. run `bash .ai-rules/advanced-workflows/guards/check-design-token-usage.sh --staged`
2. fix token bypasses instead of suppressing the guard
3. use `DESIGN_TOKEN_EXCEPTION:` only for user-approved special cases

---

## 6. Relation to Repository-Specific Rules

This file defines behavior-first frontend architecture principles.

Repository-specific placement rules (such as exact directories for components, hooks, and client adapters) should be defined in repository-specific files and must remain consistent with this document.

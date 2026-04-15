# Universal Development Boundary Rules

## 1. Purpose

This document defines a reusable development philosophy for turning any idea into maintainable software.

It is intentionally framework-agnostic. Use it to guide AI before implementing features, systems, flows, tools, services, or user experiences in any project.

The goal is not to maximize abstraction. The goal is to produce software with clear ownership, stable boundaries, simple collaboration paths, and minimal structural confusion.

## 2. Core Philosophy

Before implementation, AI must decide:

1. what responsibility exists
2. which layer owns that responsibility
3. whether the code is local, shared, or global
4. how other parts of the system are allowed to interact with it

This philosophy can be summarized as:

- separate behavior, structure, and presentation
- keep related things together
- move only proven common capabilities upward
- keep entry points thin
- keep domain rules inside domain ownership
- cross boundaries through explicit interfaces, not internal shortcuts
- prefer focused centralized ownership over scattered duplication

## 3. Universal Layer Model

The exact directory names may vary by project, but the responsibilities should remain stable.

### 3.1 Presentation Layer

Owns rendering, display, visual structure, and output formatting.

Examples:

- UI components
- view templates
- presentational pages or screens
- display-only render helpers

Must not own:

- business rules
- persistence logic
- cross-module orchestration
- infrastructure calls

### 3.2 Interaction Layer

Owns user interaction, local state transitions, event handling, input flows, and client-side behavior.

Examples:

- hooks
- action wrappers
- form state handlers
- event utilities
- client-side submit flows

Must not own:

- deep domain rules
- direct infrastructure logic unless the architecture explicitly allows it
- large rendering responsibilities

### 3.3 Composition Layer

Owns assembly.

It composes modules, data, and views into a coherent flow or screen.

Examples:

- route/page assembly
- workflow composition
- feature entry modules
- screen coordinators

Must not become:

- a business logic sink
- a hidden infrastructure layer
- a place where unrelated logic accumulates

### 3.4 Application Layer

Owns orchestration across modules and use-case execution.

Examples:

- use-cases
- coordinators
- workflow services
- task orchestration modules

Responsibilities:

- sequence work
- coordinate multiple domain capabilities
- translate inputs and outputs between layers
- manage business flow

Must not own:

- rendering
- low-level infrastructure details
- another module's private data structures

### 3.5 Domain Layer

Owns business meaning.

Examples:

- business services
- domain models
- rule evaluators
- entity-specific operations

Responsibilities:

- domain rules
- business semantics
- domain-specific validation
- business-specific transformations

Must not own:

- view concerns
- generic infrastructure setup
- unrelated cross-domain access through internal shortcuts

### 3.6 Infrastructure Layer

Owns technical capabilities and external integrations.

Examples:

- database access
- cache clients
- email providers
- file storage
- queues
- third-party API adapters
- providers

Responsibilities:

- provide technical capabilities
- hide setup and connection details
- expose stable technical interfaces upward

Must not own:

- business rules
- page logic
- product semantics that belong to the domain

### 3.7 Shared Layer

Owns real cross-boundary shared assets.

Examples:

- shared types
- cross-runtime constants
- protocol schemas
- neutral helpers used by multiple sides of the system

Must not become:

- a dumping ground
- a second global directory
- a hidden business layer

Only put code here when it is genuinely shared across boundaries.

### 3.8 Global Layer

Owns stable cross-project or cross-application definitions.

Examples:

- global config
- stable platform constants
- application-wide policies

Global does not mean convenient. Global means broadly applicable and stable.

## 4. Ownership Rules

AI must place code by ownership, not by convenience.

Rules:

1. Business-specific code stays with the business it belongs to.
2. Cross-business code may move upward only after proving stable reuse.
3. Cross-boundary code belongs in the shared layer only when multiple sides genuinely need it.
4. Global code must stay small and stable.
5. If something is only used by one business area, keep it local.

## 5. Boundary Rules

### 5.1 Thin Entry Points

Entry points should stay light.

Examples:

- pages
- routes
- controllers
- actions
- handlers
- middleware entry modules

They may:

- validate input
- authorize or authenticate
- invoke orchestration
- shape responses
- assemble modules

They must not become the primary home for deep business logic.

### 5.2 Cross-Business Access Rule

One business area must not directly manipulate another business area's internal data structures or internal models.

Allowed:

- calling another business area's exposed service or capability

Forbidden:

- bypassing the owning module and touching its private data structures directly

### 5.3 Shared Means Shared

Do not move code into a shared layer just because reuse feels possible.

Promote code to shared only when:

- it is already used by multiple boundaries
- the abstraction is stable
- the code remains neutral and not business-specific

### 5.4 Infrastructure Must Stay Generic

Infrastructure modules may know how to talk to systems.

They must not decide product meaning that belongs to domain logic.

### 5.5 Presentation Must Stay Focused

Presentation modules may structure and render.

They must not silently absorb orchestration or business rules.

## 6. Placement Rules

When introducing new code, AI must decide placement in this order:

1. Is this display/presentation?
2. Is this interaction/state handling?
3. Is this composition/assembly?
4. Is this application orchestration?
5. Is this domain behavior?
6. Is this infrastructure capability?
7. Is this truly shared?
8. Is this truly global?

Only after answering these questions should AI choose a file or directory location.

## 7. Reuse Rules

Reuse should be earned, not assumed.

Rules:

1. Keep code local when reuse is uncertain.
2. Promote code upward only after repeated or stable reuse appears.
3. Do not create global abstractions for hypothetical future needs.
4. Do not duplicate stable shared contracts once they are proven.
5. Prefer one canonical definition over multiple near-duplicates.

## 8. Constants, Types, and Utilities

These must also follow ownership rules.

### 8.1 Constants

- business constants stay with the business
- cross-boundary constants go to shared
- application-wide constants go to global config

### 8.2 Types and Schemas

- business-local types stay near the business
- cross-boundary contracts go to shared
- framework-specific transport shapes stay near the transport boundary

### 8.3 Utilities

- local helper if only one module or business owns it
- shared helper only if it is neutral and reused across boundaries
- do not hide business semantics inside generic utility names

## 9. Middleware, Interceptors, and Wrappers

These follow the same philosophy.

They are boundary tools, not business containers.

They may:

- intercept
- validate
- enrich context
- enforce cross-cutting policy
- log
- normalize responses

They must not become a hidden home for unrelated business logic.

## 10. AI Execution Rules

Before implementing any new idea, AI must:

1. identify the responsibilities involved
2. map each responsibility to a layer
3. determine which parts are local, shared, or global
4. decide the allowed collaboration path between layers
5. keep the number of layers minimal but the boundaries explicit
6. only then begin implementation

If the correct ownership is unclear, AI must resolve placement before writing code.

## 11. Smell Detection

These are signs the structure is drifting:

- one module handles rendering, orchestration, and domain logic together
- an entry layer keeps growing business branches
- a shared module contains obvious business semantics
- one business area reaches into another area's private internals
- infrastructure modules begin making domain decisions
- constants or types are duplicated across layers
- a global directory becomes a convenience dump
- code is moved upward before stable reuse exists
- related code is split apart for aesthetic reasons instead of real boundary needs

When these signs appear, AI should simplify and relocate code instead of preserving the drift.

## 12. Design Goal

The target is not maximum abstraction.

The target is:

- clear ownership
- stable collaboration paths
- minimal duplication
- easy understanding
- easy change
- simple, centralized, and predictable structure

## 13. Boundary Exception Protocol

When implementation appears to require crossing established boundaries:

### 13.1 Decision Requirements

Before creating any exception, the executor must document:
1. Why the boundary crossing is necessary
2. Which direction the dependency flows (who owns what)
3. What the rollback or convergence plan is

### 13.2 Allowable Pattern Requirements

A boundary exception is only acceptable when all conditions are met:
- ownership remains explicit
- dependency direction remains consistent with layer intent
- the exception does not expose private internals of another module
- the exception is time-bounded and reversible

### 13.3 Temporary Fallback Conditions

If a clean split cannot be completed immediately:

1. Introduce a minimal, explicit interface at the boundary
2. Mark the exception with a clear convergence TODO and owner
3. Record expiration criteria for removing the exception
4. Schedule mandatory resolution in the next execution window

The fallback must NOT:
- use broad "allow all" patterns
- leave exceptions permanently unresolved
- normalize shortcut dependencies as standard design

### 13.4 Verification Requirement

All exception decisions must be verifiable by project-level boundary checks.

## 14. Module Split Decision Rule

Module split is a governance decision, not a file-count formula.

Do not use fixed numeric thresholds as mandatory split triggers.

When deciding whether to split a module, evaluate these three dimensions first:

- maintainability: can a developer locate and change behavior with low cognitive load?
- simplicity: is the current structure still understandable without hidden coupling?
- extensibility: can new capabilities be added without broad cross-module edits?

Use module size (files/functions) only as a signal, never as the final verdict.

Split when responsibility boundaries are mixed, ownership is ambiguous, or changes repeatedly require unrelated edits.

Do not over-split when cohesion is high and change paths remain clear.

There is no perfect split. Choose the structure that best balances maintainability, simplicity, and extensibility under current business needs.

## 15. One-Sentence Summary

For any idea, AI must first determine responsibility, ownership, boundary, and reuse level; keep business logic cohesive, shared logic truly shared, infrastructure generic, entry points thin, and cross-boundary collaboration explicit.

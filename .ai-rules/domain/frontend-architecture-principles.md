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

## 4. Review and Enforcement Rules

### 4.1 Merge Gate

Changes fail architecture review when:

- one unit mixes multiple behavior types
- flow direction is bypassed
- ownership of state or decisions is ambiguous

### 4.2 AI Implementation Checklist

Before generating frontend code:

1. classify each new/changed unit as View, Logic, or Data
2. verify each unit owns one behavior type only
3. verify flow is `User -> View -> Logic -> Data -> Logic -> View`
4. verify boundary model conversion is explicit
5. verify state ownership and transition ownership are explicit

---

## 5. Relation to Repository-Specific Rules

This file defines behavior-first frontend architecture principles.

Repository-specific placement rules (such as exact directories for components, hooks, and client adapters) should be defined in repository-specific files and must remain consistent with this document.

# Backend Architecture Principles (AI-Executable, Naming-Agnostic)

## 1. Purpose

This document defines backend architecture guidance through behavior and boundaries, not directory names.

Use it to keep the backend maintainable, replaceable, and low in cognitive overhead as the codebase grows.

---

## 2. Core Principles

### 2.1 Business-First

Every backend change must answer:

- What business problem does this solve?

Code without clear business intent should not be merged.

### 2.2 Only Three Behavior Types

All backend code must belong to exactly one behavior type:

1. **Business-rule code**: expresses domain meaning and state rules.
2. **Flow-orchestration code**: coordinates steps and module collaboration.
3. **Technical-capability code**: integrates with storage, network, and external systems.

### 2.3 Dependency Converges to Business Meaning

- Technical code may depend on business definitions.
- Business-rule code must not depend on technical implementations.

In short: business must not be aware of databases, frameworks, SDKs, or third-party vendors.

### 2.4 Single-Behavior Unit Rule (Hard Constraint)

A code unit (file, class, or function) must implement only one behavior type.

Rules:

- do not mix business-rule logic, flow-orchestration logic, and technical-capability logic in one unit
- if mixing appears, split the unit before merge
- mixed-behavior units fail architecture review by default

Clarification:

- Small boundary glue such as payload shaping, mapper calls, error translation, and dependency injection does not count as mixed behavior by itself.
- Split only when the unit owns substantial decisions from more than one behavior type.
- Do not create extra files solely to satisfy labels when the direct version is clearer and still preserves dependency direction.

### 2.5 Boundary Coordinator Rule (Hard Constraint)

Only flow-orchestration code may coordinate between business-rule code and technical-capability code.

Rules:

- business-rule code must not call technical-capability implementations directly
- business-rule code may depend on business-defined contracts/interfaces and pure domain types
- technical-capability code must not orchestrate business flows
- boundary crossing without orchestration is forbidden

---

## 3. Behavior Definitions and Boundaries

### 3.1 Business-Rule Code

Responsibilities:

- define domain rules and invariants
- determine valid state transitions
- express domain constraints and semantics

Allowed:

- domain conditions, state machines, policy rules

Forbidden:

- direct database access
- direct HTTP/SDK calls
- framework runtime objects
- direct dependency on Redis/AI/OSS/external providers

### 3.2 Flow-Orchestration Code

Responsibilities:

- sequence business actions
- coordinate multiple modules
- manage execution policy and lifecycle

Allowed:

- invoke business-rule code
- manage transaction scope
- manage idempotency, retry, timeout, compensation policy

Forbidden:

- introducing new core business rules/invariants
- direct low-level DB/cache/network implementation details
- subtle domain-rule drift via orchestration branching on raw domain state

Branching constraint:

- orchestration may branch on process policy (retry/timeout/idempotency/compensation) and explicit business outcomes
- domain-state decisions must be delegated to business-rule code

### 3.3 Technical-Capability Code

Responsibilities:

- interact with external systems and infrastructure

Includes:

- database access
- cache access
- AI and model calls
- external APIs and providers
- third-party SDK/client instance creation and provider configuration

Allowed:

- persistence/network implementation details
- protocol mapping and serialization

Forbidden:

- defining domain meaning
- making business decisions
- deciding business flow semantics

---

## 4. Contract (Port) Rule

Business and technology must connect through explicit contracts.

Rules:

1. Contracts are defined by the business side (domain/use-case needs).
2. Technical-capability code implements those contracts.
3. Contracts must not be defined by vendor-specific implementations.
4. Contracts must be capability-focused and minimal.
5. Large multi-purpose contracts are forbidden.

Contract granularity constraints:

- each contract should represent one cohesive capability
- avoid "god interfaces" that combine unrelated responsibilities
- when a contract grows across unrelated concerns, split it before extension

Contract location constraint:

- contracts live in business-owned context (domain/use-case side), never in technical integration modules
- technical modules may implement and reference contracts, but must not become the source of contract truth

Meaning:

- technology depends on business-defined interfaces
- business does not depend on technology details

---

## 5. Model Boundary Rule

Keep these model types explicit and separate:

1. **Business model**: domain meaning and rules.
2. **Flow I/O model**: orchestration/API input and output shapes.
3. **Technical model**: storage/cache/provider payloads.

Mandatory constraints:

- do not reuse one model across all three contexts
- convert explicitly between model boundaries
- do not leak storage/provider fields into business models
- model conversion at boundaries is mandatory (no implicit pass-through)
- boundary code that skips conversion fails review by default

Conversion-cost constraints:

- convert at boundary entry/exit, not repeatedly inside the same boundary
- avoid over-conversion when no boundary crossing occurs
- prefer stable mappers per boundary instead of ad hoc scattered conversions

Read/write constraints:

- write paths must enforce business invariants through business-rule code
- read paths may use dedicated read models, but must not mutate domain state
- read optimization must not bypass ownership of write-side invariants

---

## 6. Error Semantics Rule

Use layered error semantics:

1. **Business errors**: expected domain violations.
2. **Flow errors**: orchestration failures and process policy failures.
3. **Technical errors**: external dependency failures.

Rules:

- define errors in the layer where they originate
- translate errors at boundaries; do not leak internal technical detail upward
- expose safe and stable public error messages/codes at entry boundaries
- raw technical errors must never cross public or business boundaries unchanged
- boundary translation is mandatory, not optional

---

## 7. Consistency and Reliability Rule

Flow-orchestration code owns execution reliability policies:

- transaction boundaries
- idempotency keys and deduplication behavior
- retry and backoff policy
- timeout and compensation strategy

Technical-capability code executes; it does not decide business reliability semantics.

Failure-first constraints:

- design assumes dependency failure as a normal condition, not an exception case
- partial success behavior must be explicitly defined for multi-step flows
- rollback/compensation strategy must be explicit when atomicity is not guaranteed
- retry must be policy-driven and bounded; infinite retries are forbidden
- non-recoverable errors must not be retried

Retry prioritization constraints:

- retry only for recoverable/transient failures (network timeout, temporary unavailability, contention)
- fail fast for non-recoverable failures (validation/domain violations, auth/permission denial, permanent contract mismatch)

Concurrency constraints:

- flows with parallel steps must define conflict strategy (locking, compare-and-set, version checks, or idempotent merge rules)
- shared mutable state updates require explicit race-condition handling
- hidden implicit ordering assumptions are forbidden

---

## 8. Observability Rule

Backend flows must be traceable in production.

Minimum requirements:

- per-request or per-flow correlation id
- structured logs on major flow stages (machine-readable fields required)
- explicit failure reason categories
- stable event names for key lifecycle transitions (start/success/failure)

Security requirements:

- do not log secrets or sensitive payloads by default
- expose only necessary diagnostics at public boundaries

Enforcement constraints:

- free-form logging without key fields is insufficient for critical flows
- critical flows must emit machine-consumable signals, not only human text logs

Cost-control constraints:

- observability must define sampling/rate-limit strategy for high-volume success events
- error and anomaly signals must remain unsampled or minimally sampled by policy
- logging volume must be bounded to prevent operational overload

Critical-flow definition:

A flow is critical if one or more of these apply:

- directly affects money, permissions, security, or irreversible state mutation
- fan-out failure can impact many users or downstream systems
- failure requires manual recovery or causes externally visible data inconsistency

---

## 9. Evolution Rule

When requirements grow:

1. prefer extending existing boundaries before introducing new structural categories
2. avoid temporary cross-boundary shortcuts becoming permanent architecture
3. if a cross-boundary pattern repeats, formalize it as a stable contract

The target is long-term clarity, not short-term convenience.

Anti-shortcut rule:

- temporary cross-boundary implementations require explicit owner, expiry date, and removal plan
- shortcut code without lifecycle metadata is not allowed

Escalation path for shortcut violations:

- violation must block merge unless explicitly approved by designated architecture owner
- approval must include risk note and a scheduled cleanup milestone
- expired shortcuts without active exception are treated as architecture defects

Cognitive-load rule:

- new abstractions must reduce net complexity; abstraction without clear payoff is forbidden
- if a pattern can be understood faster in direct form, prefer direct form
- architecture quality is measured by comprehension speed and safe changeability

Enforceable cognitive-load heuristics:

- each unit should have a single primary reason to change
- avoid abstraction layers that are used by only one caller without clear near-term reuse
- when two designs are equivalent, choose the one with fewer concepts and shorter reasoning path

Shared mutable utility prohibition:

- shared helpers must be stateless by default
- shared mutable utility/state containers are forbidden unless concurrency and ownership are explicitly documented
- hidden cross-flow coupling through mutable helper state is not allowed

---

## 10. Entry Boundary Rule

Entry boundaries are all external triggers into backend behavior, including:

- HTTP/API handlers
- scheduled/background jobs
- queue/event consumers
- CLI/maintenance command entry points

Rules:

- every entry boundary must enforce input validation, safe error mapping, and observability initialization (correlation id)
- raw technical errors must not escape entry boundaries
- entry boundaries must call orchestration code rather than embedding deep flow logic

---

## 11. State Mutation Visibility Rule

Rules:

- a state mutation is externally visible only after its defined consistency point is reached
- flows must define visibility timing (immediate, after commit, after projection/event propagation)
- do not expose partially committed state as final success
- if eventual consistency is used, client-facing semantics must be explicit

---

## 12. Testing Alignment Rule

Architecture boundaries must be reflected in tests.

Rules:

- business-rule tests verify domain logic without technical dependencies
- orchestration tests verify sequencing/reliability policy and boundary translation
- technical tests verify integration behavior with external systems
- end-to-end/flow tests verify entry boundaries, error mapping, and visibility semantics
- tests must not normalize boundary violations as acceptable design

---

## 13. Review Checklist (AI and Human)

Before merging, verify:

1. Is this code clearly one of the three behavior types?
2. Does it stay within its boundary responsibilities?
3. Does dependency direction still converge to business meaning?
4. Are contracts business-defined and technology-implemented?
5. Are models explicitly separated and converted?
6. Are error semantics layered and boundary-safe?
7. Are reliability policies owned by orchestration code?
8. Is observability sufficient and safe?
9. Does this change reduce, not increase, cognitive burden?
10. Is behavior-type mixing fully eliminated in each code unit?
11. Are boundary crossings done only through orchestration code?
12. Are contracts cohesive and free of god-interface growth?
13. Are raw errors translated at every boundary?
14. Are model conversions explicit at each boundary?
15. Are temporary shortcuts tracked with owner/expiry/removal plan?
16. Do business units use contracts/interfaces only, without technical implementation dependency?
17. Are read and write paths separated with invariant-safe write ownership?
18. Are retry policies applied only to recoverable failures?
19. Are parallel/concurrent flows protected from race conditions?
20. Is critical-flow classification explicit where observability rules apply?
21. Is every entry boundary enforcing validation, error mapping, and correlation id setup?
22. Are state-visibility semantics explicit and free from partial-success leaks?
23. Are shared utilities stateless unless explicitly justified and controlled?
24. Do tests align with architecture boundaries rather than bypass them?

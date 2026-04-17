# Project Capabilities Boundary

This file defines capability boundaries for implementation decisions.

Use this as the single source of truth before introducing any new subsystem.

## Active Capabilities (In Scope)

- Workspace capture/search/summarize flows
- Auth pages and account access flows already present in repository
- Existing AI summarization and retrieval integrations already present in repository

## Explicitly Out of Scope (Do NOT Introduce)

- Email sending and verification infrastructure
  - SMTP providers, transactional email services, verification link pipelines
- Payment and billing infrastructure
  - Stripe, Paddle, webhook-driven billing flows
- Queue/event infrastructure
  - BullMQ, RabbitMQ, Kafka, SQS, background worker queue subsystems

## Decision Gate (MANDATORY)

Before implementation, explicitly list:

- what is NOT being implemented
- what existing system capabilities must NOT be extended

Rules:

- Do NOT introduce new subsystems (email, payment, queue, etc.)
- Do NOT assume missing features should be implemented
- If a feature requires new infrastructure, ask the user before coding

## Subagent Inheritance Rule

When dispatching subagents, always include:

- explicit non-goals
- forbidden capability extensions from this file
- ask-user triggers for infrastructure additions

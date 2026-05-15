# CLAUDE Code Entry Guide

> This document is a bridge for Claude Code to reuse the project's shared agent instructions.

## Quick Start

All project-level AI agent instructions are centralized in [`AGENTS.md`](AGENTS.md).

**Please read `AGENTS.md` first** — it is the canonical entry document that covers:

- Default execution workflow
- Read order and instruction priority
- Operating principles
- Path-based rule loading
- Skills and MCP usage
- Advanced workflow triggers

## Purpose

`CLAUIDE.md` exists solely to redirect Claude Code to the shared `AGENTS.md`. It avoids duplicating rules across different AI tool configurations.

Do not add project-specific rules here — add them to `.ai-rules/` and reference them from `AGENTS.md` instead.

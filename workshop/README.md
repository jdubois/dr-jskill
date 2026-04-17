# GitHub Copilot CLI + Java workshop, using Dr JSkill

Welcome! In this hands-on workshop you'll build a complete Spring Boot application from scratch — **by talking to an AI coding agent** — using [Dr JSkill](../README.md), an Agent Skill that teaches GitHub Copilot CLI how to generate Spring Boot projects following Julien Dubois' best practices.

You don't need prior Spring Boot experience. You do need to be comfortable with a terminal and with editing files.

---

## What you'll build

A small **Todo List** web application with:

- A REST API backed by Spring Boot 4 + Hibernate + PostgreSQL
- A Vue.js front-end served by the Spring Boot application
- Docker for local development (Postgres in a container, auto-started)
- A simple "switch user" feature (no real authentication)
- Tests, performance tuning, and a deployable Docker image

By the end, you'll know how to drive an AI coding agent to produce real, production-shaped Spring Boot apps — and how to understand and extend the code it writes.

## Prerequisites

Before starting Chapter 1, make sure you have:

- [ ] A terminal you're comfortable with (macOS Terminal, Windows Terminal, or any Linux shell)
- [ ] A text editor or IDE (VS Code recommended for this workshop)
- [ ] A GitHub account with access to GitHub Copilot (the subscription is required to use Copilot CLI)
- [ ] A machine with at least 8 GB RAM and 10 GB of free disk space

Everything else (Node.js, Java, Docker, Copilot CLI, Dr JSkill) is installed in Chapter 1.

## Chapters

| # | Chapter | You will… |
|---|---|---|
| [00](00-introduction.md) | Introduction | Understand what an Agent Skill is and why Dr JSkill exists |
| [01](01-setup.md) | Setup | Install Node, Java, Docker, Copilot CLI, and the Dr JSkill skill |
| [02](02-getting-started.md) | Getting started | Generate your first Todo application from a single prompt |
| [03](03-generated-application.md) | Anatomy of the generated app | Tour the backend, frontend, Docker, and build wiring |
| [04](04-adding-users.md) | Adding users | Ask the agent to add a hardcoded user system and per-user filtering |
| [05](05-professional-frontend.md) | A more professional front-end | Use prompts to polish the UI (layout, validation, empty states) |
| [06](06-testing.md) | Testing | Add unit and integration tests; run the full test suite |
| [07](07-performance.md) | Performance | Apply the skill's performance recipes and measure the result |
| [08](08-deployment.md) | Deployment | Run in Docker locally; build a native image; outline cloud deploy |
| [09](09-going-further.md) | Going further | Ideas to extend the app on your own |
| A | [Appendix A — Prompt cheat sheet](appendix-a-prompts.md) | Effective prompt patterns for Dr JSkill |
| B | [Appendix B — Troubleshooting](appendix-b-troubleshooting.md) | Fixes for the most common issues |

## How to use this workshop

- **Follow the chapters in order.** Each chapter ends with a **Checkpoint** section — a `git commit` and a verification step. Don't skip those: they're how you and the facilitator know everything still works.
- **Type the prompts, don't paste them.** You'll learn the rhythm of working with an agent faster that way. (If you're in a hurry, paste — nobody's judging.)
- **When the agent does something unexpected**, don't panic. `git diff` shows you exactly what changed. `git restore .` undoes everything. Chapter 1 shows the pattern.
- **Read the generated code.** The goal of this workshop is not "the agent does it for you" — it's "you understand what a good Spring Boot app looks like, and you can steer the agent to build one."

## Reference material

Each chapter links to the deeper reference guide in [`../references/`](../references/) when relevant. If you want to go further on a specific topic (databases, Docker, testing, Azure deployment, etc.), those guides are the source of truth.

---

Ready? → **[Chapter 0 — Introduction](00-introduction.md)**

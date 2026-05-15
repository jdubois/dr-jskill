# 00 — Introduction

**In this chapter:**
- What an *Agent Skill* is and why it matters
- What Dr JSkill generates, and how it differs from tools you may know (JHipster, Spring Initializr)
- The mindset shift when you code *with* an AI agent instead of *by yourself*

No commands to run here — just ideas. Chapter 1 is where the hands-on starts.

---

## 1. What is an Agent Skill?

An **AI coding agent** (GitHub Copilot CLI, Claude Code, Cursor, etc.) is a program that can read your files, run commands, and edit your code — all driven by natural-language instructions. Give it a task, it figures out the steps.

Agents are powerful but generic. They know "a bit of everything" and, left alone, tend to produce code that is:

- Plausible but idiosyncratic — every run looks slightly different
- Mixed in quality — great for one file, surprising for another
- Disconnected from *your* team's or *your* community's conventions

An **[Agent Skill](https://agentskills.io)** is a small, portable bundle of instructions — Markdown files, scripts, and references — that teaches an agent *how you want a specific kind of task done*. It's a specification the agent reads before it starts working.

Think of it as a "senior engineer's checklist" that travels with the agent.

## 2. What Dr JSkill is

[Dr JSkill](../README.md) is an Agent Skill that teaches any compatible AI coding agent how to generate **Spring Boot applications** following Julien Dubois' best practices.

When you ask the agent to "create a new Spring Boot app", Dr JSkill tells it:

- Use **Spring Boot 4.x** with **Java 25**
- Use **Maven** (not Gradle), **Hibernate `ddl-auto`** (not Flyway/Liquibase)
- Use **PostgreSQL** in Docker for development
- Wire a front-end (Vue, React, Angular, or vanilla JS) through the **Maven Frontend Plugin** so `./mvnw package` builds the whole thing
- Ship sensible defaults: `.gitignore`, `.editorconfig`, `.env.sample`, a `Dockerfile`, a `compose.yaml`, CI config, etc.
- **Avoid** a specific list of things the author considers traps: Lombok, Gradle, OpenAPI/springdoc scaffolding, buildpacks, Jib

The result: different agents, different runs, and different prompts all produce applications that *look like each other* and look like what a senior Spring Boot developer would write by hand.

## 3. How this differs from Spring Initializr

Spring Initializr (start.spring.io) gives you a skeleton project — `pom.xml`, an empty `Application.java`, and nothing else. You still have to write every controller, entity, and configuration yourself.

Dr JSkill *uses* Spring Initializr under the hood to bootstrap the project, then asks the agent to fill in the rest: domain entities, REST controllers, a working front-end, database configuration, tests, Docker, and the "dotfiles" that make a project feel professional.

## 4. The mindset shift

If you're new to AI coding agents, expect three things to feel different:

1. **You describe outcomes, not steps.** Instead of writing the code for a user filter, you write: *"Add a dropdown at the top of the todo list to filter by user."* The agent figures out which files to edit.

2. **You review diffs, not code you wrote.** Your main job during the workshop is to **read what the agent changed** (via `git diff`) and decide whether it matches what you asked for. Dr JSkill tilts the odds in your favor, but the agent is still not infallible.

3. **`git` is your undo button.** Nothing the agent does is sacred. If a change goes sideways, `git restore .` erases it and you try a different prompt. Make frequent commits — you'll want those checkpoints.

## 5. What you'll learn

By the end of this workshop you'll be able to:

- Bootstrap a real Spring Boot application with a few sentences of English
- Read a generated project and understand *why* each piece is there
- Extend an existing project by talking to the agent, safely and iteratively
- Test, tune, and deploy what you built
- Apply the same workflow to your own projects — with or without Dr JSkill

## 6. Tested models

This workshop has been executed end-to-end (chapters 02 → 08) with three AI models, all of them available in Copilot CLI:

- **Claude Haiku 4.5**
- **Claude Opus 4.7**
- **GPT-5.5**

All three produced a running application, but the *quality* of the generated code varied — Haiku is the fastest but it regularly has minor bugs in the generated code. Chapter 2 gives concrete advice on which one to pick when you start your session.

---

**Checkpoint**

Nothing to run in this chapter. If you're attending a facilitated workshop, this is a good moment to pause for questions.

**Next →** [Chapter 1 — Setup](01-setup.md)

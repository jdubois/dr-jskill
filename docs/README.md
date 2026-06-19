---
home: true
heroImage: /dr-jskill.png
heroText: Dr JSkill
tagline: An Agent Skill that generates Spring Boot apps the way Julien Dubois builds them.
actions:
  - text: Read the skill
    link: https://github.com/jdubois/dr-jskill/blob/main/SKILL.md
    type: primary
  - text: Start the workshop
    link: /workshop
    type: secondary
features:
  - title: Automated project generation
    details: Generate a complete Spring Boot project from start.spring.io with a single prompt — no boilerplate, no manual wiring.
  - title: Latest Spring Boot and Java
    details: Always targets the latest Spring Boot 4.x and Java 25, with versions centralised in versions.json so the whole stack stays current.
  - title: Multiple front-ends
    details: Choose Vue.js (default), React, Angular, or Vanilla JS, served straight from the Spring Boot application — no separate frontend deployment.
  - title: Docker and native image ready
    details: Standard JVM images and GraalVM native image builds, with PostgreSQL auto-started in a container for local development.
  - title: Production-ready by default
    details: PostgreSQL with Hibernate ddl-auto, REST APIs, monitoring, security, and testing recipes baked into every generated project.
  - title: Built on JHipster experience
    details: Distils years of JHipster experience into an AI-agent skill — versatile, easy to tune, and able to update existing projects.
footer: Apache-2.0 Licensed | Dr JSkill
---

## Start here

| Goal | Documentation |
| ---- | ------------- |
| Understand the skill and how it works | [Read the skill](https://github.com/jdubois/dr-jskill/blob/main/SKILL.md) |
| Build a real app, step by step | [Start the workshop](workshop/README.md) |
| Set up a project and its dotfiles | [Project setup](https://github.com/jdubois/dr-jskill/blob/main/references/PROJECT-SETUP.md) |
| Pick and wire a front-end | [Vue](https://github.com/jdubois/dr-jskill/blob/main/references/VUE.md) · [React](https://github.com/jdubois/dr-jskill/blob/main/references/REACT.md) · [Angular](https://github.com/jdubois/dr-jskill/blob/main/references/ANGULAR.md) · [Vanilla JS](https://github.com/jdubois/dr-jskill/blob/main/references/VANILLA-JS.md) |
| Drive the skill from an AI agent | [AGENTS guide](https://github.com/jdubois/dr-jskill/blob/main/AGENTS.md) |

## What Dr JSkill generates

Dr JSkill is an [Agent Skill](https://agentskills.io): a set of Markdown instructions that teach an AI coding agent
(GitHub Copilot CLI or Claude Code) how to scaffold Spring Boot applications following
[Julien Dubois](https://www.julien-dubois.com)' best practices.

Ask the agent for an app and it produces a project that includes:

- A **Spring Boot 4 + Java 25** backend wired to **PostgreSQL** with Hibernate `ddl-auto` schema management.
- A **REST API** and your choice of front-end (**Vue.js**, **React**, **Angular**, or **Vanilla JS**) served by the same application.
- **Docker** for local development, with Postgres auto-started in a container, plus standard and **GraalVM native image** builds.
- Production-shaped defaults: configuration, logging, security, testing, and monitoring — no Lombok, **Maven only**.
- Shipped dotfiles (`.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.dockerignore`) so the project is ready to commit.

Versions for every tool and library are centralised in `versions.json`, so the whole generated stack stays consistent and current.

## Works with BootUI and Coffilot

Dr JSkill is part of a family of tools that share a **circle of color** design — terracotta for Dr JSkill, green for BootUI,
and blue for Coffilot — and that fit together end to end:

1. **Dr JSkill** (terracotta) generates a Spring Boot application the way Julien Dubois builds them.
2. Add the **[BootUI](https://www.julien-dubois.com/boot-ui/)** (green) starter for a local-only, in-app developer console.
3. Drive build, run, test, and debug from the Copilot side panel with **[Coffilot](https://www.julien-dubois.com/coffilot/)** (blue).

See [The BootUI family](WORKS-WITH.md) for how the three work together.

# The BootUI family

Dr JSkill is one of three tools that share a common philosophy — Spring Boot done the way
[Julien Dubois](https://www.julien-dubois.com) builds applications — and a shared **circle of color**
design language. Each tool owns a color, and together they cover the full lifecycle of a Spring Boot app:

| Tool | Color | What it does |
| ---- | ----- | ------------ |
| **Dr JSkill** | 🟤 Terracotta | An Agent Skill that **generates** Spring Boot applications from a prompt. |
| **[BootUI](https://www.julien-dubois.com/boot-ui/)** | 🟢 Green | A starter that adds a local-only, in-app **developer console** to a running app. |
| **[Coffilot](https://www.julien-dubois.com/coffilot/)** | 🔵 Blue | A Copilot side-panel that **builds, runs, tests, and debugs** the app. |

## How they work together

The three tools chain together from an empty folder to a running, observable application:

1. **Generate with Dr JSkill.** Ask GitHub Copilot CLI (or Claude Code) to create an application. Dr JSkill
   teaches the agent how to scaffold a Spring Boot 4 + Java 25 project with PostgreSQL, a REST API, your chosen
   front-end, Docker, and production-ready defaults. → [Read the skill](https://github.com/jdubois/dr-jskill/blob/main/SKILL.md)

2. **Add the BootUI console.** Drop in the **[BootUI](https://www.julien-dubois.com/boot-ui/)** Spring Boot
   starter and the generated app gains a local-only developer console: health, metrics, memory, threads,
   configuration, data sources, diagnostics, and advisor scans — all served from the app itself, loopback-only
   by default.

3. **Drive everything with Coffilot.** Use **[Coffilot](https://www.julien-dubois.com/coffilot/)** to build,
   run, package, test, and debug the application directly from the GitHub Copilot side panel, watching live JVM
   metrics and pushing fixes straight back to the agent.

## The circle of color

Each project owns a color in a shared gradient — **terracotta** for Dr JSkill, **green** for BootUI, and **blue** for
Coffilot. Dr JSkill's own theme runs from terracotta (its primary brand color) into BootUI green (its accent), a small
nod to the way the tools hand off to one another.

## Links

- **Dr JSkill** — this site · [GitHub](https://github.com/jdubois/dr-jskill)
- **BootUI** — <https://www.julien-dubois.com/boot-ui/>
- **Coffilot** — <https://www.julien-dubois.com/coffilot/>

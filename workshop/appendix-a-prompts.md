# Appendix A — Prompt cheat sheet

A collection of prompt patterns that work well with Dr JSkill and GitHub Copilot CLI. Copy, adapt, and keep close by.

---

## Project creation

**Minimal:**
```
Use Dr JSkill to create a new <app-name>.
```

**Opinionated (recommended):**
```
Use Dr JSkill to create a new <app-name>.

- Features: <one-line feature list>
- Front-end: Vue (or React / Angular / Vanilla JS)
- Database: PostgreSQL with Hibernate ddl-auto
- No security
- Include: Docker, tests, dotfiles
```

**Pin versions:**
```
Use Dr JSkill to create a new <app-name>. Use the versions specified in
versions.json — do not override.
```

## Feature additions

**Small, scoped:**
```
Add a <field-or-feature> to <entity-name>. Update:
- the JPA entity and migration of the schema
- the REST controller (expose it on existing endpoints)
- the Vue component that renders <entity-name>
Keep existing behavior; do not add new dependencies.
```

**With acceptance criteria:**
```
Add a search field above the todo list.

Acceptance:
- Typing filters the list in real time
- Empty search shows everything
- No API call per keystroke — debounce to 300ms
- The search also works with the user filter
```

## Controlling the agent

**Prevent new dependencies:**
```
Do not add any new Maven or npm dependencies; use what's already in the
project.
```

**Prevent framework churn:**
```
Keep the current project layout — no new packages, no file renames, no
refactoring beyond the change described.
```

**Force a specific library style:**
```
Use Spring Data JPA, not JDBC. Use MockMvc, not RestAssured. Use Bootstrap
utility classes, not custom CSS.
```

**Scope the files:**
```
Only modify files under frontend/src/components/. Do not touch the backend.
```

**Dry-run / plan-only:**
```
Do not edit any files yet. Describe the changes you would make to implement
<X>, file by file. I'll say "go" once I approve.
```

## Review & iteration

**Ask for an explanation:**
```
Walk me through what you changed, file by file, and why.
```

**Challenge the result:**
```
The change compiles but I think <Y> is wrong. Re-check <specific claim> by
reading the file and the test.
```

**Correction with context:**
```
The previous change broke <behavior>. Expected: <what should happen>.
Observed: <what actually happens>. Fix it without reverting the rest of
the changes.
```

**Revert cleanly:**
```
Revert the last change completely — use git. Don't try to "fix" it in place.
```

## Debugging & diagnostics

**Run and inspect:**
```
Run ./mvnw test. If any test fails, show me the failing test and the
exception stack trace before attempting a fix.
```

**Targeted investigation:**
```
The /api/todos endpoint returns 500 when called with a userId that doesn't
exist. Find the root cause using the LSP tool to trace the call chain, then
propose a fix.
```

**Log inspection:**
```
Show me the last 50 lines of the Spring Boot log and identify anything that
isn't a healthy startup message.
```

## Refactoring

**Semantic rename:**
```
Rename the "name" field on AppUser to "login" across the codebase — entity,
repository methods, DTOs, controllers, front-end. Use LSP rename where
possible. Update all tests.
```

**Extract a layer:**
```
TodoController has business logic creeping in. Move the per-user filtering
logic to TodoService and keep the controller thin. Update the relevant
tests.
```

## Testing

**Add missing coverage:**
```
Add @WebMvcTest unit tests for <controller>. Cover success, not-found, and
bad-request paths for every endpoint. Mock the service with @MockitoBean.
Follow references/TEST.md.
```

**Integration test:**
```
Add a *IT test that walks through the full create-read-delete lifecycle
against a real Postgres container via @ServiceConnection. Follow
references/TEST.md.
```

## Performance

**Measure, then change:**
```
Add a Micrometer counter on <action> so I can see it in /actuator/metrics.
Don't change the behavior.
```

**Apply a specific recipe:**
```
Apply <specific recipe, e.g. "virtual threads"> from references/SPRING-BOOT-4.md.
Quote the exact property added and show me the one-line diff.
```

## Docs & commits

**Update README:**
```
Update the project README.md to reflect the current feature set: users,
filters, toasts, etc. Keep it under 80 lines.
```

**Commit on my behalf:**
```
Commit the current staged + unstaged changes with a Conventional Commit
message summarizing what's in the diff. Do not push.
```

## Dr JSkill meta-prompts

**Read the conventions:**
```
Read SKILL.md and references/DATABASE.md before answering.
```

**Follow a specific reference:**
```
Apply the pattern described in references/<FILE>.md — quote the relevant
section in your response.
```

**Question a Dr JSkill choice:**
```
Dr JSkill prefers Hibernate ddl-auto over Flyway. Summarize the rationale
from the references, then tell me under what conditions I should reconsider
that choice for this project.
```

---

## Things that tend *not* to work well

- **Vague prompts.** *"Make it better."* The agent will do something, but probably not what you wanted.
- **Huge prompts.** *"Add users, OAuth, Prometheus, Kubernetes, and dark mode."* Break them up — one prompt, one commit.
- **Correcting via new prompts without reading the diff.** You'll drift further from intent each round. `git diff` first, prompt second.
- **Ignoring errors.** If the agent says "I hit a 404 on npm install but I'll work around it", stop and fix the environment issue. Workarounds compound.

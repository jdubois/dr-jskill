# 09 — Going further

**In this chapter:**
- A **menu of next steps** to take the Todo app beyond the workshop
- Each item is a short prompt you can drop into Copilot CLI
- Pick two or three that interest you — don't try to do them all

The goal isn't to finish every idea below. It's to leave the workshop with a clear sense of *what's possible* and the muscle memory to pursue any of it on your own.

---

## 1. Real authentication

The hardcoded-users dropdown was a teaching device. In a real app, you want authenticated users.

**Easiest path:** OAuth 2.0 with GitHub, Google, or Microsoft as identity provider. Spring Security has a one-dependency integration for this (`spring-boot-starter-oauth2-client`).

Prompt:

```
Replace the hardcoded user dropdown with OAuth 2.0 login via GitHub.

- Add spring-boot-starter-oauth2-client and configure a client-registration
  for GitHub that reads client-id and client-secret from env vars.
- Protect /api/** so only authenticated users can access it.
- The current "user" attached to a todo should be the authenticated user's
  GitHub login; remove the dropdown.
- Keep existing per-user filtering.

Follow references/SECURITY.md. Walk me through creating the GitHub OAuth app.
```

See [`references/SECURITY.md`](../references/SECURITY.md) for the full treatment.

## 2. Observability with Prometheus + Grafana

Chapter 7 enabled Actuator metrics. Now scrape them.

Prompt:

```
Add a prometheus + grafana service to compose.yaml (dev only).

- Prometheus scrapes the app's /actuator/prometheus endpoint every 15s.
- Grafana is pre-provisioned with a Prometheus datasource and a basic
  Spring Boot dashboard (JVM, HTTP request rates/latency, DB connection pool).
- Document the URLs in the README.
```

You now have a real observability stack on your laptop, for free.

## 3. Keyset (seek) pagination

Once you have more than a few hundred todos, offset pagination (`LIMIT 20 OFFSET 10000`) gets slow. Keyset pagination scales to any table size.

Prompt:

```
Switch the GET /api/todos endpoint from Pageable-based pagination to keyset
pagination using the "id" column. Accept an optional "after" query parameter
(the last seen id) plus a "limit" parameter (default 20, max 100).

Update the front-end to use infinite scroll based on the "after" cursor
rather than page numbers.

Follow references/DATABASE.md.
```

## 4. Try a different front-end

Dr JSkill supports **Vue, React, Angular, and Vanilla JS**. Rebuild the same Todo app with a different one to compare.

In a **fresh directory**:

```bash
mkdir ~/workshop-react && cd ~/workshop-react
copilot
```

Then:

```
Use Dr JSkill to create a new Todo List application identical to what we
built in ~/workshop, but using React instead of Vue. Keep the same features:
add/edit/remove todos, hardcoded users (julien/alice/bob), per-user filter,
Bootstrap styling, toasts, loading spinners.
```

Side-by-side, you'll feel the differences between the frameworks — and see that the Spring Boot backend is almost identical.

See [`references/REACT.md`](../references/REACT.md), [`references/ANGULAR.md`](../references/ANGULAR.md), [`references/VANILLA-JS.md`](../references/VANILLA-JS.md).

## 5. Replay on another domain

The real test of an agent skill is whether it works on a completely different problem. Pick one and start over:

- A **Bookmark manager** (URL, title, tags, "read" flag)
- A **Recipe book** (recipes with ingredients, step-by-step instructions)
- A **Expense tracker** (amount, category, date, user)
- A **Inventory system** (products with stock counts, simple movements)

Prompt (example):

```
Use Dr JSkill to create a Bookmark Manager.

- Entities: Bookmark (url, title, description, tags, read/unread).
- Tag filtering and full-text search on title+description.
- Vue + Bootstrap UI.
- PostgreSQL, no security.
```

Running the whole workshop on a second domain in under an hour is the real proof that you've internalized the workflow.

## 6. Turn the skill into yours

If Dr JSkill's conventions don't match yours exactly — maybe you prefer Gradle, or H2 for dev, or a different package layout — **fork the skill and edit it**.

The whole skill is Markdown files in [`../references/`](../references/) and [`../SKILL.md`](../SKILL.md). Change a few sentences, bump a version in [`../versions.json`](../versions.json), and the next project the agent generates will follow your conventions instead. No plugin system, no build step.

Prompt (from inside `~/.copilot/skills/dr-jskill`):

```
I want to add a new reference file describing how the application should
integrate with our team's custom logging service. Draft references/ACME-LOG.md
with the usage pattern and add it to SKILL.md's reference list.
```

See the skill's own [README](../README.md) for how to point Copilot CLI at your fork.

## 7. Teach the workshop

The single best way to cement what you learned: **run this workshop for someone else**. Pair with a colleague. Stream it. Talk at a meetup.

You'll find the rough edges faster than on your own, and you'll discover which prompts actually land — and which need rephrasing. If you find improvements, PRs to [`workshop/`](../workshop) are welcome.

---

## Further reading

| Topic | File |
|---|---|
| Database tuning, pagination, caching | [`references/DATABASE.md`](../references/DATABASE.md) |
| Authentication, CSRF, security headers | [`references/SECURITY.md`](../references/SECURITY.md) |
| Structured logging, correlation IDs | [`references/LOGGING.md`](../references/LOGGING.md) |
| Docker production image, compose, native | [`references/DOCKER.md`](../references/DOCKER.md) |
| GraalVM native image | [`references/GRAALVM.md`](../references/GRAALVM.md) |
| Azure deployment (Container Apps + Postgres Flexible Server) | [`references/AZURE.md`](../references/AZURE.md) |
| Testing (unit, integration, Testcontainers) | [`references/TEST.md`](../references/TEST.md) |
| Vue / React / Angular / Vanilla front-end guides | [`references/VUE.md`](../references/VUE.md), [`REACT.md`](../references/REACT.md), [`ANGULAR.md`](../references/ANGULAR.md), [`VANILLA-JS.md`](../references/VANILLA-JS.md) |
| Java code intelligence with JDTLS | [`references/JDTLS.md`](../references/JDTLS.md) |
| Project setup, dotfiles | [`references/PROJECT-SETUP.md`](../references/PROJECT-SETUP.md) |

---

**Checkpoint**

You've reached the end of the workshop.

- You generated a Spring Boot + Vue app from a prompt
- You extended it with users, polished the UI, added tests, tuned performance, deployed it
- You know where to go for anything deeper

**Appendices:**
- [A — Prompt cheat sheet](appendix-a-prompts.md)
- [B — Troubleshooting](appendix-b-troubleshooting.md)

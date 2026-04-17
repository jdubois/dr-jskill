# 07 — Performance

**In this chapter:**
- Apply a handful of **high-leverage performance recipes** from the Dr JSkill references
- Learn the cardinal rule: **measure first, then change**
- Use Spring Boot **Actuator** + **Micrometer** to see what's actually slow

This is the shortest possible tour of a big topic. The goal is to know the knobs exist and to have turned each one once.

---

## 1. The rule: measure first

Every tip in this chapter is ineffective — or worse — if applied blindly. Before you optimize anything:

1. **Define what "slow" means for you** — page load time, API latency, database query time, startup time? Pick one.
2. **Measure the current number.**
3. **Change one thing.**
4. **Measure again.**

Actuator is the cheapest way to measure.

## 2. Enable Actuator

In Copilot CLI:

```
Enable Spring Boot Actuator for performance work:

- Expose the metrics, prometheus, and httptrace endpoints on /actuator
- Add percentiles-histogram for http.server.requests
- Do NOT expose actuator endpoints publicly in production — add a comment
  reminding this, and make the exposure dev-profile only.
```

Review and commit. Start the app:

```bash
./mvnw spring-boot:run
```

Then in another terminal:

```bash
# Generate some load
for i in {1..50}; do curl -s http://localhost:8080/api/todos > /dev/null; done

# Look at latency percentiles
curl -s http://localhost:8080/actuator/metrics/http.server.requests | jq .
```

You now have a baseline.

## 3. Virtual threads

Virtual threads (JDK 21+, on by default on JDK 25) are Spring Boot's lowest-cost performance win for IO-bound endpoints — which every typical web app is.

```
Enable virtual threads for request handling. Add
spring.threads.virtual.enabled=true to application.properties.
```

One line of config, potentially many requests per second more. Rerun the load script, compare latency.

See [`references/SPRING-BOOT-4.md`](../references/SPRING-BOOT-4.md#performance) → *Virtual threads* for caveats (don't also raise `server.tomcat.threads.max`, avoid `synchronized` on blocking paths).

## 4. HTTP compression

JSON responses and HTML payloads compress very well. Enable Spring Boot's built-in compression **only if no reverse proxy is already compressing**.

```
Enable HTTP response compression in application.properties:
server.compression.enabled=true, correct mime-types, min-response-size=1KB.
```

Verify with:

```bash
curl -s -I -H 'Accept-Encoding: gzip' http://localhost:8080/api/todos
```

Look for `Content-Encoding: gzip` in the response headers.

## 5. Read-only transactions

Service methods that only query the database should declare themselves read-only — Hibernate skips dirty-checking and auto-flush, which is a measurable win on list endpoints.

```
In TodoService, mark the read methods (findAll, findByUserId, findById) with
@Transactional(readOnly = true). Write methods (save, deleteById) stay with
the default @Transactional. Do the same for AppUserService if it exists.
```

See [`references/DATABASE.md`](../references/DATABASE.md#read-only-transactions) for the rationale.

## 6. Lazy-loaded routes (front-end)

The first page load ships the entire front-end bundle by default. Route-level code splitting keeps the initial bundle tiny and loads the rest on demand.

If Chapter 5 already lazy-loaded some views, skip this. Otherwise:

```
In frontend/src/router/index.js, convert every route's component to a lazy
import: component: () => import('../views/SomeView.vue')
```

After rebuilding, open your browser's DevTools → Network tab → hard-refresh the page. You should see one small initial chunk and separate chunks per route.

See [`references/VUE.md`](../references/VUE.md#6-performance) for the full checklist (Vite prod build, long-term caching).

## 7. Static asset caching

Vite emits hashed filenames in `/assets/**`. Those files will never change contents under their own hash — perfect for aggressive caching.

```
Configure long-term caching for Vite-built static assets in application.properties:

spring.web.resources.cache.cachecontrol.max-age=365d
spring.web.resources.cache.cachecontrol.immutable=true

Leave index.html uncached (default) so clients still pick up new asset hashes.
```

Verify:

```bash
curl -s -I http://localhost:8080/assets/index-<hash>.js
```

The `Cache-Control` header should read `max-age=31536000, immutable`.

## 8. Detect N+1 queries in tests

N+1 is the most common JPA performance bug. It rarely shows up until you have real data. Tests can catch it early.

```
Add a p6spy dependency (test scope) and configure it to log SQL statements
with their execution time during tests. No change to production code.
```

Run `./mvnw verify` and watch the test output. If a single "list todos" endpoint produces dozens of SQL statements for N todos, you have an N+1. Ask the agent to fix it with `@EntityGraph` or `JOIN FETCH` — the pattern is in [`references/DATABASE.md`](../references/DATABASE.md#avoiding-n1-queries).

## 9. Stop optimizing

A real application needs maybe five to ten of these tweaks applied **thoughtfully**, not fifty applied blindly. When the measured number meets your target, stop.

---

## Summary table

| Recipe | Cost to apply | Typical upside | Reference |
|---|---|---|---|
| Virtual threads | 1 property | ↑ RPS on IO-bound endpoints | SPRING-BOOT-4.md |
| HTTP compression | 2 properties | ↓ bytes on the wire | SPRING-BOOT-4.md |
| Read-only transactions | 1 annotation per method | ↓ DB work on queries | DATABASE.md |
| Lazy routes | 1 import per route | ↓ initial bundle | VUE.md |
| Static asset caching | 2 properties | ↓ repeat requests | SPRING-BOOT-4.md |
| N+1 detection in tests | 1 dep + config | ↓ surprises in prod | DATABASE.md |

---

**Try this yourself**

- *"Generate load against `/api/todos` with 1000 requests at concurrency 10 using `hey` or `ab`, and produce a before/after table around the virtual-threads change."* — Copilot CLI will install the tool and run the benchmarks for you.
- *"Add a `@Transactional(readOnly = true)` to the method that lists todos by user and rerun the benchmark."*

---

**Checkpoint**

- Actuator endpoints respond
- Your `application.properties` has at least the compression + caching + virtual threads settings
- You've run one load test and can describe the result in one sentence
- `./mvnw verify` still green
- Commit the combined changes: *"Apply core performance recipes"*

**Next →** [Chapter 8 — Deployment](08-deployment.md)

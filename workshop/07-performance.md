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

- Expose the metrics and httpexchanges endpoints on /actuator
- Add micrometer-registry-prometheus so the prometheus endpoint exists, and
  expose it too
- httpexchanges needs an in-memory HttpExchangeRepository bean — add one
- Add percentiles-histogram for http.server.requests
- Do NOT expose actuator endpoints publicly in production — add a comment
  reminding this, and make the exposure dev-profile only.
```

> **Two endpoints need more than an exposure property.** Listing an endpoint in `management.endpoints.web.exposure.include` only *un-hides* it — it doesn't create it:
>
> - **`prometheus`** requires the `micrometer-registry-prometheus` dependency, which the generated project doesn't ship.
> - **`httpexchanges`** requires an `HttpExchangeRepository` bean; Spring Boot deliberately auto-configures none, because keeping request traces in memory is a memory leak waiting to happen in production.
>
> Without those two pieces the endpoints simply won't appear under `/actuator`, with no error to tell you why. (The old Boot 2 name for this endpoint was `httptrace`; it was renamed in Boot 3.)

Review and commit. Start the app:

```bash
./mvnw spring-boot:run
```

Then in another terminal:

```bash
# Confirm which endpoints actually got exposed
curl -s http://localhost:8080/actuator | jq '._links | keys'

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

> **Don't panic if it's absent.** `min-response-size=1KB` means small responses are sent uncompressed on purpose, and a fresh todo list is a few hundred bytes at most — so the header genuinely won't be there. Check the size first, and add rows until you're over the threshold:
>
> ```bash
> curl -s http://localhost:8080/api/todos | wc -c   # needs to exceed 1024
> ```

## 5. Read-only transactions

Service methods that only query the database should declare themselves read-only — Hibernate skips dirty-checking and auto-flush, which is a measurable win on list endpoints.

This is also the point where a service layer starts to earn its keep. If your generated project has the controller calling the repository directly (the Dr JSkill default for plain CRUD — see Chapter 3), introduce the layer now:

```
Extract a TodoService between TodoController and TodoRepository, and mark the
read methods (findAll, findByUserId, findById) with @Transactional(readOnly = true).
Write methods (save, deleteById) keep the default @Transactional.
Do the same for AppUserService if it exists. Update the tests.
```

See [`references/DATABASE.md`](../references/DATABASE.md#read-only-transactions) for the rationale.

## 6. Lazy-loaded routes (front-end)

The first page load ships the entire front-end bundle by default. Route-level code splitting keeps the initial bundle tiny and loads the rest on demand.

Check whether you already have it — after a build, look for more than one JS chunk:

```bash
ls src/main/resources/static/assets/*.js
```

Several files (e.g. `index-<hash>.js` **and** `AboutView-<hash>.js`) means routes are already split, which is what the Dr JSkill Vue scaffold generates. In that case skip ahead. Otherwise:

```
In frontend/src/router/index.js, convert every route's component to a lazy
import: component: () => import('../views/SomeView.vue')
```

After rebuilding, open your browser's DevTools → Network tab → hard-refresh the page. You should see one small initial chunk and separate chunks per route.

See [`references/VUE.md`](../references/VUE.md#6-performance) for the full checklist (Vite prod build, long-term caching).

## 7. Static asset caching

Vite emits hashed filenames in `/assets/**`. Those files will never change contents under their own hash — perfect for aggressive caching. `index.html`, on the other hand, must **never** be cached: it's the file that points at the current asset hashes.

The obvious-looking property pair doesn't achieve that:

```properties
# ⚠️ Don't do this
spring.web.resources.cache.cachecontrol.max-age=365d
spring.web.resources.cache.cachecontrol.immutable=true
```

Two problems, both silent:

1. **There is no `immutable` property.** Spring Boot supports `max-age`, `no-cache`, `no-store`, `must-revalidate`, `no-transform`, `cache-public`, `cache-private`, `proxy-revalidate`, `s-max-age`, `stale-while-revalidate` and `stale-if-error` — that's the whole list. `immutable` is ignored without warning.
2. **It applies to every static resource, `index.html` included.** You'd be telling browsers to cache your entry point for a year, so users would keep loading stale asset hashes and never see a new deployment.

Ask for the per-pattern configuration instead:

```
Configure static resource caching in a WebMvcConfigurer:

- /assets/** gets max-age of 365 days, public, and immutable
- index.html and / get no-cache so clients always revalidate the entry point

Use CacheControl and addResourceHandlers. Do not use the
spring.web.resources.cache.cachecontrol.* properties.
```

The result is a small config class:

```java
@Override
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/assets/**")
            .addResourceLocations("classpath:/static/assets/")
            .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());

    registry.addResourceHandler("/index.html", "/")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.noCache());
}
```

`CacheControl.immutable()` exists in the programmatic API even though the property doesn't — which is exactly why this has to be done in Java.

Verify both halves (substitute a real hashed filename from `src/main/resources/static/assets/`):

```bash
curl -s -I http://localhost:8080/assets/index-<hash>.js | grep -i cache-control
# Cache-Control: max-age=31536000, public, immutable

curl -s -I http://localhost:8080/index.html | grep -i cache-control
# Cache-Control: no-cache
```

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
| Virtual threads | 1 property | ↑ RPS on IO-bound endpoints | [`references/SPRING-BOOT-4.md`](../references/SPRING-BOOT-4.md) |
| HTTP compression | 2 properties | ↓ bytes on the wire | [`references/SPRING-BOOT-4.md`](../references/SPRING-BOOT-4.md) |
| Read-only transactions | 1 annotation per method | ↓ DB work on queries | [`references/DATABASE.md`](../references/DATABASE.md) |
| Lazy routes | 1 import per route | ↓ initial bundle | [`references/VUE.md`](../references/VUE.md) |
| Static asset caching | 2 properties | ↓ repeat requests | [`references/SPRING-BOOT-4.md`](../references/SPRING-BOOT-4.md) |
| N+1 detection in tests | 1 dep + config | ↓ surprises in prod | [`references/DATABASE.md`](../references/DATABASE.md) |

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

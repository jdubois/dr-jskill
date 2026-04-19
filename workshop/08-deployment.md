# 08 — Going to Production

**In this chapter:**
- Build a **production JAR** and run it locally
- Run the whole stack (app + database) with **Docker Compose**, and understand the Dockerfile in depth
- Build a **GraalVM native image**, time the startup difference, and compare image sizes
- Set production-safe configuration
- *(Optional)* **Deploy to Azure Container Apps** with a managed PostgreSQL database

This is a tour, not a full DevOps module. By the end, you'll have run your app three different ways and know how to take it to a real cloud.

---

## 1. Build a production JAR

So far you've been running in development mode (`./mvnw spring-boot:run`). Production mode produces a single executable JAR with an optimized front-end bundled inside.

```bash
./mvnw -Pprod clean package
```

The `-Pprod` profile tells the Maven Frontend Plugin to run `npm run build` (minified Vite output with hashed filenames). The result:

```bash
ls target/*.jar
# target/todo-app-0.0.1-SNAPSHOT.jar
```

You can run this JAR anywhere Java 25 is installed — no Maven, no Node, nothing else:

```bash
# Start Postgres first (compose.yaml still works standalone)
docker compose up -d postgres

# Run the JAR
java -jar target/todo-app-0.0.1-SNAPSHOT.jar
```

Open http://localhost:8080. Same app, running from the packaged artifact.

Stop the app (Ctrl+C) and the database:

```bash
docker compose down
```

## 2. Run the whole stack in Docker

The JAR is portable, but in production you usually want the app itself containerized. The generated `Dockerfile` builds a lean image; `docker-compose.yml` wires it to the database.

### Build and start

```bash
# Build the app image
docker compose -f docker-compose.yml build

# Start everything (app + postgres)
docker compose -f docker-compose.yml up -d

# Check logs
docker compose -f docker-compose.yml logs -f app
```

Once "Started Application" appears, open http://localhost:8080. This time there's **no Java or Maven on your host** — everything runs in containers.

Stop it:

```bash
docker compose -f docker-compose.yml down
```

### Understanding the Dockerfile

Open `Dockerfile`. It uses a **multi-stage build** with two distinct stages.

**Stage 1 — Build**

```dockerfile
FROM eclipse-temurin:25-jdk-jammy AS build
```

> **Version note:** the `25` tag matches the Java version in `versions.json`. Dr JSkill writes this value into the generated Dockerfile automatically — you don't need to update it by hand.

A full JDK image is used here so Maven can compile your code and the Maven Frontend Plugin can download Node and build the Vite bundle. This image is large (~500 MB) but it's **never shipped** — it's only used during build.

The dependency download step is its own layer:

```dockerfile
COPY pom.xml .
RUN ./mvnw dependency:go-offline
```

Docker caches this layer as long as `pom.xml` doesn't change. On subsequent builds only the `COPY src` → `RUN ./mvnw package` step reruns, keeping iterative builds fast.

**Stage 2 — Runtime**

```dockerfile
FROM eclipse-temurin:25-jre-alpine
```

Only the compiled JAR is copied from stage 1. The Alpine-based JRE image has no compiler, no Maven, no Node — it strips the image down to ~150 MB. The `HEALTHCHECK` line pings `/actuator/health` so Docker and container orchestrators can detect a broken instance and restart it.

The `ENTRYPOINT` passes two JVM flags explicitly:

```dockerfile
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

- `-XX:+UseContainerSupport` — makes the JVM read CPU and memory limits from the container's cgroup rather than the host machine's physical resources. Without this, a 500 MB container on a 32 GB host would allocate heap based on 32 GB.
- `-XX:MaxRAMPercentage=75.0` — caps heap at 75% of the container's memory limit, leaving 25% for non-heap (metaspace, threads, code cache, native memory).

### Inspect the image

```bash
docker images | grep todo-app
# todo-app   latest   ...   ~150MB

docker inspect todo-app:latest --format '{{.Config.Healthcheck}}'
```

See [`references/DOCKER.md`](../references/DOCKER.md) for a deeper dive into layer caching, `.dockerignore`, and multi-arch builds.

## 3. GraalVM native image

A **GraalVM native image** ahead-of-time compiles your app to a standalone binary. Key tradeoffs:

| | JVM (Docker) | Native (Docker) |
|---|---|---|
| Startup | 2–10 s | 50–200 ms |
| Idle memory | 300 MB–1 GB | 50–150 MB |
| Image size | ~150 MB | ~30–60 MB |
| Peak throughput | ✅ JIT-optimized | ⚠️ No JIT |
| Build time | ~1 min | 5–15 min |

Native is ideal for **serverless, scale-to-zero, and short-lived workloads**. Long-running services under sustained load usually benefit more from JIT — pick the right tool for the job.

### Build and run

Dr JSkill generates `Dockerfile-native` and `docker-compose-native.yml` so you can try native with zero local setup — no GraalVM installation needed:

```bash
docker compose -f docker-compose-native.yml up --build
```

The first build takes a while (GraalVM is compiling your whole app and every dependency into native machine code). Grab a coffee — this can take 5–15 minutes depending on your machine.

Once up, open http://localhost:8080. The application is identical; the difference is in how fast it comes up after a restart.

### Compare startup times

With both stacks available, restart each one and time the startup log message:

```bash
# JVM version — time from start to "Started Application"
docker compose -f docker-compose.yml restart app
docker compose -f docker-compose.yml logs --since 1m app | grep "Started"

# Native version — same measurement
docker compose -f docker-compose-native.yml restart app
docker compose -f docker-compose-native.yml logs --since 1m app | grep "Started"
```

Typical output on a laptop:

```
# JVM
Started TodoApplication in 3.812 seconds

# Native
Started TodoApplication in 0.087 seconds
```

### Compare image sizes

```bash
docker images | grep -E "todo-app|REPOSITORY"
# REPOSITORY          TAG       SIZE
# todo-app            latest    148MB   ← JVM
# todo-app-native     latest     38MB   ← native
```

### Stop native

```bash
docker compose -f docker-compose-native.yml down
```

See [`references/GRAALVM.md`](../references/GRAALVM.md) for build requirements, reflection hints, native Maven configuration, and troubleshooting the most common failure modes.

## 4. Production config — the one property you must change

Development uses `spring.jpa.hibernate.ddl-auto=update` so the schema evolves with your entities. **In production**, set it to `validate`:

```properties
# application-prod.properties (or via environment variable)
spring.jpa.hibernate.ddl-auto=validate
```

With `validate`, Hibernate only checks that the schema matches your entities on startup and fails fast if it doesn't. Schema changes are then a deliberate step, not a side effect of a deploy.

In Copilot CLI:

```
Create an application-prod.properties with production-safe settings:
ddl-auto=validate, actuator endpoints restricted to health/info, SQL
logging disabled. Leave other settings to their defaults.
```

Review and commit.

## 5. A word on secrets

You've been running with hardcoded `user` / `password` for Postgres. That's fine for development but not for anything else.

- Never commit passwords. `.gitignore` already excludes `.env`, but double-check before pushing.
- Use environment variables in production (the generated properties already read from `${SPRING_DATASOURCE_PASSWORD:...}`).
- Use your platform's secret store: Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets (sealed), etc.

See [`references/CONFIGURATION.md`](../references/CONFIGURATION.md) and [`references/SECURITY.md`](../references/SECURITY.md).

---

## 6. (Optional) Deploy to Azure Container Apps

> **Prerequisites:**
> - An Azure account with an active subscription ([free trial](https://azure.microsoft.com/free) works)
> - [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) ≥ 2.85 installed and logged in (`az login`)
> - `jq` installed (`brew install jq` / `apt install jq` / `winget install jqlang.jq`)
>
> This section creates billable Azure resources. The cheapest configuration costs roughly **$0.02–0.05/hour** while running. Delete the resource group afterwards to stop all charges.

You have a working Docker image. The skill's reference file [`references/AZURE.md`](../references/AZURE.md) contains a complete, production-grade deployment recipe for **Azure Container Apps** — HTTPS by default, scale-to-zero, rolling deployments, and optional VNET-injected PostgreSQL with the DB password stored as a Container Apps secret.

Rather than copy-pasting every command by hand, let the agent drive it. Start with the quick start (app only, no database) to get a public URL in a few minutes, then add PostgreSQL if you want persistence.

### Quick start — app only

```
Deploy this app to Azure Container Apps following the "Quick Start (no database)"
section in references/AZURE.md.

- Ask me for RESOURCE_GROUP, LOCATION, and APP_NAME before creating anything.
- Walk me through each step and confirm before running any `az` command that
  creates or modifies Azure resources.
- At the end, print the public URL.
```

Once the app is up, the agent will print the public URL. Verify it:

```bash
# Replace <YOUR_APP_FQDN> with the URL the agent printed
curl https://<YOUR_APP_FQDN>/actuator/health
# {"status":"UP"}
```

Open the URL in a browser — your Todo app is live with TLS managed by Azure.

### Add a PostgreSQL database

```
Now follow the "With PostgreSQL (VNET-injected)" section in references/AZURE.md
to add a managed PostgreSQL database to my existing Azure deployment.

Use the RESOURCE_GROUP, LOCATION, APP_NAME, CONTAINER_APP_ENV, and
CONTAINER_APP_NAME values from the previous deployment. Walk me through one
section at a time and confirm before running anything destructive.
```

The agent will create a VNET, a private PostgreSQL Flexible Server, and store the database password as a Container Apps secret — no credentials committed to source code.

### Deploy the native image instead

```
Redeploy my Azure Container App using the GraalVM native image (Dockerfile-native)
instead of the JVM image.

After redeploying, set --cpu 0.25 --memory 0.5Gi and remove JAVA_TOOL_OPTIONS
(there is no JVM heap to configure). Follow references/AZURE.md.
```

### Clean up

```bash
az group delete --name "$RESOURCE_GROUP" --yes --no-wait
```

This removes the resource group and everything inside it. Takes a few minutes in the background.

---

**Try this yourself**

- Run the native version next to the JVM version (different ports) and time `curl` against both. Compare first-response latency after a fresh start.
- Push your image to Docker Hub (or GitHub Container Registry) and pull it on another machine.
- Ask the agent: *"Set up CI/CD using GitHub Actions and OIDC so every push to main rebuilds and redeploys the Container App — no secrets stored in the repo."* (See [`references/AZURE.md`](../references/AZURE.md#cicd-with-github-actions-oidc-no-secrets).)

---

**Checkpoint**

- `./mvnw -Pprod clean package` produces a runnable JAR
- `docker compose -f docker-compose.yml up` runs the full stack in containers
- You understand the two-stage Dockerfile and why each JVM flag is there
- You've at least *attempted* the native build and observed the startup time difference
- `git log --oneline` shows your `application-prod.properties` commit
- *(Optional)* Your app is live on a public Azure URL

**Next →** [Chapter 9 — Going further](09-going-further.md)

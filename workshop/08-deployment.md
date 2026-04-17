# 08 — Deployment

**In this chapter:**
- Build a **production JAR** and run it locally
- Run the whole stack (app + database) with **Docker Compose**
- Build a **GraalVM native image** and see the startup-time difference
- Know where to go next for **cloud deployment**

This is a tour, not a full DevOps module. By the end, you'll have run your app three different ways.

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

### What's in the Dockerfile?

Open `Dockerfile`. It's a **multi-stage build**:

1. **Build stage** — uses a JDK + Maven image to compile the code and run `./mvnw -Pprod package`.
2. **Runtime stage** — copies only the final JAR into a small JRE image (Alpine-based).

Multi-stage keeps the runtime image under ~200 MB. See [`references/DOCKER.md`](../references/DOCKER.md) for the full explanation including JVM container flags (`-XX:MaxRAMPercentage=75.0`, etc.).

## 3. The native image alternative

A **GraalVM native image** ahead-of-time compiles your app to a standalone binary. Tradeoffs:

- Startup in ~50–200 ms (vs 2–10 s for the JVM)
- Resident memory 50–150 MB (vs 300 MB–1 GB)
- **Slower peak throughput** — no runtime JIT optimization
- **Much slower to build** — minutes, not seconds

Good for serverless, scale-to-zero, short-lived CLI tools. Often not worth it for long-running services under heavy load — pick the right tool for the job.

Dr JSkill generates `Dockerfile-native` and `docker-compose-native.yml` so you can try native with zero setup:

```bash
docker compose -f docker-compose-native.yml up --build
```

The first build takes a while (you're compiling your whole app and every dependency into machine code). Grab another coffee.

Once up, open http://localhost:8080 — same app, way faster to start if you restart it.

Stop:

```bash
docker compose -f docker-compose-native.yml down
```

See [`references/GRAALVM.md`](../references/GRAALVM.md) for build requirements, reflection hints, and troubleshooting.

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

## 5. Cloud deployment — pointers only

Full cloud deployment is out of scope for this workshop, but the skill has you covered:

- **Azure** — see [`references/AZURE.md`](../references/AZURE.md). Covers Azure Container Apps, App Service, and Azure Database for PostgreSQL with a generated Bicep/Terraform template.
- **Any Docker-based host** — your generated image runs anywhere: AWS ECS/Fargate, Google Cloud Run, Fly.io, DigitalOcean App Platform, a VPS with `docker run`. Pair with a managed Postgres.
- **Kubernetes** — not covered by the skill directly. The generated image is standard — any Helm chart for a generic Spring Boot app will work.

Ask the agent for help when you get there:

```
Deploy this app to Azure Container Apps following references/AZURE.md. Use
a managed Postgres flexible server for the database. Walk me through the
commands — don't run them without confirming.
```

## 6. A word on secrets

You've been running with hardcoded `user` / `password` for Postgres. That's fine for development but not for anything else.

- Never commit passwords. `.gitignore` already excludes `.env`, but double-check before pushing.
- Use environment variables in production (the generated properties already read from `${SPRING_DATASOURCE_PASSWORD:...}`).
- Use your platform's secret store: Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets (sealed), etc.

See [`references/CONFIGURATION.md`](../references/CONFIGURATION.md) and [`references/SECURITY.md`](../references/SECURITY.md).

---

**Try this yourself**

- Run the native version next to the JVM version (different ports) and time `curl` against both. Compare first-response latency after a fresh start.
- Push your image to Docker Hub (or GitHub Container Registry) and pull it on a friend's machine.
- Ask the agent: *"Add a healthcheck to my Dockerfile that curls `/actuator/health`."*

---

**Checkpoint**

- `./mvnw -Pprod clean package` produces a runnable JAR
- `docker compose -f docker-compose.yml up` runs the full stack in containers
- You've at least *attempted* the native build (it's fine if your machine was too constrained to finish)
- You know which reference file to open for cloud deployment
- `git log --oneline` shows your `application-prod.properties` commit

**Next →** [Chapter 9 — Going further](09-going-further.md)

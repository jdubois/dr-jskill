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

> **Prerequisites for this section:**
> - An Azure account with an active subscription ([free trial](https://azure.microsoft.com/free) works)
> - [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) ≥ 2.85 installed
> - `jq` installed (`brew install jq` / `apt install jq` / `winget install jqlang.jq`)
>
> This section creates billable Azure resources. The cheapest configuration costs roughly **$0.02–0.05/hour** while running. Run `az group delete` at the end to clean up everything.

You have a working Docker image. The fastest path to a public URL is **Azure Container Apps** — a serverless container platform that gives you HTTPS, scale-to-zero, and rolling deployments out of the box.

### 6.1 Install prerequisites and log in

```bash
az extension add --name containerapp --upgrade

az provider register --namespace Microsoft.App                 --wait
az provider register --namespace Microsoft.OperationalInsights --wait

az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 6.2 Set variables

Replace the values below with your own. `APP_NAME` must be lowercase, 3–20 characters, and unique within your subscription (it becomes part of resource names).

```bash
export RESOURCE_GROUP="todo-rg"
export LOCATION="eastus"          # or: francecentral, westeurope, uksouth
export APP_NAME="todo"            # lowercase, 3-20 chars
export ACR_NAME="${APP_NAME}acr$RANDOM"
export CONTAINER_APP_ENV="${APP_NAME}-env"
export CONTAINER_APP_NAME="${APP_NAME}-app"
```

### 6.3 Create infrastructure

```bash
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Container Registry — admin user disabled; pulls use managed identity
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled false

# Log Analytics workspace (create explicitly — the auto-provisioned one is broken)
LAW_NAME="${APP_NAME}-law"
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LAW_NAME" \
  --location "$LOCATION"
LAW_CUSTOMER_ID=$(az monitor log-analytics workspace show \
  -g "$RESOURCE_GROUP" -n "$LAW_NAME" --query customerId -o tsv)
LAW_KEY=$(az monitor log-analytics workspace get-shared-keys \
  -g "$RESOURCE_GROUP" -n "$LAW_NAME" --query primarySharedKey -o tsv)

az containerapp env create \
  --name "$CONTAINER_APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --logs-workspace-id "$LAW_CUSTOMER_ID" \
  --logs-workspace-key "$LAW_KEY"
```

### 6.4 Build and push the image

`az acr build` compiles the image **in Azure** — no local Docker push needed.

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image "$APP_NAME:latest" \
  --file Dockerfile \
  .

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_ID=$(az acr show --name "$ACR_NAME" --query id -o tsv)
```

> **Want to deploy the native image instead?** Replace `--file Dockerfile` with `--file Dockerfile-native` and `--image "$APP_NAME:latest"` with `--image "$APP_NAME:native"`. The rest of the steps are identical; after deploying update the Container App to use `--cpu 0.25 --memory 0.5Gi` and remove `JAVA_TOOL_OPTIONS` (there's no JVM heap to configure). See the [deploy the native image](../references/AZURE.md#deploy-the-native-image) section of `references/AZURE.md`.

### 6.5 Deploy the Container App

The app needs a system-assigned managed identity so it can pull images from ACR without storing any credentials.

```bash
# Create the Container App with a system-assigned identity
az containerapp create \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINER_APP_ENV" \
  --image "$ACR_LOGIN_SERVER/$APP_NAME:latest" \
  --system-assigned \
  --target-port 8080 \
  --ingress external \
  --transport auto \
  --cpu 0.5 --memory 1Gi \
  --min-replicas 0 --max-replicas 10 \
  --env-vars \
    "SPRING_PROFILES_ACTIVE=prod" \
    "JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=75.0"

# Grant the identity permission to pull images
PRINCIPAL_ID=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" --resource-group "$RESOURCE_GROUP" \
  --query identity.principalId -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role AcrPull \
  --scope "$ACR_ID"

# Attach the registry (uses the managed identity — no password stored)
az containerapp registry set \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --server "$ACR_LOGIN_SERVER" \
  --identity system
```

> **Why `JAVA_TOOL_OPTIONS` and not `JAVA_OPTS`?** The Dockerfile runs `java -jar` directly (no shell wrapper), so `JAVA_OPTS` is silently ignored. The JVM reads `JAVA_TOOL_OPTIONS` automatically.

### 6.6 Add health probes

Container Apps does not configure HTTP health probes by default. Wire in the Spring Boot Actuator endpoints so unhealthy replicas are restarted and traffic waits until the app is ready:

```bash
az containerapp show -n "$CONTAINER_APP_NAME" -g "$RESOURCE_GROUP" -o json \
  | jq '.properties.template.containers |= map(. + {probes:[
      {type:"Liveness",  httpGet:{path:"/actuator/health/liveness", port:8080}, initialDelaySeconds:30, periodSeconds:20},
      {type:"Readiness", httpGet:{path:"/actuator/health/readiness",port:8080}, initialDelaySeconds:5,  periodSeconds:10},
      {type:"Startup",   httpGet:{path:"/actuator/health/readiness",port:8080}, failureThreshold:30,    periodSeconds:5}
    ]})' > /tmp/app-with-probes.json

az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --yaml /tmp/app-with-probes.json

rm /tmp/app-with-probes.json
```

> **Liveness vs readiness probes.** Liveness restarts the container if the app stops responding. Readiness removes it from the load balancer until it's ready to serve traffic. The startup probe gives the app 150 s to come up before any other probe fires — generous for a JVM, instant for a native image.

### 6.7 Test

```bash
APP_URL="https://$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)"

curl "$APP_URL/actuator/health"
# {"status":"UP"}

echo "App is live at $APP_URL"
```

Open the URL in a browser. Your Todo app is now running publicly with TLS managed by Azure.

### 6.8 View logs

```bash
az containerapp logs show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --follow
```

### 6.9 (Sub-optional) Add a PostgreSQL database

The app above uses the in-memory H2 database (because no external database is configured). For a persistent production setup, add an **Azure Database for PostgreSQL Flexible Server** and connect it to the Container App.

Ask the agent:

```
Follow references/AZURE.md — the "With PostgreSQL (VNET-injected, Key Vault-backed
password)" section — to add a managed PostgreSQL database to my Azure deployment.
Use RESOURCE_GROUP, LOCATION, APP_NAME, ACR_NAME, CONTAINER_APP_ENV, and
CONTAINER_APP_NAME variables already set in my shell. Walk me through the commands
one section at a time and ask for confirmation before running anything that creates
or modifies Azure resources.
```

The agent will guide you through creating a VNET, a Key Vault (so the database password never appears in source code or shell history), and a private PostgreSQL server that's only reachable from inside the VNET.

### 6.10 Clean up

```bash
az group delete --name "$RESOURCE_GROUP" --yes --no-wait
```

This deletes the resource group and every resource inside it (Container App, ACR, Log Analytics workspace). It takes a few minutes to complete in the background.

---

**Try this yourself**

- Run the native version next to the JVM version (different ports) and time `curl` against both. Compare first-response latency after a fresh start.
- Push your image to Docker Hub (or GitHub Container Registry) and pull it on another machine.
- Ask the agent: *"Set up CI/CD using GitHub Actions and OIDC so every push to main rebuilds the image in ACR and updates the Container App — no secrets stored in the repo."* (See [`references/AZURE.md`](../references/AZURE.md#cicd-with-github-actions-oidc-no-secrets).)

---

**Checkpoint**

- `./mvnw -Pprod clean package` produces a runnable JAR
- `docker compose -f docker-compose.yml up` runs the full stack in containers
- You understand the two-stage Dockerfile and why each JVM flag is there
- You've at least *attempted* the native build and observed the startup time difference
- `git log --oneline` shows your `application-prod.properties` commit
- *(Optional)* Your app is live on a public Azure URL

**Next →** [Chapter 9 — Going further](09-going-further.md)

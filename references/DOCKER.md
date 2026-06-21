# Docker Guide for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development with Automatic Docker Compose Support](#development-with-automatic-docker-compose-support)
- [The Four Image Variants](#the-four-image-variants)
- [Maven Profiles for AOT, Native and CRaC](#maven-profiles-for-aot-native-and-crac)
- [1. JVM Image (`Dockerfile`)](#1-jvm-image-dockerfile)
- [2. JVM + AOT Image (`Dockerfile-aot`)](#2-jvm--aot-image-dockerfile-aot)
- [3. CRaC Image (`Dockerfile-crac`)](#3-crac-image-dockerfile-crac)
- [4. GraalVM Native Image (`Dockerfile-native`)](#4-graalvm-native-image-dockerfile-native)
- [Choosing a Variant](#choosing-a-variant)
- [Application Configuration](#application-configuration)
- [Best Practices](#best-practices)
- [Development vs Production](#development-vs-production)
- [Troubleshooting](#troubleshooting)
- [Quick Reference](#quick-reference)
- [Deployment Checklist](#deployment-checklist)
- [Resources](#resources)

## Overview

This guide covers Docker deployment for Spring Boot 4 applications. It ships **four**
container images, each tuned for a different startup/footprint trade-off, plus the
Docker Compose files that wire them to PostgreSQL.

| File | What it is |
| ---- | ---------- |
| `Dockerfile` | JVM image — `jlink` custom runtime on a **distroless** base |
| `Dockerfile-aot` | JVM + **Spring AOT** for faster startup, distroless |
| `Dockerfile-crac` | **CRaC** (Coordinated Restore at Checkpoint), restores in tens of ms |
| `Dockerfile-native` | **GraalVM** native image, sub-second startup, ~45–80 MB |

**Spring Boot 4 requirements:**

1. Java 17+ (Java 25 is used in the JVM/AOT/native images here).
2. GraalVM 25+ for native images.
3. A CRaC-enabled LTS JDK for the CRaC image (BellSoft Liberica **JDK 21** — CRaC is
   only published for LTS releases).
4. Jakarta EE 11 / Servlet 6.1 baseline.
5. PostgreSQL (`postgres:18-alpine`).

**Techniques shared by these images:**

1. **Multi-stage builds** — compile with a full JDK / GraalVM, ship only the runtime.
2. **Exploded Spring Boot layers** (JVM/AOT) — the repackaged jar is extracted with
   `-Djarmode=tools ... extract --layers` so the large, rarely-changing dependency
   layer is cached separately and the app runs via the `JarLauncher`.
3. **`jlink` custom runtime** (JVM/AOT) — only the JDK modules the app needs, with
   debug symbols/man-pages/headers stripped, replacing the full ~200 MB JRE.
4. **Distroless runtime base** (`gcr.io/distroless/base-debian12:nonroot`) for the
   JVM, AOT and native images — glibc + a CA bundle, but **no shell, package manager,
   curl or tar**, which removes the bulk of OS-package CVEs. Runs as the unprivileged
   `nonroot` user (uid 65532).
5. **Container-aware JVM flags** passed via `JAVA_TOOL_OPTIONS` (no shell to split a
   `JAVA_OPTS` string), with G1GC, string deduplication, compact object headers
   (a JDK 25 product feature) and fail-fast heap dumps.
6. ❌ **No Buildpacks / Jib** — stick to the provided Dockerfiles and Compose files.

> **Distroless implications.** Because the JVM/AOT/native runtime images have no
> shell, there is **no in-container `HEALTHCHECK`** and you cannot `docker exec`
> a shell into them. Probe `/actuator/health` from your orchestrator's liveness /
> readiness checks (or from the host), and debug via logs, JFR and heap dumps. The
> CRaC image is the exception — its Liberica base keeps a `/bin/sh`.

## Prerequisites

1. Docker installed and running (with BuildKit, the default in modern Docker — the
   Dockerfiles start with `# syntax=docker/dockerfile:1`).
2. Docker Compose (included with Docker Desktop).
3. A Spring Boot application with a Maven build.

## Development with Automatic Docker Compose Support

Spring Boot 4 includes the `spring-boot-docker-compose` dependency that automatically
manages Docker containers during development. No manual `docker compose up` needed!

### How It Works

When you run `./mvnw spring-boot:run`, Spring Boot will:
1. Detect the `compose.yaml` or `docker-compose.yml` file in your project root.
2. Automatically start the PostgreSQL container defined in the compose file.
3. Configure the datasource connection automatically.
4. Stop the container when the application shuts down.

### Setup

Create a `compose.yaml` file in your project root (or copy from `assets/compose.yaml`):

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 512m
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```
> Compose spec v2+: omit the `version:` key. Spring Boot's `spring-boot-docker-compose`
> works with this layout.

### Usage

```bash
# Just run your application - PostgreSQL starts automatically!
./mvnw spring-boot:run
```

### Configuration

Add the dependency to your `pom.xml` (included by default in full-stack projects):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-docker-compose</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

You can customize behavior in `application.properties`:

```properties
# Disable Docker Compose support
spring.docker.compose.enabled=false

# Keep containers running after application stops (useful for debugging)
spring.docker.compose.lifecycle-management=start-only

# Specify custom compose file location
spring.docker.compose.file=docker/compose-dev.yaml
```

**Note:** This is for development only. For production deployment, see the sections below.

## The Four Image Variants

All four images are multi-stage and run as a non-root user. They differ in how the
application is executed at runtime:

| Variant | Runtime base | Startup | Image size¹ | Needs at build/run time |
| ------- | ------------ | ------- | ----------- | ----------------------- |
| JVM (`Dockerfile`) | distroless glibc | baseline | ~170 MB | nothing special |
| JVM + AOT (`Dockerfile-aot`) | distroless glibc | ~30–50 % faster context refresh | ~JVM (+70–100 MB if you add the JDK AOT cache) | `aot` Maven profile |
| CRaC (`Dockerfile-crac`) | Liberica CRaC slim-glibc | restore in ~tens of ms | ~JVM + checkpoint volume | **Linux + CRIU privileges**, LTS JDK 21, `crac` profile |
| GraalVM native (`Dockerfile-native`) | distroless glibc | well under 1 s | ~45–80 MB | GraalVM 25 toolchain (in the build image), `native` profile |

> ¹ Sizes are indicative — they depend on your dependency set. The relative ordering
> (native ≪ JVM ≈ AOT) is the reliable takeaway.

Each Dockerfile is self-documenting (read the header comment) and pairs with a Compose
file:

| Image | Full-stack Compose (with PostgreSQL) | App-only Compose |
| ----- | ------------------------------------ | ---------------- |
| `Dockerfile` | `docker-compose.yml` | `docker-compose-nodb.yml` |
| `Dockerfile-aot` | `docker-compose-aot.yml` | — |
| `Dockerfile-crac` | `docker-compose-crac.yml` (DB-free) | — |
| `Dockerfile-native` | `docker-compose-native.yml` | `docker-compose-native-nodb.yml` |

## Maven Profiles for AOT, Native and CRaC

The AOT, native and CRaC images activate Maven profiles during the build. Add these
to your `pom.xml` `<profiles>` section (projects that inherit `spring-boot-starter-parent`
get the dependency versions managed by the BOM):

```xml
<profiles>
    <!-- JVM AOT: pre-generate the application-context wiring at build time
         (used by Dockerfile-aot). Activate with -Paot. -->
    <profile>
        <id>aot</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <executions>
                        <execution>
                            <id>process-aot</id>
                            <goals>
                                <goal>process-aot</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </build>
    </profile>

    <!-- GraalVM native image (used by Dockerfile-native). Activate with -Pnative. -->
    <profile>
        <id>native</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.graalvm.buildtools</groupId>
                    <artifactId>native-maven-plugin</artifactId>
                    <extensions>true</extensions>
                    <configuration>
                        <metadataRepository>
                            <enabled>true</enabled>
                        </metadataRepository>
                    </configuration>
                    <executions>
                        <execution>
                            <id>add-reachability-metadata</id>
                            <goals>
                                <goal>add-reachability-metadata</goal>
                            </goals>
                        </execution>
                        <execution>
                            <id>build-native</id>
                            <goals>
                                <goal>compile-no-fork</goal>
                            </goals>
                            <phase>package</phase>
                        </execution>
                    </executions>
                </plugin>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <configuration>
                        <classifier>exec</classifier>
                    </configuration>
                </plugin>
            </plugins>
        </build>
    </profile>

    <!-- CRaC: add the org.crac adapter so spring.context.checkpoint=onRefresh works
         (used by Dockerfile-crac). Activate with -Pcrac. -->
    <profile>
        <id>crac</id>
        <dependencies>
            <dependency>
                <groupId>org.crac</groupId>
                <artifactId>crac</artifactId>
            </dependency>
        </dependencies>
    </profile>
</profiles>
```

## 1. JVM Image (`Dockerfile`)

The default production image. It builds the app with a full JDK, explodes the
repackaged jar into layers, assembles a minimal `jlink` runtime, and ships it on a
**distroless** glibc base.

**Features:**

1. Multi-stage build with a glibc JDK (`eclipse-temurin:25-jdk-noble`) so the
   frontend-maven-plugin's Node.js binaries run and the `jlink` runtime matches the
   distroless glibc base.
2. Exploded Spring Boot layers run via the `JarLauncher` (better layer caching, no
   second copy of the fat jar).
3. Custom `jlink` runtime (a Spring-Boot-data-app module superset — trim or extend it
   for your app).
4. Distroless `:nonroot` runtime: no shell, package manager or curl; uid 65532.
5. Container-aware JVM flags via `JAVA_TOOL_OPTIONS`.

**Build and run:**

```bash
docker build -t my-spring-app .
docker run --rm -e SPRING_BOOT_PORT=8080 -p 8080:8080 my-spring-app
```

**With Compose (app + PostgreSQL):**

```bash
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml logs -f
docker compose -f docker-compose.yml down       # add -v to delete the DB volume
```

## 2. JVM + AOT Image (`Dockerfile-aot`)

The same image as `Dockerfile`, built with the `aot` Maven profile so Spring Boot's
**AOT processing** (`spring-boot:process-aot`) pre-generates the application-context
wiring at build time. Dynamic reflection / CGLIB proxy creation is replaced by static
factory code; `-Dspring.aot.enabled=true` (baked into `JAVA_TOOL_OPTIONS`) activates it
at runtime.

- **Result:** roughly **30–50 % less Spring context-refresh time**.
- **No extra runtime infrastructure** (unlike CRaC) and the Spring profile is **not**
  frozen (unlike GraalVM native) — you can still override `SPRING_PROFILES_ACTIVE`.
- `process-aot` only evaluates bean definitions at build time, so the image **builds
  without a running database** (exactly like the native image's AOT step).

**Build and run:**

```bash
docker build -f Dockerfile-aot -t my-spring-app-aot .
docker run --rm -e SPRING_BOOT_PORT=8080 -p 8080:8080 my-spring-app-aot
# or: docker compose -f docker-compose-aot.yml up --build
```

### Optional: JDK 25 AOT class-loading cache (JEP 483/514)

For an additional **~20–30 %** class-loading saving you can layer the JDK 25 AOT
class-loading cache on top of Spring AOT. A "training" run records every class loaded
during a real startup; production reads the pre-verified, pre-linked class data
directly from the cache.

The catch: training **boots the app for real**, so a database-backed app needs a
reachable database (or an in-memory profile) at build time, and the training and
runtime JVMs must use the **same** heap (`-Xms`/`-Xmx`), GC and `-XX:+UseCompactObjectHeaders`
flags or the cache is silently ignored. Because this can't be guaranteed for an
arbitrary project, it is **not** baked into `Dockerfile-aot` by default. To add it,
after the `jlink` step train the cache against the exploded app and copy `app.aot`
into the runtime image:

```dockerfile
# (build stage, after the layers are extracted to /app/extracted)
RUN mkdir -p /app/training && \
    cp -r /app/extracted/spring-boot-loader/. /app/training/ && \
    cp -r /app/extracted/dependencies/. /app/training/ && \
    cp -r /app/extracted/snapshot-dependencies/. /app/training/ && \
    cp -r /app/extracted/application/. /app/training/
RUN cd /app/training && \
    SPRING_PROFILES_ACTIVE=dev \
    /javaruntime/bin/java \
        -XX:AOTCacheOutput=/app/app.aot \
        -Xms256m -Xmx256m -XX:+UseG1GC -XX:+UseCompactObjectHeaders \
        -Dspring.aot.enabled=true -Dspring.context.exit=onRefresh \
        org.springframework.boot.loader.launch.JarLauncher
```

Then `COPY --from=build --chown=65532:65532 /app/app.aot ./app.aot` in the runtime
stage and append `-XX:AOTCache=/app/app.aot` to `JAVA_TOOL_OPTIONS` (keep the same
heap/GC/object-header flags used during training). `spring.context.exit=onRefresh`
makes the training JVM exit cleanly as soon as the context refreshes.

## 3. CRaC Image (`Dockerfile-crac`)

[CRaC](https://crac.org/) (Coordinated Restore at Checkpoint) snapshots a fully
warmed-up JVM process to disk and restores it in a few tens of milliseconds, without
the ahead-of-time compilation a native image requires.

**Constraints:**

- **Linux only**, and the container needs CRIU privileges (`--privileged`, or the
  `CHECKPOINT_RESTORE`, `SYS_PTRACE` and `SYS_ADMIN` capabilities).
- A **CRaC-enabled LTS JDK** — this image uses BellSoft Liberica **JDK 21** (CRaC is
  not published for non-LTS releases like 25). The build forces `-Djava.version=21`
  so the app compiles for Java 21; Spring Boot 4 runs on Java 17+, so this is fine.
- A clean checkpoint requires **no open network sockets** — an open JDBC/Redis
  connection at checkpoint time aborts CRaC. Take the checkpoint with an in-memory
  profile, or register CRaC resource handlers that close pooled connections before the
  checkpoint and reopen them after restore. (`docker-compose-crac.yml` runs the app
  **DB-free** for this reason.)

The `checkpoint-and-run.sh` entrypoint creates a checkpoint on the first start
(`spring.context.checkpoint=onRefresh`) and restores from it on every start afterwards.
The checkpoint lives in a named volume so it survives restarts.

**Build and run:**

```bash
docker build -f Dockerfile-crac -t my-spring-app-crac .
docker run --rm -p 8080:8080 \
  --cap-add=CHECKPOINT_RESTORE --cap-add=SYS_PTRACE --cap-add=SYS_ADMIN \
  -v my-spring-app-crac:/opt/crac/checkpoint my-spring-app-crac
# or: docker compose -f docker-compose-crac.yml up --build   # (Linux host)
```

## 4. GraalVM Native Image (`Dockerfile-native`)

Native compilation with GraalVM 25 for the fastest startup and lowest memory
footprint. The executable is built **"mostly static"** (`-H:+StaticExecutableWithDynamicLibC`,
set via `NATIVE_IMAGE_OPTIONS`), so the distroless glibc base needs no extra shared
libraries.

**Features:**

1. GraalVM 25 native-image compilation (required for Spring Boot 4; GraalVM 25 = JDK 25).
2. Ultra-fast startup (well under a second) and low memory use.
3. Smallest runtime image (~45–80 MB) on a distroless `:nonroot` base.
4. No local GraalVM install needed — the toolchain lives in the build image.

**Build and run:**

```bash
docker build -f Dockerfile-native -t my-spring-app-native .
docker run --rm -e SPRING_BOOT_PORT=8080 -p 8080:8080 my-spring-app-native
# or: docker compose -f docker-compose-native.yml up -d --build
```

**Build a native executable locally** (needs a GraalVM 25+ toolchain on the `PATH`):

```bash
./mvnw -Pnative -DskipTests package
./target/<your-artifact-id>
```

### Native build requirements

- **GraalVM 25+** for Spring Boot 4.
- AOT freezes auto-configuration at build time, so the active Spring profile is
  **baked in** during `process-aot` and cannot be switched with a runtime env var
  (unlike the JVM / AOT / CRaC images).
- Ensure reflection, resources and JNI access are declared. Spring Boot 4.x and most
  Spring libraries ship native hints out of the box; the `native` profile downloads
  GraalVM reachability metadata for third-party libraries.
- Testcontainers 2.0+ supports native testing.

## Choosing a Variant

- **`Dockerfile` (JVM)** — the safe default. Smallest blast radius, full JVM
  observability, low-CVE distroless base.
- **`Dockerfile-aot`** — when you want faster JVM starts (scale-to-zero, frequent
  rolling restarts) without GraalVM's build-time freeze or CRaC's privileges.
- **`Dockerfile-crac`** — when you need near-instant restores on Linux and can grant
  CRIU privileges and accept the no-open-sockets checkpoint constraint.
- **`Dockerfile-native`** — when you want sub-second startup and the smallest image,
  and can pay the longer native build and accept the build-time profile freeze.

## Application Configuration

### Environment Variables

Configure your application using environment variables in the Compose file:

```yaml
environment:
  SPRING_BOOT_PORT: ${SPRING_BOOT_PORT:-8080}
  SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
  SPRING_DATASOURCE_USERNAME: user
  SPRING_DATASOURCE_PASSWORD: password
  SPRING_JPA_HIBERNATE_DDL_AUTO: update
```

> Schema management uses Hibernate's `spring.jpa.hibernate.ddl-auto`. Set it to
> `validate` (or `none`) in production once your schema is stable.

### For Application-Only Deployment

If your application doesn't use a database, use an app-only Compose file
(`docker-compose-nodb.yml` / `docker-compose-native-nodb.yml`):

```yaml
services:
  spring-app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      SPRING_BOOT_PORT: ${SPRING_BOOT_PORT:-8080}
    ports:
      - "${SPRING_BOOT_PORT:-8080}:${SPRING_BOOT_PORT:-8080}"
    restart: unless-stopped
```

> Modern Docker Compose doesn't require a `version:` field. Avoid hardcoded
> `container_name` values in local Compose files when using Git worktrees; let Compose
> derive names from `COMPOSE_PROJECT_NAME`.

## Best Practices

### 1. Image Optimization
- Multi-stage builds keep the build toolchain out of the final image (all four
  Dockerfiles do this).
- Ship a `jlink` runtime + distroless base for the JVM/AOT images, and a "mostly
  static" binary + distroless base for native — far smaller and lower-CVE than a full
  JRE/Debian image.
- Explode Spring Boot layers so the rarely-changing dependency layer is reused from
  cache across rebuilds.
- Use `.dockerignore` to keep `target/`, `node_modules/`, `.git/` and secrets out of
  the build context.

### 2. Security
- Run as a non-root user (the distroless `:nonroot` user is uid 65532; the CRaC image
  also runs unprivileged except for the CRIU capabilities it needs).
- The distroless base has **no shell, package manager or curl**, which removes the bulk
  of OS-package CVEs and the usual "shell in the container" attack surface.
- **Pin specific versions** in production (`postgres:18-alpine`, the digest of the
  distroless base) — avoid `latest`.
- Scan images for vulnerabilities: `docker scout cves my-app`.

### 3. Health Checks
- The JVM/AOT/native images are distroless and **cannot run an in-container
  `HEALTHCHECK`** (no shell/curl). Probe `/actuator/health` from your orchestrator's
  liveness/readiness probes, or from the host, instead.
- Expose Spring Boot Actuator's health endpoint and configure appropriate intervals
  and timeouts at the orchestrator level.

### 4. Resource Management
- Set memory limits in Compose:
  ```yaml
      deploy:
        resources:
          limits:
            memory: 512M
          reservations:
            memory: 256M
  ```
- **JVM/AOT:** `JAVA_TOOL_OPTIONS` already includes `-XX:+UseContainerSupport` and
  `-XX:MaxRAMPercentage=75.0`, so the heap tracks the container memory limit. Override
  the variable to retune.
- **CRaC:** heap/GC flags are frozen into the checkpoint when it is created; change
  `JAVA_OPTS` and regenerate the checkpoint to retune.
- **Native:** no JVM tuning needed — the executable is already optimized.

### 5. Data Persistence
- Use named volumes for database data and back them up regularly.
- The CRaC checkpoint also lives in a named volume; delete it to force a fresh
  checkpoint after a config change.

### 6. Networking
- Use custom networks for service isolation and expose only necessary ports.
- Use service names for inter-container communication.

## Development vs Production

### Development Setup
```bash
# PostgreSQL starts automatically when you run the app (spring-boot-docker-compose)
./mvnw spring-boot:run

# Or run the whole stack in containers
docker compose -f docker-compose.yml up --build
```

### Production Setup
```bash
# Build a production image (pick the variant you need)
docker build -t myapp:1.0.0 .

# Tag and push to a registry
docker tag myapp:1.0.0 myregistry.com/myapp:1.0.0
docker push myregistry.com/myapp:1.0.0

# Deploy a specific version
docker run -d -p 8080:8080 myregistry.com/myapp:1.0.0
```

## Troubleshooting

### Container Logs
```bash
# View application logs
docker logs <container> -f

# View all service logs
docker compose -f docker-compose.yml logs -f
```

### Debugging a distroless image (no shell)
You cannot `docker exec -it ... sh` into the JVM/AOT/native images. Instead:
```bash
# Inspect the effective config and entrypoint
docker inspect <container>

# Attach a debug sidecar that shares the target's PID/network namespace
docker run -it --rm --pid=container:<container> --network=container:<container> \
  busybox sh

# The CRaC image keeps a shell, so this still works there:
docker exec -it <crac-container> sh
```

### Database Connection Issues
```bash
# Check if PostgreSQL is ready (the postgres image has pg_isready)
docker exec <postgres-container> pg_isready -U user

# Connect to the database
docker exec -it <postgres-container> psql -U user -d mydb
```

### CRaC checkpoint failures
- Confirm you are on a **Linux** host and the container has CRIU privileges.
- Ensure **no open network sockets** at checkpoint time (close DB/Redis pools or use
  an in-memory profile).
- Delete the checkpoint volume to force a fresh checkpoint after a config change.

### Performance Monitoring
```bash
docker stats
docker inspect <container>
```

## Quick Reference

```bash
# Build each variant
docker build -t my-app .                                  # JVM
docker build -f Dockerfile-aot    -t my-app-aot .         # JVM + AOT
docker build -f Dockerfile-native -t my-app-native .      # GraalVM native
docker build -f Dockerfile-crac   -t my-app-crac .        # CRaC (Linux)

# Run the full stack
docker compose -f docker-compose.yml         up -d --build   # JVM + Postgres
docker compose -f docker-compose-aot.yml     up -d --build   # AOT + Postgres
docker compose -f docker-compose-native.yml  up -d --build   # native + Postgres
docker compose -f docker-compose-crac.yml    up --build      # CRaC (Linux, DB-free)

# Logs / stop / clean
docker compose -f docker-compose.yml logs -f spring-app
docker compose -f docker-compose.yml down            # add -v to delete volumes
docker system prune -a                               # clean up unused images
```

## Deployment Checklist
- [ ] Update database credentials (change from the default `user`/`password`).
- [ ] Configure environment variables for production.
- [ ] **Pin versions**: specific tags / digests (`postgres:18-alpine`, the distroless
      base digest) — not `latest`.
- [ ] **Java version**: Java 25 for the JVM/AOT/native images; **JDK 21** for CRaC.
- [ ] **GraalVM version**: GraalVM 25+ for native images.
- [ ] Add the required Maven profile (`aot` / `native` / `crac`) to `pom.xml`.
- [ ] Set up health probes at the orchestrator level (distroless images have no
      in-container `HEALTHCHECK`).
- [ ] Configure resource limits (memory, CPU).
- [ ] Set `spring.jpa.hibernate.ddl-auto` to `validate`/`none` once the schema is stable.
- [ ] Configure backups for data volumes.
- [ ] Test container restart behavior (and checkpoint regeneration for CRaC).
- [ ] Security scan: run `docker scout cves` on built images.

## Resources
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Distroless base images](https://github.com/GoogleContainerTools/distroless)
- [Spring Boot — Efficient container images](https://docs.spring.io/spring-boot/reference/packaging/container-images/efficient-images.html)
- [Spring Boot — Class Data Sharing & AOT cache](https://docs.spring.io/spring-boot/reference/packaging/class-data-sharing.html)
- [GraalVM Native Image](https://www.graalvm.org/latest/reference-manual/native-image/)
- [Spring Boot — GraalVM Native Image support](https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html)
- [CRaC project](https://crac.org/) · [Spring Boot — CRaC checkpoint/restore](https://docs.spring.io/spring-boot/reference/packaging/checkpoint-restore.html)

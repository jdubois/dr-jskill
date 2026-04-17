# GraalVM Native Image Guide for Spring Boot Applications

## Versions

<!-- versions:start -->
| Tool | Version |
|------|---------|
| GraalVM | 25 |
| Java (Temurin) | 25 |
| PostgreSQL | 18 |
<!-- versions:end -->

Run `node scripts/sync-versions-in-docs.mjs` at the repo root to keep this
table aligned with `versions.json`.

## Contents
- [Overview](#overview)
- [Agent instructions — detect first, ask only if ambiguous](#agent-instructions--detect-first-ask-only-if-ambiguous)
- [Prerequisites](#prerequisites)
- [Docker-Based Native Builds (Recommended)](#docker-based-native-builds-recommended)
- [Spring Boot Configuration for Native Images](#spring-boot-configuration-for-native-images)
- [Testing Native Images](#testing-native-images)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [References](#references)

## Overview
This guide covers building GraalVM native images for Spring Boot 4 applications using Docker multi-stage builds. Native images provide significantly faster startup times and lower memory footprint, making them ideal for microservices and serverless deployments.

**Key Benefits:**

1. **Instant Startup**: Native images start in milliseconds instead of seconds
2. **Low Memory**: Reduced memory footprint (typically 50-70% less than JVM)
3. **Optimized Performance**: Ahead-of-time compilation optimizes code at build time
4. **Improved Security**: Smaller attack surface with only required dependencies

## Agent instructions — detect first, ask only if ambiguous

> **If you are an AI agent applying this guide, automate as much as possible.**
> Inspect the project, apply the rules below, and only ask the user when a
> check genuinely leaves you in doubt.

Run these pre-flight checks:

```bash
# 1. Docker must be running with ≥ 8 GB available.
docker info --format '{{.ServerVersion}} / {{.MemTotal}}' 2>/dev/null \
  || { echo "ERROR: Docker not reachable."; exit 1; }

# 2. artifactId — used as the native executable name under target/.
ARTIFACT_ID=$(./mvnw -q help:evaluate -Dexpression=project.artifactId -DforceStdout)

# 3. Native profile already present?
grep -q "<id>native</id>" pom.xml && HAS_NATIVE=1 || HAS_NATIVE=0

# 4. start-class set?
grep -q "<start-class>" pom.xml && HAS_START_CLASS=1 || HAS_START_CLASS=0

# 5. @SpringBootApplication class(es)
MAIN_CLASSES=$(grep -rl '@SpringBootApplication' src/main/java 2>/dev/null)

# 6. Frontend build integrated?
test -d frontend && HAS_FRONTEND=1 || HAS_FRONTEND=0
```

Decision rules — apply automatically:

| Finding | Action |
|---|---|
| Docker not running | **Abort** and tell the user to start Docker. Do not fall back to local GraalVM. |
| `native` profile missing | Add the profile block from [Maven Configuration](#maven-configuration). |
| `start-class` missing, exactly **one** `@SpringBootApplication` class found | Write its fully-qualified name into `<start-class>` under `<properties>`. |
| `frontend/` directory absent | Remove `COPY frontend ./frontend` from `Dockerfile-native`. |
| `frontend/` directory present | Keep the COPY (skill convention: `frontend-maven-plugin` builds it during `mvn package`). |
| Target image name | `${ARTIFACT_ID}-native:latest`. |
| Docker RAM < 8 GB reported by `docker info` | Warn the user but continue. |

Ask the user **only** in these cases:

- **Multiple `@SpringBootApplication` classes** found and `start-class` is not set — ask which one to use as the entry point.
- **Non-standard project layout** (no `pom.xml` at root, multi-module Maven build, Gradle) — ask how to proceed; the skill targets single-module Maven only.
- **User is explicitly retrofitting a production project** and the Dockerfile you'd produce would overwrite existing CI assumptions — confirm before editing shared files.

Default choices applied silently (do **not** ask):

- Build via Docker only. No local GraalVM install.
- No native integration test (adds 10–15 min to CI).
- Runtime image: `gcr.io/distroless/base-debian12`; no `HEALTHCHECK`; user `nonroot` (UID 65532).

After applying, report a short summary — files touched, chosen `start-class`,
whether the frontend COPY was kept — and suggest:

```bash
docker build -f Dockerfile-native -t ${ARTIFACT_ID}-native:latest .
```

## Prerequisites

1. Docker installed and running (≥ 8 GB RAM allocated)
2. Spring Boot 4 application with Maven
3. GraalVM 25+ *(only for local builds — the Dockerfile handles this in CI and Docker builds)*
4. Sufficient build resources (native compilation is resource-intensive)

## Docker-Based Native Builds (Recommended)

**Why Docker for Native Builds?**

- Consistent build environment across all platforms (macOS, Windows, Linux)
- No need to install GraalVM locally
- Multi-stage builds keep final image small
- Easy to reproduce builds in CI/CD pipelines

### Standard Dockerfile for Native Images

Use the `Dockerfile-native` for building native images with Docker:

```dockerfile
# Multi-stage Dockerfile for GraalVM Native Image
# Builds and runs a native Spring Boot application
# Requires GraalVM 25+ for Spring Boot 4 (GraalVM 25 = JDK 25)

# Build stage with GraalVM 25 (includes native-image toolchain, JDK 25)
FROM ghcr.io/graalvm/graalvm-community:25 AS build

# Set working directory
WORKDIR /app

# Copy Maven wrapper and pom.xml (dependency caching layer)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src ./src

# Copy frontend directory if present (for fullstack projects with frontend-maven-plugin)
# If no frontend/ exists, comment out or remove this line
COPY frontend ./frontend

# Build native image (compile → process-aot → native compile).
# Must invoke `package` so Spring Boot's `process-aot` goal (bound to
# prepare-package by the `native` profile) actually runs and generates AOT
# sources + native-image hints. Running `native:compile` on its own skips the
# prior phases and produces a native-image call with an empty AOT classpath,
# which fails with misleading errors (e.g. SLF4J falling back to the NOP
# provider when HikariConfig is initialized at build time).
RUN ./mvnw -Pnative -DskipTests package native:compile

# Move native executable to a known path (artifact name varies per project)
RUN if [ -f target/$(./mvnw help:evaluate -Dexpression=project.artifactId -q -DforceStdout 2>/dev/null) ]; then \
      cp target/$(./mvnw help:evaluate -Dexpression=project.artifactId -q -DforceStdout 2>/dev/null) native-app; \
    else \
      native_exe=$(find target -maxdepth 3 -type f -executable ! -name '*.jar' ! -name '*.jar.original' | head -1) && \
      if [ -n "$native_exe" ]; then cp "$native_exe" native-app; \
      else echo "ERROR: Native executable not found in target/"; ls -laR target/ | head -40; exit 1; fi; \
    fi

# Runtime stage with distroless (glibc-based, ~20 MB)
# Uses base-debian12 because the native binary is linked against glibc
FROM gcr.io/distroless/base-debian12

# Set working directory
WORKDIR /app

# Copy the native executable from build stage
# distroless ships a built-in nonroot user (UID 65532)
COPY --from=build --chown=nonroot:nonroot /app/native-app native-app

# Switch to non-root user
USER nonroot

# Expose port
EXPOSE 8080

# No HEALTHCHECK here — distroless has no shell or curl.
# Define healthchecks in Docker Compose or your orchestrator.

# Run the native application
ENTRYPOINT ["./native-app"]
```

**Key Points:**

1. **Build Stage**: Uses GraalVM 25 Community Edition (Oracle Linux 9) — includes the `native-image` toolchain and JDK 25.
2. **Native Compile**: `./mvnw -Pnative -DskipTests package native:compile` invokes GraalVM's `native-image` via the `native-maven-plugin`. The explicit `package` phase is required so Spring Boot's `process-aot` goal runs first — otherwise AOT sources and native-image hints are never generated and the build fails with cryptic errors inside `native-image`.
3. **Portable Copy**: First tries `target/<artifactId>` (the default native output), then falls back to `find` so the Dockerfile works regardless of Maven's output name.
4. **Distroless Runtime**: Final image is `gcr.io/distroless/base-debian12` (~20 MB, glibc-based) — ships the shared libraries the native binary needs, nothing else. No shell, no package manager.
5. **Non-Root User**: Runs as the built-in `nonroot` user (UID **65532**) provided by distroless.
6. **No Dockerfile HEALTHCHECK**: Distroless has no shell, `curl`, or `wget`. Define health checks in Docker Compose / Kubernetes / your orchestrator against `GET /actuator/health` (Spring Boot Actuator is enabled by the skill).

### Building the Native Image

```bash
# Build the Docker image
docker build -f Dockerfile-native -t myapp-native:latest .

# Build time: Expect 5-15 minutes depending on application size
# Build requires: 8GB+ RAM recommended for complex applications
```

### Running the Native Image

```bash
# Run the native application
docker run -p 8080:8080 myapp-native:latest

# With environment variables
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/mydb \
  myapp-native:latest
```

### Docker Compose for Native Images

Use `docker-compose-native.yml` for full-stack deployments:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile-native
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
      SPRING_DATASOURCE_USERNAME: user
      SPRING_DATASOURCE_PASSWORD: password
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Deploy with:**

```bash
# Build and run
docker compose -f docker-compose-native.yml up -d

# View logs
docker compose -f docker-compose-native.yml logs -f app

# Stop and clean up
docker compose -f docker-compose-native.yml down
```

## Spring Boot Configuration for Native Images

### Maven Configuration

Ensure your `pom.xml` includes the `start-class` property and the native profile:

```xml
<properties>
    <java.version>25</java.version>
    <!-- Use your actual main class: {CamelCaseArtifactId}Application -->
    <start-class>com.example.app.MyAppApplication</start-class>
</properties>

<profiles>
    <profile>
        <id>native</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.graalvm.buildtools</groupId>
                    <artifactId>native-maven-plugin</artifactId>
                    <executions>
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
</profiles>
```

> ⚠️ The `start-class` property is **required** for `process-aot` to find the main class. Without it, native builds and Docker builds will fail.

### Native Hints

Most Spring Boot 4 libraries work out-of-the-box with native images. For custom reflection or resource access, use `@RegisterReflectionForBinding`:

```java
@SpringBootApplication
@RegisterReflectionForBinding({MyDTO.class, MyEntity.class})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### Runtime Hints

For advanced cases, create a custom `RuntimeHintsRegistrar`:

```java
@Component
public class MyRuntimeHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // Register reflection
        hints.reflection().registerType(MyClass.class, 
            MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
            MemberCategory.INVOKE_PUBLIC_METHODS);
        
        // Register resources
        hints.resources().registerPattern("config/*.properties");
    }
}
```

## Testing Native Images

### Local Testing

```bash
# Build native image locally (requires GraalVM installed)
./mvnw -Pnative -DskipTests package native:compile

# Run the native executable (name matches your artifactId)
./target/myapp

# Test with Docker
docker build -f Dockerfile-native -t myapp-native:test .
docker run -p 8080:8080 myapp-native:test

# Verify startup time
curl http://localhost:8080/actuator/health
```

### Integration Tests with Native Profile

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class NativeApplicationTests {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void contextLoads() {
        // Verify application starts
    }

    @Test
    void healthEndpointWorks() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/actuator/health", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

## Troubleshooting

### Common Issues

**Issue 1: Build Fails with "Out of Memory"**

```bash
# Increase Docker memory allocation
# Docker Desktop -> Settings -> Resources -> Memory: 8GB+

# Or use Docker build args
docker build --memory=8g -f Dockerfile-native -t myapp-native .
```

**Issue 2: Missing Reflection Configuration**

```
Error: Class MyClass cannot be found for reflection
```

**Solution:** Add `@RegisterReflectionForBinding` or create a `RuntimeHintsRegistrar`.

**Issue 3: Resource Not Found**

```
Error: Resource 'config/data.json' not found
```

**Solution:** Register resources with runtime hints:

```java
hints.resources().registerPattern("config/*.json");
```

**Issue 4: Slow Build Times**

Native compilation is CPU and memory intensive. Strategies to improve:

1. **Use Docker Build Cache**: Docker caches layers, speeding up rebuilds
2. **Build in CI/CD**: Offload builds to powerful CI/CD servers
3. **Parallel Builds**: Use buildpack for parallel layer building
4. **Skip During Development**: Use JVM mode for faster iteration

**Issue 5: `UnsupportedFeatureException` for SLF4J/Logback helpers (HikariConfig)**

Symptoms — `native-image` aborts with one of:

```
An object of type 'org.slf4j.helpers.NOP_FallbackServiceProvider' was found in the image heap.
An object of type 'org.slf4j.helpers.SubstituteServiceProvider' was found in the image heap.
An object of type 'ch.qos.logback.classic.spi.LogbackServiceProvider' was found in the image heap.
```

with a trace pointing at `com.zaxxer.hikari.HikariConfig.<clinit>`.

**Root cause.** The GraalVM reachability-metadata repository bundled with
`native-maven-plugin` has no config for the newer library versions Spring
Boot 4.0.5 ships (HikariCP 7.x, logback-classic 1.5.32, Jackson 2.21.x) and
silently falls back to stale configs for HikariCP 6.0.0 / logback 1.5.7.
Those stale configs force `HikariConfig` to be initialized at build time,
which calls `LoggerFactory.getLogger(...)` and pulls SLF4J's internal
provider objects into the image heap — but those classes are (correctly)
marked for run-time init by default.

**Solution.** Disable the stale metadata repo and mark SLF4J / Logback for
build-time initialization, by adding this configuration to the
`native-maven-plugin` in `pom.xml`:

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <configuration>
        <metadataRepository>
            <enabled>false</enabled>
        </metadataRepository>
        <buildArgs>
            <buildArg>--initialize-at-build-time=org.slf4j,ch.qos.logback</buildArg>
        </buildArgs>
    </configuration>
</plugin>
```

**Issue 6: `UnsupportedFeatureException` for `com.fasterxml.jackson.core.Base64Variant`**

Symptom — after fixing Issue 5 the build fails with:

```
An object of type 'com.fasterxml.jackson.core.Base64Variant' was found in the image heap.
  scanning root ... embedded in com.fasterxml.jackson.core.Base64Variants.getDefaultVariant(...)
```

**Root cause.** Two Jackson lineages on the classpath. Spring Boot 4 uses
Jackson 3.x under the new `tools.jackson.*` group; a transitive dependency
(most commonly `com.azure:azure-identity-extensions` used for Azure
passwordless JDBC auth) still pulls the old Jackson 2.x under
`com.fasterxml.jackson.*`. AOT processing ends up with both sets of classes
and their native-image initialization configs conflict.

**Solution.** Exclude Jackson 2.x from the offending dependency:

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity-extensions</artifactId>
    <version>1.2.2</version>
    <exclusions>
        <exclusion>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>*</artifactId>
        </exclusion>
        <exclusion>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>*</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

Apply the same pattern to any other dependency that drags in Jackson 2.x.

**Issue 7: `native-image` classpath contains only `target/classes` (no `target/spring-aot/main/classes`)**

Symptom — the `native-image` invocation logged by Maven shows a classpath
like `-cp /app/target/classes:...` with no `spring-aot` entry, and the build
fails with seemingly unrelated `UnsupportedFeatureException`s.

**Root cause.** `./mvnw native:compile` was invoked without running the
`package` phase first, so Spring Boot's `process-aot` goal never executed
and no AOT sources / native-image hints were generated.

**Solution.** Always invoke the `package` phase before `native:compile`:

```bash
./mvnw -Pnative -DskipTests package native:compile
```

This is what the skill's `Dockerfile-native` uses.

### Validation Checklist

Before deploying native images, verify:

- [ ] Application starts in under 1 second
- [ ] All endpoints respond correctly
- [ ] Database connections work
- [ ] Health check endpoint returns 200 OK
- [ ] Docker image size is reasonable (< 200 MB)
- [ ] Memory usage is stable under load
- [ ] No reflection or resource loading errors in logs

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Native Image

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build Native Image
        run: docker build -f Dockerfile-native -t myapp-native:${{ github.sha }} .
      
      - name: Test Native Image
        run: |
          docker run -d -p 8080:8080 --name test-app myapp-native:${{ github.sha }}
          sleep 10
          curl -f http://localhost:8080/actuator/health
          docker stop test-app
```

## References

- [Spring Boot Native Image Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [GraalVM Native Image](https://www.graalvm.org/native-image/)
- [GraalVM Releases](https://github.com/graalvm/graalvm-ce-builds/releases)
- [Spring Native Hints](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html#native-image.advanced.custom-hints)

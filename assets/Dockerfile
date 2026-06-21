# syntax=docker/dockerfile:1
#
# Multi-stage JVM Dockerfile for a Spring Boot application.
#
# This image is deliberately small and low-CVE:
#   1. The repackaged Spring Boot jar is exploded into its layers
#      (`-Djarmode=tools ... extract --layers`) and run via the JarLauncher, so the
#      large, rarely-changing dependency layer is cached separately and there is no
#      second copy of the fat jar baked into the image.
#   2. A custom, minimal Java runtime is assembled with `jlink` (only the JDK modules
#      the app needs, with debug symbols / man-pages / headers stripped), replacing
#      the full ~200 MB JRE.
#   3. The final stage is Google's "distroless" glibc base
#      (`gcr.io/distroless/base-debian12:nonroot`): it ships glibc and a CA bundle
#      but no shell, package manager, curl or tar, so the runtime carries almost no
#      OS-package CVEs. It runs as an unprivileged user (uid 65532).
#
# Because the runtime has no shell, JVM flags are passed via JAVA_TOOL_OPTIONS (the
# JVM reads it directly — there is no `sh -c` to word-split a JAVA_OPTS variable),
# and there is no Docker HEALTHCHECK (no curl/wget to run a probe). Probe
# /actuator/health from your orchestrator's liveness/readiness checks instead.
#
# For a JVM + AOT image (faster startup), see Dockerfile-aot.
# For a GraalVM native image, see Dockerfile-native.
# For a JVM image using CRaC, see Dockerfile-crac.
#
# Build and run:
#   docker build -t my-spring-app .
#   docker run --rm -e SPRING_BOOT_PORT=8080 -p 8080:8080 my-spring-app

# ---------------------------------------------------------------------------
# Build stage. A glibc JDK (Ubuntu "noble") is used so the frontend-maven-plugin's
# downloaded Node.js binaries (glibc-linked) run while building the bundled UI, and
# so the jlink runtime below is glibc-linked to match the distroless glibc base.
# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jdk-noble AS build

WORKDIR /app

# Dependency-caching layer: copy only the build descriptors first so `go-offline`
# is re-run only when pom.xml changes, not on every source edit.
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy the source.
COPY src ./src

# Copy frontend directory (full-stack projects with frontend-maven-plugin).
# Remove this line for a backend-only project that has no frontend/ directory.
COPY frontend ./frontend

# Build the application.
RUN ./mvnw clean package -DskipTests -B

# Explode the repackaged Spring Boot jar into its layers (dependencies,
# spring-boot-loader, snapshot-dependencies, application). They are copied
# separately into the runtime stage so the large dependency layer is reused from
# cache across rebuilds, and the app runs exploded via the JarLauncher.
RUN cp target/*.jar app.jar && \
    java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# ---------------------------------------------------------------------------
# Assemble a minimal custom Java runtime with jlink. The module set below is a
# deliberate superset for a typical Spring Boot data application (JDBC/JPA/
# Hibernate, JMX/Actuator, TLS/HTTPS, JFR, heap dumps). Several modules are loaded
# reflectively, so the set cannot be derived reliably with jdeps. Trim it if you
# know your app needs less; add modules if you hit a NoClassDefFoundError at runtime.
# ---------------------------------------------------------------------------
RUN "$JAVA_HOME/bin/jlink" \
      --add-modules java.base,java.logging,java.naming,java.management,java.management.rmi,java.instrument,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,java.desktop,java.security.jgss,java.security.sasl,java.scripting,java.compiler,java.net.http,java.rmi,java.prefs,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.jfr,jdk.management,jdk.management.agent,jdk.attach,jdk.zipfs,jdk.charsets,jdk.net,jdk.security.auth \
      --strip-debug --no-man-pages --no-header-files --compress=zip-6 \
      --output /javaruntime

# ---------------------------------------------------------------------------
# Runtime stage: Google "distroless" glibc base (no shell, package manager, curl
# or tar). The :nonroot tag runs as an unprivileged user (uid 65532).
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/base-debian12:nonroot

# Custom Java runtime assembled by jlink above.
ENV JAVA_HOME=/opt/java
ENV PATH="$JAVA_HOME/bin:$PATH"
COPY --from=build /javaruntime $JAVA_HOME

WORKDIR /app

# Copy the exploded application layers, ordered least- to most-frequently changing
# so Docker's layer cache is reused across rebuilds. COPY --chown sets ownership
# inline, avoiding a `RUN chown -R` layer (impossible here — the base has no shell).
COPY --from=build --chown=65532:65532 /app/extracted/dependencies/ ./
COPY --from=build --chown=65532:65532 /app/extracted/spring-boot-loader/ ./
COPY --from=build --chown=65532:65532 /app/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=65532:65532 /app/extracted/application/ ./

USER nonroot

# Container-aware JVM tuning, passed via JAVA_TOOL_OPTIONS (the distroless base has
# no shell to word-split a JAVA_OPTS variable; the JVM reads JAVA_TOOL_OPTIONS
# itself). MaxRAMPercentage lets the heap track the container memory limit; G1 with
# string deduplication and compact object headers (a product feature in JDK 25)
# keeps the footprint down; the JVM fails fast with a heap dump on OutOfMemoryError.
# Override the whole set at runtime with -e JAVA_TOOL_OPTIONS="...".
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+UseStringDeduplication -XX:+UseCompactObjectHeaders -XX:+ExitOnOutOfMemoryError -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"

EXPOSE 8080

# No Docker HEALTHCHECK: the distroless base has no shell, curl or wget to run a
# probe. Probe /actuator/health from your orchestrator's liveness/readiness checks.

# Launch the exploded application via the Spring Boot JarLauncher, in exec form so
# `java` is PID 1 and still receives SIGTERM from `docker stop` for graceful
# shutdown. An absolute path is used because there is no shell to resolve $PATH.
ENTRYPOINT ["/opt/java/bin/java", "org.springframework.boot.loader.launch.JarLauncher"]

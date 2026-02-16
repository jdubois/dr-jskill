# GraalVM Native Image Guide for Spring Boot Applications

## Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Docker-Based Native Builds (Recommended)](#docker-based-native-builds-recommended)
- [Spring Boot Configuration for Native Images](#spring-boot-configuration-for-native-images)
- [Testing Native Images](#testing-native-images)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)
- [CI/CD Integration](#cicd-integration)
- [References](#references)

## Overview
This guide covers building GraalVM native images for Spring Boot 4 applications using Docker multi-stage builds. Native images provide significantly faster startup times and lower memory footprint, making them ideal for microservices and serverless deployments.

**Key Benefits:**

1. **Instant Startup**: Native images start in milliseconds instead of seconds
2. **Low Memory**: Reduced memory footprint (typically 50-70% less than JVM)
3. **Optimized Performance**: Ahead-of-time compilation optimizes code at build time
4. **Improved Security**: Smaller attack surface with only required dependencies

## Prerequisites

1. Docker installed and running
2. Spring Boot 4 application with Maven
3. GraalVM 25+ (automatically handled in Dockerfile)
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
# Requires GraalVM 25+ for Spring Boot 4

# Build stage with GraalVM 25 (includes native-image toolchain)
FROM ghcr.io/graalvm/graalvm-community:25-ol9 AS build

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

# Build native image (full lifecycle: compile → process-aot → native compile)
RUN ./mvnw -Pnative package -DskipTests

# Move native executable to a known path (artifact name varies per project)
RUN find target -maxdepth 1 -type f ! -name '*.jar' ! -name '*.jar.original' -size +1M -print -quit \
    | xargs -I{} cp {} native-app && \
    test -f native-app || { echo "ERROR: Native executable not found in target/"; ls -la target/; exit 1; }

# Runtime stage with minimal base image
FROM oraclelinux:9-slim

# Install curl for healthchecks
RUN microdnf install -y curl && \
    microdnf clean all

# Create non-root user
RUN useradd -m -u 1001 springboot

# Set working directory
WORKDIR /app

# Copy the native executable from build stage
COPY --from=build /app/native-app native-app

# Change ownership
RUN chown -R springboot:springboot /app && \
    chmod +x native-app

# Switch to non-root user
USER springboot

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the native application
CMD ["./native-app"]
```

**Key Points:**

1. **Build Stage**: Uses GraalVM 25 Community Edition with Oracle Linux 9 (includes native-image toolchain)
2. **Full Lifecycle**: Uses `package` (not `native:compile`) to ensure `process-aot` runs correctly
3. **Portable Copy**: Uses `find` to locate the native binary by its executable flag, so the Dockerfile works regardless of artifact name
4. **Multi-Stage**: Final image is minimal (Oracle Linux 9 Slim + native executable)
5. **Non-Root User**: Runs as unprivileged user for security
6. **Healthcheck**: Standard Spring Boot Actuator health endpoint

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
  -e DATABASE_URL=jdbc:postgresql://postgres:5432/mydb \
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
    image: postgres:16-alpine
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
    <java.version>21</java.version>
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
./mvnw -Pnative package -DskipTests

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

### Validation Checklist

Before deploying native images, verify:

- [ ] Application starts in under 1 second
- [ ] All endpoints respond correctly
- [ ] Database connections work
- [ ] Health check endpoint returns 200 OK
- [ ] Docker image size is reasonable (< 200 MB)
- [ ] Memory usage is stable under load
- [ ] No reflection or resource loading errors in logs

## Advanced Topics

### Buildpacks Alternative

Spring Boot also supports Cloud Native Buildpacks for native images:

```bash
# Build with buildpacks (alternative to Dockerfile)
./mvnw spring-boot:build-image -Pnative

# Run the image
docker run -p 8080:8080 myapp:latest
```

**Note:** This guide focuses on Dockerfiles for consistency and control, but buildpacks are a valid alternative.

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

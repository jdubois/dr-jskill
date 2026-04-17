# Spring Boot 4 Migration Guide

## Contents
- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Critical Considerations When Creating Spring Boot 4 Projects](#critical-considerations-when-creating-spring-boot-4-projects)
- [Major Changes from Spring Boot 3](#major-changes-from-spring-boot-3)
- [Migration Strategy](#migration-strategy)
- [Best Practices for Spring Boot 4 Projects](#best-practices-for-spring-boot-4-projects)
- [Startup Banner (REQUIRED)](#startup-banner-required)
- [Performance](#performance)
- [Resources](#resources)

## Overview  

This guide covers the key changes in Spring Boot 4.0 and what to consider when creating new Spring Boot 4 projects.

**Release Date:** November 20, 2025 (4.0.0 GA)
**Major Version:** 4.0.x
**Based on:** Spring Framework 7.0, Jakarta EE 11

## System Requirements

> Scripts in this skill **prefer Spring Boot 4.x**. If start.spring.io still defaults to 3.x, they **fallback** to `springBootFallback` from `versions.json` with a warning. Override with `--boot-version`/`-BootVersion`.

### Minimum Requirements

1. Java: 17+ (Java 25 recommended for production)
2. Kotlin: 2.2+ (if using Kotlin)
3. GraalVM: 25+ (for native images)
4. Jakarta EE: 11 baseline (Servlet 6.1+)
5. Maven: 3.8+
6. Gradle: 8.14+ or 9.x

### Key Version Upgrades

1. Spring Framework 7.0
2. Spring Data 2025.1
3. Spring Security 7.0
4. Hibernate 7.1
5. TestContainers 2.0
6. Jackson 3.0
7. Tomcat 11.0
8. Jetty 12.1

## Critical Considerations When Creating Spring Boot 4 Projects

⚠️ **Most Common Mistakes** - Always verify these when generating code:

0. **Maven-only / No Lombok / Hibernate ddl-auto**: Do not generate Gradle builds; enforce no Lombok usage via Maven Enforcer + ArchUnit (snippet below). Use Hibernate ddl-auto for schema management (no Flyway, no Liquibase).

### 1. Jackson 3 Annotations Stay in `com.fasterxml.jackson.annotation`

**✅ CORRECT - Annotations do NOT change package:**
```java
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonFormat;
```

**❌ WRONG - Do NOT use `tools.jackson.annotation`:**
```java
import tools.jackson.annotation.JsonProperty;  // This package doesn't exist!
```

**Only Jackson API classes change to `tools.jackson`:**
```java
import tools.jackson.databind.ObjectMapper;  // ✅ Correct for API classes
```

See "Jackson 2 to Jackson 3 Migration" section below for complete details.

### 2. TestcontainersConfiguration Must Be Package-Private

**✅ CORRECT - Package-private (no `public` modifier):**
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {  // No public!
    // ...
}
```

**❌ WRONG - Public modifier:**
```java
public class TestcontainersConfiguration {  // Wrong!
    // ...
}
```

This is a Spring Boot 4 requirement for test configurations. See "Testing Changes" section below for more details.

### 3. TestContainers 2.x Artifact & Package Rename

**Maven artifact renamed:**
```xml
<!-- ❌ WRONG (TC 1.x artifact): -->
<artifactId>postgresql</artifactId>

<!-- ✅ CORRECT (TC 2.x artifact): -->
<artifactId>testcontainers-postgresql</artifactId>
```

**Class package renamed:**
```java
// ❌ WRONG (TC 1.x):
import org.testcontainers.containers.PostgreSQLContainer;

// ✅ CORRECT (TC 2.x):
import org.testcontainers.postgresql.PostgreSQLContainer;
```

The `junit-jupiter` artifact is no longer needed — TC 2.x integrates with JUnit 5 directly.

### 4. @WebMvcTest Moved to New Package

```java
// ❌ WRONG (Spring Boot 3):
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

// ✅ CORRECT (Spring Boot 4):
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
```

Requires `spring-boot-starter-webmvc-test` dependency (not included in `spring-boot-starter-test`).

### 5. Always Set `mainClass` in `pom.xml`

Spring Boot 4's `process-aot` goal (used for native images and AOT processing) may fail to auto-detect the main class.

**✅ CORRECT - Always add `start-class` property to `pom.xml`:**
```xml
<properties>
    <java.version>25</java.version>
    <!-- Use your actual main class: {CamelCaseArtifactId}Application -->
    <start-class>com.example.app.MyAppApplication</start-class>
</properties>
```

This ensures both `spring-boot-maven-plugin` and `native-maven-plugin` can find the entry point. Without it, Docker builds and native compilations will fail with:
```
Unable to find a suitable main class, please add a 'mainClass' property
```

---

## Major Changes from Spring Boot 3

### 1. Modular Architecture

Spring Boot 4 introduces a **new modular design** with technology-specific modules and starters.

**New Naming Convention:**
- Modules: `spring-boot-<technology>` (e.g., `spring-boot-graphql`)
- Root packages: `org.springframework.boot.<technology>`
- Starters: `spring-boot-starter-<technology>` (e.g., `spring-boot-starter-graphql`)
- Test starters: `spring-boot-starter-<technology>-test`

**Important:** Most technologies now have dedicated starters where they didn't before.

**For quick upgrades:** Use `spring-boot-starter-classic` to get all modules at once (but migrate away eventually).

### 2. Testing Changes

#### @WebMvcTest and @AutoConfigureMockMvc Package Change

**Critical:** Due to the modular architecture, `@WebMvcTest` and `@AutoConfigureMockMvc` moved to a new package and require a new test starter dependency.

**New dependency required:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Import change:**
```java
// OLD (Spring Boot 3):
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

// NEW (Spring Boot 4):
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
```

> ⚠️ `spring-boot-starter-test` alone no longer provides `@WebMvcTest`. You **must** add `spring-boot-starter-webmvc-test`.

#### @MockBean and @SpyBean Deprecation
**Critical:** `@MockBean` and `@SpyBean` are **deprecated** and will be removed in future releases.

**Migration:**
```java
// OLD (Deprecated):
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class MyTest {
    @MockBean
    private UserService userService;
}

// NEW (Spring Boot 4):
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class MyTest {
    @MockitoBean
    private UserService userService;
}
```

**For shared mocks across tests:**
```java
// Create custom annotation
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@MockitoBean(types = {UserService.class, OrderService.class})
public @interface SharedMocks {
}

// Use on test classes
@SpringBootTest
@SharedMocks
class ApplicationTests {
    // Clean and reusable
}
```

#### Test Starter Changes

1. `@SpringBootTest` no longer provides MockMVC automatically - add `@AutoConfigureMockMvc`
2. `@SpringBootTest` no longer provides `TestRestTemplate` - add `@AutoConfigureTestRestTemplate`
3. `@WebMvcTest` and `@AutoConfigureMockMvc` moved to `org.springframework.boot.webmvc.test.autoconfigure` package — requires `spring-boot-starter-webmvc-test` dependency
4. Consider using new `RestTestClient` instead of `TestRestTemplate`

#### TestContainers 2.0

1. Required version: TestContainers 2.0+
2. Enhanced performance and resource management
3. Works seamlessly with `@ServiceConnection` annotation
4. **Artifact rename:** `org.testcontainers:postgresql` → `org.testcontainers:testcontainers-postgresql`
5. **Package rename:** `org.testcontainers.containers.PostgreSQLContainer` → `org.testcontainers.postgresql.PostgreSQLContainer`
6. `junit-jupiter` artifact removed — TC 2.x integrates with JUnit 5 directly
7. **`PostgreSQLContainer` is no longer generic** — use `PostgreSQLContainer` (not `PostgreSQLContainer<?>`) and `new PostgreSQLContainer(...)` (not `new PostgreSQLContainer<>(...)`)

#### Maven Enforcer + ArchUnit guardrails (no Lombok, enforce Maven)

_Add this to `pom.xml` to enforce minimum Maven, Java, and block Lombok dependency:_
```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-enforcer-plugin</artifactId>
      <version>3.4.1</version>
      <executions>
        <execution>
          <id>enforce</id>
          <goals><goal>enforce</goal></goals>
          <configuration>
            <rules>
              <requireMavenVersion>
                <version>[3.8,)</version>
              </requireMavenVersion>
              <requireJavaVersion>
                <version>[21,)</version>
              </requireJavaVersion>
              <bannedDependencies>
                <excludes>
                  <exclude>org.projectlombok:lombok</exclude>
                </excludes>
              </bannedDependencies>
            </rules>
            <fail>true</fail>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

_Add an ArchUnit test to `src/test/java/.../architecture/NoLombokTest.java`:_
```java
package com.example.app.architecture;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition;

@AnalyzeClasses(packages = "com.example.app")
public class NoLombokTest {
  @ArchTest
  static final var noLombok = ArchRuleDefinition.noClasses()
    .should().accessClassesThat().haveNameMatching(".*lombok.*")
    .because("Lombok is not allowed; use records or explicit code");
}
```


### 3. Removed Features

#### Undertow Server
**Removed:** Spring Boot 4 requires Servlet 6.1, which Undertow doesn't support yet.
- Use **Tomcat 11** (default) or **Jetty 12** instead
- No migration path currently available

#### Other Removals

1. Embedded executable jar launch scripts
2. Pulsar Reactive support
3. Spring Session Hazelcast (now maintained by Hazelcast team)
4. Spring Session MongoDB (now maintained by MongoDB team)
5. Spock integration (waiting for Groovy 5 support)

### 4. Jackson 2 to Jackson 3 Migration

**Major change:** Jackson 3 uses new group IDs and package names.

**Group ID changes:**
```xml
<!-- Jackson 2 (old): -->
<groupId>com.fasterxml.jackson.core</groupId>

<!-- Jackson 3 (new): -->
<groupId>tools.jackson.core</groupId>
<!-- Exception: jackson-annotations still uses com.fasterxml.jackson.core -->
```

**Package changes:**
- `com.fasterxml.jackson` → `tools.jackson`
- **IMPORTANT Exception:** `com.fasterxml.jackson.annotation` remains unchanged

**Critical: Common Jackson annotations DO NOT change:**
```java
// These annotations stay the same - DO NOT change these imports:
import com.fasterxml.jackson.annotation.JsonProperty;      // ✅ Correct
import com.fasterxml.jackson.annotation.JsonIgnore;        // ✅ Correct
import com.fasterxml.jackson.annotation.JsonFormat;        // ✅ Correct
import com.fasterxml.jackson.annotation.JsonCreator;       // ✅ Correct
import com.fasterxml.jackson.annotation.JsonValue;         // ✅ Correct
import com.fasterxml.jackson.annotation.JsonInclude;       // ✅ Correct
import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // ✅ Correct

// WRONG - These packages don't exist:
import tools.jackson.annotation.JsonProperty;  // ❌ WRONG!
```

**What DOES change - Jackson API/core packages:**
```java
// OLD (Jackson 2):
import com.fasterxml.jackson.databind.ObjectMapper;       // ❌ Old
import com.fasterxml.jackson.core.JsonProcessingException; // ❌ Old
import com.fasterxml.jackson.databind.JsonNode;           // ❌ Old

// NEW (Jackson 3):
import tools.jackson.databind.ObjectMapper;               // ✅ New
import tools.jackson.core.JsonProcessingException;         // ✅ New
import tools.jackson.databind.JsonNode;                   // ✅ New
```

**Rule of thumb:**
- **Annotations** (`@JsonProperty`, `@JsonIgnore`, etc.) → Keep `com.fasterxml.jackson.annotation`
- **API classes** (`ObjectMapper`, `JsonNode`, etc.) → Change to `tools.jackson`

**Spring Boot API changes:**
- `JsonObjectSerializer` → `ObjectValueSerializer`
- `JsonValueDeserializer` → `ObjectValueDeserializer`
- `Jackson2ObjectMapperBuilderCustomizer` → `JsonMapperBuilderCustomizer`
- `@JsonComponent` → `@JacksonComponent`
- `@JsonMixin` → `@JacksonMixin`

**Property changes:**
```properties
# OLD:
spring.jackson.read.*
spring.jackson.write.*

# NEW:
spring.jackson.json.read.*
spring.jackson.json.write.*
```

**⚠️ Hibernate Bytecode Enhancer + Jackson 3 Gotcha:**

When using JPA entities with primitive fields (e.g., `boolean completed`), Jackson 3 will fail with:

```
JSON parse error: Cannot map `null` into type `boolean`
(set DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES to 'false' to allow)
```

This happens because Hibernate's bytecode enhancer generates a constructor that Jackson uses for "property-based" deserialization, bypassing field-level defaults and `@JsonSetter` annotations. When a JSON request omits a primitive field (e.g., `{"title":"Buy milk"}` without `"completed"`), Jackson maps it as `null` → `boolean`, which fails.

**Fix:** Add this to `application.properties`:

```properties
# Required: Hibernate bytecode enhancer + Jackson 3 causes constructor-based
# deserialization that fails when primitive fields are absent from JSON input.
spring.jackson.deserialization.fail-on-null-for-primitives=false
```

> **Note:** Field-level `@JsonSetter(nulls = Nulls.SKIP)` does NOT work here because Jackson uses the Hibernate-generated constructor, not field-by-field deserialization. The global property is required.

**Jackson 2 Compatibility:**
- Spring Boot 4 provides deprecated `spring-boot-jackson2` module for gradual migration
- Use `spring.jackson.use-jackson2-defaults=true` to align Jackson 3 behavior with Jackson 2
- Properties available under `spring.jackson2.*`

### 5. Web and REST Changes

#### HTTP Service Clients
New auto-configuration for HTTP Service Clients:
```java
@HttpExchange(url = "https://api.example.com")
public interface ApiService {
    @PostExchange
    Map<?, ?> call(@RequestBody Map<String, String> data);
}
```

#### API Versioning
Built-in API versioning support:
```properties
# MVC:
spring.mvc.apiversion.*

# WebFlux:
spring.webflux.apiversion.*
```

#### HttpMessageConverters Deprecation
`HttpMessageConverters` is deprecated. Use instead:
- `ClientHttpMessageConvertersCustomizer` for client converters
- `ServerHttpMessageConvertersCustomizer` for server converters

#### Static Resources
- Fonts added to common static locations: `/fonts/**`
- Use `PathRequest.toStaticResources().atCommonLocations().excluding(StaticResourceLocation.FONTS)` to exclude

### 6. Data Access Changes

#### Elasticsearch Client
- Low-level `RestClient` replaced with `Rest5Client`
- `RestClientBuilderCustomizer` → `Rest5ClientBuilderCustomizer`
- Consolidated in `co.elastic.clients:elasticsearch-java` module

#### MongoDB
Property renaming to reflect Spring Data MongoDB requirement:
```properties
# Properties moved from spring.data.mongodb to spring.mongodb:
spring.mongodb.host
spring.mongodb.port
spring.mongodb.database
spring.mongodb.uri
spring.mongodb.username
spring.mongodb.password
spring.mongodb.authentication-database
spring.mongodb.representation.uuid
```

**New requirement:** Explicit UUID and BigDecimal representation configuration:
```properties
spring.mongodb.representation.uuid=STANDARD
spring.data.mongodb.representation.big-decimal=DECIMAL128
```

#### Hibernate
- Hibernate 7.1 required
- `hibernate-jpamodelgen` renamed to `hibernate-processor`
- `hibernate-proxool` and `hibernate-vibur` no longer published

#### Persistence Properties
```properties
# OLD:
spring.dao.exceptiontranslation.enabled

# NEW:
spring.persistence.exceptiontranslation.enabled
```

### 7. Messaging Changes

#### Kafka Streams
- `StreamBuilderFactoryBeanCustomizer` removed
- Use Spring Kafka's `StreamsBuilderFactoryBeanConfigurer` instead

#### Spring Retry Migration
Spring Kafka and Spring AMQP moved from Spring Retry to Spring Framework's core retry:

**Kafka:**
```properties
# OLD:
spring.kafka.retry.topic.backoff.random

# NEW (more flexible):
spring.kafka.retry.topic.backoff.jitter
```

**AMQP:**
- `RabbitRetryTemplateCustomizer` split into:
  - `RabbitTemplateRetrySettingsCustomizer`
  - `RabbitListenerRetrySettingsCustomizer`

### 8. Spring Batch

**Major change:** Spring Batch can now operate **without a database** (in-memory mode).

- Regular `spring-boot-starter-batch` uses simplified in-memory mode
- **To use database:** Switch to `spring-boot-starter-batch-jdbc`

### 9. New Features

#### OpenTelemetry Starter
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-opentelemetry</artifactId>
</dependency>
```
Auto-configures OpenTelemetry SDK for metrics and traces over OTLP.

#### Kotlin Serialization
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-kotlinx-serialization</artifactId>
</dependency>
```
Provides `Json` bean and HTTP message converter support.

#### RestTestClient
New testing support for `RestTestClient`:
- Works with `MockMvc` in `@SpringBootTest`
- Works with running server for integration tests
- Consider replacing `TestRestTemplate` usage

### 10. Configuration Changes

#### Nullability Annotations
- Spring Boot 4 adds **JSpecify nullability annotations**
- May cause compilation failures with null checkers or Kotlin
- Migrate from `org.springframework.lang` to JSpecify annotations

#### DevTools
- Live reload **disabled by default**
- Enable with: `spring.devtools.livereload.enabled=true`

#### Logging
- Console logging can be disabled: `logging.console.enabled=false`
- Default charset harmonized with Log4j2: UTF-8 for files, console charset for console

#### Property Renaming
```properties
# Tracing:
management.tracing.enabled → management.tracing.export.enabled

# Spring Session:
spring.session.redis.* → spring.session.data.redis.*
spring.session.mongodb.* → spring.session.data.mongodb.*

# MongoDB metrics:
management.metrics.mongo.* → management.metrics.mongodb.*
```

### 11. Build and Deployment Changes

#### Maven
- Optional dependencies no longer in uber jars by default
- Use `<includeOptional>true</includeOptional>` if needed

#### Gradle  
- Gradle 9 now supported (8.14+ also works)
- Minimum CycloneDX plugin version: 3.0.0

#### AOP Starter
- `spring-boot-starter-aop` renamed to `spring-boot-starter-aspectj`
- Only add if you actually use AspectJ (`@Aspect` annotations)

#### OAuth2 / Security Starters
- `spring-boot-starter-oauth2-resource-server` renamed to `spring-boot-starter-security-oauth2-resource-server`
- `spring-boot-starter-oauth2-client` renamed to `spring-boot-starter-security-oauth2-client`
- `spring-boot-starter-oauth2-authorization-server` renamed to `spring-boot-starter-security-oauth2-authorization-server`

#### Classic Loader
Classic uber-jar loader removed:
```xml
<!-- Remove this from pom.xml: -->
<loaderImplementation>CLASSIC</loaderImplementation>
```

#### Tomcat WAR Deployment
For war deployment to Tomcat:
```xml
<!-- Change from: -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-tomcat</artifactId>
</dependency>

<!-- To: -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-tomcat-runtime</artifactId>
</dependency>
```

### 12. Actuator Changes

#### Health Probes
- Liveness and readiness probes **enabled by default**
- Health endpoint now exposes `liveness` and `readiness` groups
- Disable with: `management.endpoint.health.probes.enabled=false`

#### SSL Health
- Status `WILL_EXPIRE_SOON` removed
- Expiring certificates will have status `VALID`
- Expiring chains listed in new `expiringChains` entry

## Migration Strategy

### For New Projects
1. ✅ Start with Spring Boot 4.0.x directly
2. ✅ Use Java 25+ for modern features
3. ✅ Use `@MockitoBean` from the start (not `@MockBean`)
4. ✅ Use technology-specific starters (not classic)
5. ✅ Plan for Jackson 3 API usage
6. ✅ Use TestContainers 2.0+

### For Existing Projects (Spring Boot 3 → 4)
1. Upgrade to latest Spring Boot 3.5.x first
2. Fix all deprecation warnings
3. Review dependency versions (especially Spring Cloud)
4. Use classic starters temporarily: `spring-boot-starter-classic` and `spring-boot-starter-test-classic`
5. Update imports for moved packages (e.g., `BootstrapRegistry`, `EnvironmentPostProcessor`)
6. Migrate `@MockBean` to `@MockitoBean`
7. Test thoroughly, then migrate away from classic starters

### Quick Migration Checklist

- [ ] Java 17+ (25 recommended)
- [ ] `<start-class>` property set in `pom.xml` (required for `process-aot`)
- [ ] Jakarta EE 11 / Servlet 6.1 dependencies updated
- [ ] Replace `@MockBean` with `@MockitoBean` in tests
- [ ] Update `@WebMvcTest`/`@AutoConfigureMockMvc` imports to `org.springframework.boot.webmvc.test.autoconfigure` and add `spring-boot-starter-webmvc-test` dependency
- [ ] Add `@AutoConfigureMockMvc` where needed
- [ ] TestContainers 2.0+ in use (`testcontainers-postgresql` artifact, `org.testcontainers.postgresql` package)
- [ ] No Undertow references
- [ ] Jackson 3 package names (or using compatibility mode)
- [ ] Technology-specific starters added where needed
- [ ] OAuth2 starters renamed: `spring-boot-starter-oauth2-*` → `spring-boot-starter-security-oauth2-*`
- [ ] MongoDB properties renamed if applicable
- [ ] Spring Batch database starter if needed
- [ ] Elasticsearch client updated to Rest5Client
- [ ] Property names updated (tracing, session, persistence)

## Best Practices for Spring Boot 4 Projects

1. **Use Java 25+** for modern features and native image support
2. **Modular starters** - Use technology-specific starters, not classic
3. **@MockitoBean** - Adopt from the start, avoid deprecated `@MockBean`
4. **TestContainers 2.0** - Use `@ServiceConnection` for simplified testing
5. **Jackson 3** - Plan API usage with new package names
6. **Virtual threads** - Consider enabling for IO-bound workloads (see [Performance](#performance))
7. **OpenTelemetry** - Use new starter for observability
8. **Health probes** - Leverage default liveness/readiness endpoints
9. **Startup banner** - Always ship a `StartupInfoListener` that prints access URLs — see [Startup Banner](#startup-banner-required)

## Startup Banner (REQUIRED)

> ⚠️ Non-default ports, running alongside other projects, or forgetting which profile is active are everyday sources of confusion ("I opened `localhost:8080` but nothing works"). Every generated project **must** print a clear banner at startup that tells the developer exactly where the app is reachable.

> ✅ The `create-*-project.mjs` scripts now scaffold this file automatically into `<root-package>/config/StartupInfoListener.java` (template: `assets/StartupInfoListener.java.tmpl`). The reference below is kept for manual setups, custom packages, or customization.

Create `src/main/java/<root-package>/config/StartupInfoListener.java`. Adjust the `package` line to match the project's root package:

```java
package com.example.app.config;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ansi.AnsiColor;
import org.springframework.boot.ansi.AnsiOutput;
import org.springframework.boot.ansi.AnsiStyle;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Prints a friendly banner at startup showing the URLs where the
 * application (and, if present, the Vite dev server) can be reached.
 */
@Component
public class StartupInfoListener implements ApplicationListener<ApplicationReadyEvent> {

    private static final Logger log = LoggerFactory.getLogger(StartupInfoListener.class);

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        Environment env = event.getApplicationContext().getEnvironment();

        String protocol = "true".equalsIgnoreCase(env.getProperty("server.ssl.enabled")) ? "https" : "http";
        String serverPort = env.getProperty("server.port", "8080");
        String contextPath = env.getProperty("server.servlet.context-path", "/");
        if (!contextPath.endsWith("/")) {
            contextPath = contextPath + "/";
        }

        String hostAddress = "localhost";
        try {
            hostAddress = InetAddress.getLocalHost().getHostAddress();
        } catch (UnknownHostException e) {
            log.warn("Could not determine host address, defaulting to 'localhost'");
        }

        String appName = env.getProperty("spring.application.name", "Application");
        String profiles = env.getActiveProfiles().length == 0
                ? String.join(", ", env.getDefaultProfiles())
                : String.join(", ", env.getActiveProfiles());

        String viteHint = viteDevServerHint();

        String banner = AnsiOutput.toString(
                "\n",
                AnsiColor.GREEN, "----------------------------------------------------------\n",
                AnsiColor.GREEN, "  ", AnsiStyle.BOLD, appName, AnsiStyle.NORMAL,
                AnsiColor.GREEN, " is running! Access URLs:\n",
                AnsiColor.GREEN, "  Local:       ", AnsiColor.DEFAULT,
                protocol, "://localhost:", serverPort, contextPath, "\n",
                AnsiColor.GREEN, "  External:    ", AnsiColor.DEFAULT,
                protocol, "://", hostAddress, ":", serverPort, contextPath, "\n",
                AnsiColor.GREEN, "  API:         ", AnsiColor.DEFAULT,
                protocol, "://localhost:", serverPort, "/api\n",
                AnsiColor.GREEN, "  Actuator:    ", AnsiColor.DEFAULT,
                protocol, "://localhost:", serverPort, "/actuator\n",
                AnsiColor.GREEN, "  Profile(s):  ", AnsiColor.DEFAULT, profiles, "\n",
                viteHint,
                AnsiColor.GREEN, "----------------------------------------------------------",
                AnsiColor.DEFAULT);

        log.info(banner);
    }

    /** If a {@code frontend/} folder exists next to the process, hint at the Vite dev URL. */
    private String viteDevServerHint() {
        Path frontend = Paths.get(System.getProperty("user.dir"), "frontend");
        if (!Files.isDirectory(frontend)) {
            return "";
        }
        int vitePort = readVitePort(frontend).orElse(5173);
        return AnsiOutput.toString(
                AnsiColor.GREEN, "  Front-end:   ", AnsiColor.DEFAULT,
                "http://localhost:", String.valueOf(vitePort),
                "  ", AnsiStyle.FAINT, "(run 'npm run dev' in frontend/ for hot-reload)",
                AnsiStyle.NORMAL, "\n");
    }

    private Optional<Integer> readVitePort(Path frontendDir) {
        try {
            Path cfg = frontendDir.resolve("vite.config.js");
            if (!Files.isRegularFile(cfg)) {
                cfg = frontendDir.resolve("vite.config.ts");
            }
            if (!Files.isRegularFile(cfg)) {
                return Optional.empty();
            }
            String body = Files.readString(cfg);
            return Arrays.stream(body.split("\n"))
                    .map(String::trim)
                    .filter(line -> line.startsWith("port:"))
                    .findFirst()
                    .map(line -> line.replaceAll("[^0-9]", ""))
                    .filter(digits -> !digits.isEmpty())
                    .map(Integer::parseInt);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
```

### What it prints

In a terminal with ANSI support, the output looks like:

```
----------------------------------------------------------
  todoapp is running! Access URLs:
  Local:       http://localhost:8080/
  External:    http://192.168.1.42:8080/
  API:         http://localhost:8080/api
  Actuator:    http://localhost:8080/actuator
  Profile(s):  default
  Front-end:   http://localhost:5173  (run 'npm run dev' in frontend/ for hot-reload)
----------------------------------------------------------
```

### Design notes

- **Triggered on `ApplicationReadyEvent`** — fires after Tomcat has bound its port, so what's printed is the real port (including `server.port=0` random-port mode).
- **HTTPS-aware** — flips the protocol when `server.ssl.enabled=true`.
- **Context-path aware** — respects a non-root `server.servlet.context-path`.
- **`Front-end:` line is conditional** — only printed when a `frontend/` folder exists next to the process, so standalone backends don't get a misleading line. The listener tries to read a `port:` from `vite.config.{js,ts}` and falls back to Vite's default (5173).
- **No new dependencies** — uses only Spring Boot classes (`AnsiOutput`, `ApplicationReadyEvent`) already on the classpath.

### Reminders for the agent

- Do **not** log the banner as `System.out.println` — keep it on the SLF4J logger so it respects the configured log format and is captured by file appenders.
- Do **not** swallow the `frontend/` check behind a profile; developers running tests with `@SpringBootTest` also benefit from the banner when an embedded server boots.
- When adding tests, don't assert on the banner output — it's informational and ANSI escape codes make test assertions brittle.

## Performance

Apply these *after* profiling. Measure with `spring-boot-starter-actuator` + Micrometer (`/actuator/metrics`, `/actuator/prometheus`).

### Virtual threads (JDK 21+, on by default on JDK 25)

IO-bound controllers, `@Async`, and `@Scheduled` tasks benefit the most.

```properties
spring.threads.virtual.enabled=true
```

When enabled, do **not** also raise `server.tomcat.threads.max` — the platform thread pool becomes irrelevant for request handling. Avoid `synchronized` on hot paths that call blocking IO; prefer `java.util.concurrent.locks` so carrier threads aren't pinned.

### HTTP response compression

```properties
server.compression.enabled=true
server.compression.mime-types=application/json,application/xml,text/html,text/css,text/plain,application/javascript
server.compression.min-response-size=1KB
```

If a reverse proxy (nginx, CloudFront, Azure Front Door, etc.) already compresses, leave this off to avoid double work.

### HTTP/2

```properties
server.http2.enabled=true
```

Requires TLS in production. Biggest win for pages that fetch many small assets in parallel.

### Tomcat tuning (platform threads only)

Only relevant when **virtual threads are disabled**:

```properties
server.tomcat.threads.max=200
server.tomcat.threads.min-spare=20
server.tomcat.accept-count=100
server.tomcat.max-connections=10000
```

### Static resource caching

Vite emits hashed filenames for `/assets/**`, so they're safe to cache aggressively:

```properties
spring.web.resources.cache.cachecontrol.max-age=365d
spring.web.resources.cache.cachecontrol.immutable=true
```

Keep `index.html` uncached (the default) so clients pick up new asset hashes.

### Observability for performance work

Enable in `application.properties` when diagnosing:

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.metrics.distribution.percentiles-histogram.http.server.requests=true
```

See `references/LOGGING.md` for structured logging setup and `references/DATABASE.md` for Hibernate-specific tuning.

## Resources

- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Framework 7.0 Release Notes](https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes)
- [Spring Security 7.0 Migration Guide](https://docs.spring.io/spring-security/reference/7.0/migration/)
- [Spring Data 2025.1 Release Notes](https://github.com/spring-projects/spring-data-commons/wiki/Spring-Data-2025.1-Release-Notes)

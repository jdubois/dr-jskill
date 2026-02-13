# Spring Boot 4 Migration Guide

## Overview  

This guide covers the key changes in Spring Boot 4.0 and what to consider when creating new Spring Boot 4 projects.

**Release Date:** November 21, 2024  
**Major Version:** 4.0.x  
**Based on:** Spring Framework 7.0, Jakarta EE 11

## System Requirements

### Minimum Requirements
- **Java:** 17+ (Java 21+ LTS recommended for production)
- **Kotlin:** 2.2+ (if using Kotlin)
- **GraalVM:** 25+ (for native images)
- **Jakarta EE:** 11 baseline (Servlet 6.1+)
- **Maven:** 3.8+
- **Gradle:** 8.14+ or 9.x

### Key Version Upgrades
- Spring Framework 7.0
- Spring Data 2025.1
- Spring Security 7.0
- Hibernate 7.1
- TestContainers 2.0
- Jackson 3.0
- Tomcat 11.0
- Jetty 12.1

## Major Changes from Spring Boot 3

### 1. Modular Architecture

Spring Boot 4 introduces a **new modular design** with technology-specific modules and starters.

**New Naming Convention:**
- Modules: `spring-boot-<technology>` (e.g., `spring-boot-graphql`)
- Root packages: `org.springframework.boot.<technology>`
- Starters: `spring-boot-starter-<technology>` (e.g., `spring-boot-starter-graphql`)
- Test starters: `spring-boot-starter-<technology>-test`

**Important:** Most technologies now have dedicated starters where they didn't before. For example:
- Flyway: Use `spring-boot-starter-flyway` instead of direct `flyway-core`
- Liquibase: Use `spring-boot-starter-liquibase` instead of direct `liquibase-core`

**For quick upgrades:** Use `spring-boot-starter-classic` to get all modules at once (but migrate away eventually).

### 2. Testing Changes

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
- `@SpringBootTest` no longer provides MockMVC automatically - add `@AutoConfigureMockMvc`
- `@SpringBootTest` no longer provides `TestRestTemplate` - add `@AutoConfigureTestRestTemplate`
- Consider using new `RestTestClient` instead of `TestRestTemplate`

#### TestContainers 2.0
- **Required version:** TestContainers 2.0+
- Enhanced performance and resource management
- Works seamlessly with `@ServiceConnection` annotation

### 3. Removed Features

#### Undertow Server
**Removed:** Spring Boot 4 requires Servlet 6.1, which Undertow doesn't support yet.
- Use **Tomcat 11** (default) or **Jetty 12** instead
- No migration path currently available

#### Other Removals
- Embedded executable jar launch scripts
- Pulsar Reactive support
- Spring Session Hazelcast (now maintained by Hazelcast team)
- Spring Session MongoDB (now maintained by MongoDB team)
- Spock integration (waiting for Groovy 5 support)

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
2. ✅ Use Java 21+ for LTS support
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

- [ ] Java 17+ (21+ recommended)
- [ ] Jakarta EE 11 / Servlet 6.1 dependencies updated
- [ ] Replace `@MockBean` with `@MockitoBean` in tests
- [ ] Add `@AutoConfigureMockMvc` where needed
- [ ] TestContainers 2.0+ in use
- [ ] No Undertow references
- [ ] Jackson 3 package names (or using compatibility mode)
- [ ] Technology-specific starters added (e.g., Flyway, Liquibase)
- [ ] MongoDB properties renamed if applicable
- [ ] Spring Batch database starter if needed
- [ ] Elasticsearch client updated to Rest5Client
- [ ] Property names updated (tracing, session, persistence)

## Best Practices for Spring Boot 4 Projects

1. **Use Java 21+** for long-term support and modern features
2. **Modular starters** - Use technology-specific starters, not classic
3. **@MockitoBean** - Adopt from the start, avoid deprecated `@MockBean`
4. **TestContainers 2.0** - Use `@ServiceConnection` for simplified testing
5. **Jackson 3** - Plan API usage with new package names
6. **Virtual threads** - Consider enabling for HTTP clients: `spring.threads.virtual.enabled=true`
7. **OpenTelemetry** - Use new starter for observability
8. **Health probes** - Leverage default liveness/readiness endpoints

## Resources

- [Spring Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Framework 7.0 Release Notes](https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes)
- [Spring Security 7.0 Migration Guide](https://docs.spring.io/spring-security/reference/7.0/migration/)
- [Spring Data 2025.1 Release Notes](https://github.com/spring-projects/spring-data-commons/wiki/Spring-Data-2025.1-Release-Notes)

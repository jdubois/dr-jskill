# Configuration Best Practices for Spring Boot Applications

## Overview
This guide covers configuration best practices for Spring Boot 4 applications, including profiles, externalized configuration, secrets management, and environment-specific settings.

**Key Principles:**

1. **Use Properties Files** (not YAML) for better tooling support and readability
2. **Externalize Configuration** for portability across environments
3. **Never Commit Secrets** to version control
4. **Use Profiles** for environment-specific settings
5. **Leverage Spring Boot's Configuration Hierarchy** for flexibility

## Configuration File Format

### Properties Files (Recommended)

Spring Boot supports both `.properties` and `.yaml` files. **We recommend properties files** for:

- Better IDE autocomplete support
- Simpler syntax and less indentation errors
- Easier to search and grep
- Better Git diff visualization

**Example: `application.properties`**

```properties
# Server Configuration
server.port=8080
server.compression.enabled=true
server.compression.mime-types=text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json

# Application Information
spring.application.name=my-spring-boot-app
spring.application.version=@project.version@

# Logging Configuration
logging.level.root=INFO
logging.level.com.example.myapp=DEBUG
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %logger{36} - %msg%n

# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=user
spring.datasource.password=password
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5

# JPA Configuration
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.open-in-view=false

# Actuator Configuration
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
management.metrics.export.prometheus.enabled=true
```

### Maven Property Substitution

Reference Maven project properties in your configuration:

```properties
spring.application.version=@project.version@
spring.application.name=@project.artifactId@
```

Configure Maven to filter resources in `pom.xml`:

```xml
<build>
    <resources>
        <resource>
            <directory>src/main/resources</directory>
            <filtering>true</filtering>
        </resource>
    </resources>
</build>
```

## Configuration Profiles

### Profile-Specific Properties

Create separate property files for each environment:

```
src/main/resources/
├── application.properties          # Default configuration
├── application-dev.properties      # Development overrides
├── application-test.properties     # Test overrides
└── application-prod.properties     # Production overrides
```

**Example: `application-dev.properties`**

```properties
# Development-specific settings
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
logging.level.com.example.myapp=DEBUG

# Use local PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb_dev
```

**Example: `application-prod.properties`**

```properties
# Production-specific settings
spring.jpa.show-sql=false
spring.jpa.hibernate.ddl-auto=validate
logging.level.com.example.myapp=INFO

# Use environment variables for sensitive data
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}
```

### Activating Profiles

**Via Command Line:**

```bash
# Single profile
java -jar app.jar --spring.profiles.active=prod

# Multiple profiles (comma-separated)
java -jar app.jar --spring.profiles.active=prod,monitoring
```

**Via Environment Variable:**

```bash
export SPRING_PROFILES_ACTIVE=prod
java -jar app.jar
```

**Via Docker:**

```bash
docker run -e SPRING_PROFILES_ACTIVE=prod -p 8080:8080 myapp:latest
```

**Via application.properties (not recommended for production):**

```properties
spring.profiles.active=dev
```

### Profile-Specific Beans

Use `@Profile` annotation to conditionally register beans:

```java
@Configuration
public class CacheConfiguration {

    @Bean
    @Profile("dev")
    public CacheManager simpleCacheManager() {
        return new ConcurrentMapCacheManager();
    }

    @Bean
    @Profile("prod")
    public CacheManager redisCacheManager(RedisConnectionFactory factory) {
        return RedisCacheManager.builder(factory).build();
    }
}
```

## Externalized Configuration

### Configuration Hierarchy

Spring Boot loads configuration in the following order (later sources override earlier):

1. Default properties (SpringApplication.setDefaultProperties)
2. `@PropertySource` annotations
3. Config data files (`application.properties`)
4. Profile-specific config files (`application-{profile}.properties`)
5. OS environment variables
6. Java System properties
7. Command line arguments

### Environment Variables

**Always use environment variables for sensitive data in production:**

```properties
# application-prod.properties
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

# Custom application properties
app.api.key=${API_KEY}
app.api.secret=${API_SECRET}
```

**Convention:** Environment variables use UPPERCASE with underscores:

```bash
# application.properties: server.port
export SERVER_PORT=8080

# application.properties: spring.datasource.url
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mydb
```

### Docker and Environment Variables

**docker-compose.yml:**

```yaml
services:
  app:
    image: myapp:latest
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DATABASE_URL: jdbc:postgresql://postgres:5432/mydb
      DATABASE_USERNAME: user
      DATABASE_PASSWORD: ${DB_PASSWORD}  # From .env file
    env_file:
      - .env  # Load additional variables from file
```

**.env file (never commit to Git):**

```bash
DB_PASSWORD=secret-password
API_KEY=your-api-key
API_SECRET=your-api-secret
```

## Configuration Properties Classes

### Type-Safe Configuration

Create strongly-typed configuration classes instead of using `@Value`:

```java
@ConfigurationProperties(prefix = "app")
public class ApplicationProperties {

    private String name;
    private ApiConfig api = new ApiConfig();
    private SecurityConfig security = new SecurityConfig();

    // Getters and setters

    public static class ApiConfig {
        private String url;
        private int timeout = 30;
        private int retryAttempts = 3;

        // Getters and setters
    }

    public static class SecurityConfig {
        private boolean enabled = true;
        private String jwtSecret;
        private long jwtExpiration = 86400;

        // Getters and setters
    }
}
```

**Enable configuration properties:**

```java
@SpringBootApplication
@EnableConfigurationProperties(ApplicationProperties.class)
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**Use in your code:**

```java
@RestController
public class ApiController {

    private final ApplicationProperties properties;

    public ApiController(ApplicationProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/api/info")
    public Map<String, Object> getInfo() {
        return Map.of(
            "name", properties.getName(),
            "apiUrl", properties.getApi().getUrl(),
            "securityEnabled", properties.getSecurity().isEnabled()
        );
    }
}
```

**Configuration in application.properties:**

```properties
app.name=My Application
app.api.url=https://api.example.com
app.api.timeout=30
app.api.retry-attempts=3
app.security.enabled=true
app.security.jwt-secret=${JWT_SECRET}
app.security.jwt-expiration=86400
```

### Validation

Add validation to configuration properties:

```java
@ConfigurationProperties(prefix = "app")
@Validated
public class ApplicationProperties {

    @NotBlank
    private String name;

    @Valid
    private ApiConfig api = new ApiConfig();

    public static class ApiConfig {
        @NotBlank
        @URL
        private String url;

        @Min(1)
        @Max(300)
        private int timeout = 30;

        // Getters and setters
    }

    // Getters and setters
}
```

Add validation dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

## Secrets Management

### Never Commit Secrets

**❌ NEVER do this:**

```properties
# application.properties - WRONG!
spring.datasource.password=mysecretpassword
app.api.key=abc123xyz
```

**✅ DO this instead:**

```properties
# application.properties - CORRECT!
spring.datasource.password=${DATABASE_PASSWORD}
app.api.key=${API_KEY}
```

### Local Development

For local development, use one of these approaches:

**Option 1: Environment Variables**

```bash
# .bashrc or .zshrc
export DATABASE_PASSWORD=devpassword
export API_KEY=dev-api-key
```

**Option 2: IDE Run Configuration**

Set environment variables in your IDE's run configuration (IntelliJ IDEA, VS Code, Eclipse).

**Option 3: application-local.properties (gitignored)**

```properties
# application-local.properties
spring.datasource.password=devpassword
app.api.key=dev-api-key
```

Add to `.gitignore`:

```
application-local.properties
.env
*.local.properties
```

### Production Secrets Management

**Container Environments:**

```bash
# Kubernetes Secrets
kubectl create secret generic app-secrets \
  --from-literal=database-password=prod-password \
  --from-literal=api-key=prod-api-key

# Azure Key Vault
# AWS Secrets Manager
# Google Cloud Secret Manager
```

**Spring Boot with Azure Key Vault:**

```xml
<dependency>
    <groupId>com.azure.spring</groupId>
    <artifactId>spring-cloud-azure-starter-keyvault</artifactId>
</dependency>
```

```properties
spring.cloud.azure.keyvault.secret.endpoint=https://my-vault.vault.azure.net/
spring.cloud.azure.keyvault.secret.credential.managed-identity-enabled=true
```

## Common Configuration Patterns

### Database Connection Pool

```properties
# HikariCP (default in Spring Boot)
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.pool-name=MyAppHikariPool
```

### Logging

```properties
# Root level
logging.level.root=INFO

# Package level
logging.level.com.example.myapp=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Console pattern
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %logger{36} - %msg%n

# File logging
logging.file.name=logs/application.log
logging.file.max-size=10MB
logging.file.max-history=30
```

### Actuator Endpoints

```properties
# Expose endpoints
management.endpoints.web.exposure.include=health,info,metrics,prometheus

# Health check details
management.endpoint.health.show-details=when-authorized
management.endpoint.health.probes.enabled=true

# Metrics
management.metrics.export.prometheus.enabled=true
management.metrics.tags.application=${spring.application.name}
management.metrics.tags.environment=${spring.profiles.active}
```

### Server Configuration

```properties
# Port
server.port=8080

# Context path (if needed)
# server.servlet.context-path=/api

# Compression
server.compression.enabled=true
server.compression.mime-types=text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json

# Graceful shutdown
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s

# Thread pool
server.tomcat.threads.max=200
server.tomcat.threads.min-spare=10
```

### Jackson JSON Configuration

```properties
# Pretty print (dev only)
spring.jackson.serialization.indent-output=false

# Date format
spring.jackson.date-format=yyyy-MM-dd'T'HH:mm:ss.SSSZ
spring.jackson.time-zone=UTC

# Include non-null fields only
spring.jackson.default-property-inclusion=non_null

# Fail on unknown properties (strict mode)
spring.jackson.deserialization.fail-on-unknown-properties=true
```

### CORS Configuration

```properties
# Global CORS
spring.web.cors.allowed-origins=https://example.com
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true
spring.web.cors.max-age=3600
```

Or use Java configuration for more control:

```java
@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("https://example.com")
                    .allowedMethods("GET", "POST", "PUT", "DELETE")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
```

## Testing Configuration

### Test Properties

Create `application-test.properties` for integration tests:

```properties
# Use H2 for fast tests
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driver-class-name=org.h2.Driver

# Or use TestContainers with PostgreSQL (recommended)
# Configuration is automatic with @TestContainers

# Disable Docker Compose support in tests
spring.docker.compose.enabled=false

# Logging
logging.level.com.example.myapp=DEBUG
```

### Test Configuration Classes

```java
@TestConfiguration
public class TestConfig {

    @Bean
    @Primary
    public DataSource testDataSource() {
        // Custom test datasource configuration
        return DataSourceBuilder.create()
            .url("jdbc:h2:mem:testdb")
            .build();
    }
}
```

### Property Overrides in Tests

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class MyIntegrationTest {
    // Test methods
}
```

## Configuration Documentation

### Documenting Custom Properties

Use `spring-boot-configuration-processor` to generate metadata:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>
</dependency>
```

Add JavaDoc to configuration classes:

```java
@ConfigurationProperties(prefix = "app")
public class ApplicationProperties {

    /**
     * The name of the application.
     */
    private String name;

    /**
     * API configuration.
     */
    private ApiConfig api = new ApiConfig();

    public static class ApiConfig {
        /**
         * The base URL of the API.
         */
        private String url;

        /**
         * Timeout in seconds for API calls.
         */
        private int timeout = 30;

        // Getters and setters
    }

    // Getters and setters
}
```

This generates `spring-configuration-metadata.json` for IDE autocomplete.

## Best Practices Checklist

- [ ] Use `.properties` files instead of YAML
- [ ] Create profile-specific configuration files
- [ ] Use `@ConfigurationProperties` for type-safe configuration
- [ ] Never commit secrets to version control
- [ ] Use environment variables for sensitive data in production
- [ ] Add validation to configuration properties
- [ ] Document custom properties with JavaDoc
- [ ] Use meaningful default values
- [ ] Test configuration with different profiles
- [ ] Use Maven property substitution for build-time values
- [ ] Enable configuration metadata processor for IDE support

## References

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [Configuration Properties](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config.typesafe-configuration-properties)
- [Profiles](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.profiles)
- [Configuration Metadata](https://docs.spring.io/spring-boot/docs/current/reference/html/configuration-metadata.html)

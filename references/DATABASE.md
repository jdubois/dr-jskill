# Database Best Practices (PostgreSQL)

## Contents
- [Defaults](#defaults)
- [Spring Boot Configuration](#spring-boot-configuration)
- [Hibernate DDL Auto Modes](#hibernate-ddl-auto-modes)
- [Testcontainers Integration](#testcontainers-integration)
- [Docker Compose (Dev)](#docker-compose-dev)
- [Production Tips](#production-tips)
- [Local Developer Experience](#local-developer-experience)
- [Observability](#observability)
- [Validation / Checks](#validation--checks)
- [Troubleshooting](#troubleshooting)
- [References](#references)

## Defaults
- **Engine:** PostgreSQL (preferred version: **16**; configure in `versions.json`).
- **Schema management:** ✅ **Hibernate ddl-auto** — schema derived from `@Entity` classes. Do not offer Flyway or Liquibase.
- **Driver:** `org.postgresql:postgresql` (bundled via start.spring.io dependency).
- **Testcontainers:** Use `postgres:16-alpine` images.

## Spring Boot Configuration

`src/main/resources/application.properties`:
```properties
# Datasource
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=user
spring.datasource.password=${DATABASE_PASSWORD:password}
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=false
spring.jpa.open-in-view=false
```

## Hibernate DDL Auto Modes

Hibernate generates the database schema automatically from your `@Entity` classes. No SQL migration files needed.

| Mode | Behavior | Use when |
|------|----------|----------|
| `update` | Creates/alters tables to match entities. Never drops. | **Development** (default) |
| `validate` | Only validates schema matches entities. Fails on mismatch. | **Production** |
| `create` | Drops and recreates schema on startup. | Testing |
| `create-drop` | Like `create`, but also drops on shutdown. | Unit tests |
| `none` | Hibernate does nothing. | Manual schema management |

**Development** — `spring.jpa.hibernate.ddl-auto=update`:
- Hibernate auto-creates tables, adds new columns, creates indexes
- Safe for iterative development — never drops existing data

**Production** — `spring.jpa.hibernate.ddl-auto=validate`:
- Hibernate only checks that the schema matches the entity model
- Fails fast on startup if there is a mismatch
- Schema changes must be applied before deployment (e.g., via a DBA or migration script)

Entity example:
```java
@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, unique = true, nullable = false)
    private String login;

    @Column(length = 191, unique = true, nullable = false)
    private String email;

    @Column(name = "created_at")
    private Instant createdAt;
}
```

> Hibernate derives the DDL from `@Column`, `@Table`, `@Index`, and other JPA annotations. Keep entities well-annotated for accurate schema generation.

## Testcontainers Integration
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
  @Bean
  @ServiceConnection
  PostgreSQLContainer postgresContainer() {
    return new PostgreSQLContainer("postgres:16-alpine")
      .withReuse(true);
  }
}
```
Use `@Import(TestcontainersConfiguration.class)` in integration tests. Keep class **package-private** (Boot 4 requirement).

## Docker Compose (Dev)
`compose.yaml` (used by `spring-boot-docker-compose`):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  postgres_data:
```

## Production Tips
- **Pooling:** Use HikariCP defaults; tune `maximum-pool-size` and `connection-timeout`.
- **Indexes:** Add indexes via JPA annotations (`@Index` in `@Table`) or manual DDL.
- **Secrets:** Inject via environment variables or Vault/Key Vault; never commit plaintext.
- **Schema Validation:** Keep `spring.jpa.hibernate.ddl-auto=validate` in prod.
- **UTF-8:** Ensure DB encoding is UTF8 (default for official Postgres images).

## Local Developer Experience
- Enable `spring-boot-docker-compose` (Boot 3.1+) to auto-start `compose.yaml` on `./mvnw spring-boot:run`.
- Provide `.env.sample` with placeholders: `DATABASE_PASSWORD`, etc. (see [Project Setup](PROJECT-SETUP.md)).

## Observability
- Expose Postgres metrics via `pg_stat_statements`; integrate with Micrometer if needed.
- Consider **pgBouncer** for high-connection scenarios; document in ops runbook.

## Validation / Checks
- Verify that `ddl-auto=update` creates all expected tables on a fresh database.
- Add integration test to verify entity persistence (e.g., save and retrieve an `AppUser`).

## Troubleshooting
- Common error: `FATAL: password authentication failed` — verify `spring.datasource.*` and `compose.yaml` env vars match.
- Timeouts in CI: increase Testcontainers startup timeout or use `withReuse(true)` + `~/.testcontainers.properties`.

## References

- [Spring Boot Data Access](https://docs.spring.io/spring-boot/reference/data/sql.html)
- [Hibernate Database Schema Generation](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#schema-generation)
- [Testcontainers PostgreSQL Module](https://java.testcontainers.org/modules/databases/postgres/)
- [Docker Deployment Guide](DOCKER.md) — `compose.yaml` setup
- [Configuration Best Practices](CONFIGURATION.md) — externalized config & secrets
- [Project Setup](PROJECT-SETUP.md) — `.env.sample` for database credentials

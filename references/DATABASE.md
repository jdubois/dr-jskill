# Database Best Practices (PostgreSQL)

## Defaults
- **Engine:** PostgreSQL (preferred version: **16**; configure in `versions.json`).
- **Migrations:** ✅ **Flyway** (Liquibase is not offered).
- **Driver:** `org.postgresql:postgresql` (bundled via start.spring.io dependency).
- **Testcontainers:** Use `postgres:16-alpine` images.

## Spring Boot Configuration

`src/main/resources/application.properties`:
```properties
# Datasource
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=app
spring.datasource.password=${DATABASE_PASSWORD:app}
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=false
spring.jpa.open-in-view=false

# Flyway
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
```

## Flyway Structure
```
src/main/resources/db/migration/
  V1__init.sql
  V2__add_user_table.sql
```

Flyway SQL examples:
```sql
-- V1__init.sql
CREATE TABLE if not exists app_user (
  id BIGSERIAL PRIMARY KEY,
  login VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(191) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Testcontainers Integration
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
  @Bean
  @ServiceConnection
  PostgreSQLContainer<?> postgresContainer() {
    return new PostgreSQLContainer<>("postgres:16-alpine")
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
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "app"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  postgres_data:
```

## Production Tips
- **Pooling:** Use HikariCP defaults; tune `maximum-pool-size` and `connection-timeout`.
- **Indexes:** Add indexes via Flyway migrations, not in code.
- **Secrets:** Inject via environment variables or Vault/Key Vault; never commit plaintext.
- **Schema Validation:** Keep `spring.jpa.hibernate.ddl-auto=validate` in prod.
- **UTF-8:** Ensure DB encoding is UTF8 (default for official Postgres images).

## Local Developer Experience
- Enable `spring-boot-docker-compose` (Boot 3.1+) to auto-start `compose.yaml` on `./mvnw spring-boot:run`.
- Provide `.env.example` with placeholders: `DATABASE_PASSWORD`, etc.

## Observability
- Expose Postgres metrics via `pg_stat_statements`; integrate with Micrometer if needed.
- Consider **pgBouncer** for high-connection scenarios; document in ops runbook.

## Validation / Checks
- Add Flyway migration to create a lightweight health-check table to validate DB readiness.
- Add integration test to verify Flyway migrations applied (e.g., `SELECT count(*) FROM flyway_schema_history`).

## Troubleshooting
- Common error: `FATAL: password authentication failed` — verify `spring.datasource.*` and `compose.yaml` env vars match.
- Timeouts in CI: increase Testcontainers startup timeout or use `withReuse(true)` + `~/.testcontainers.properties`.

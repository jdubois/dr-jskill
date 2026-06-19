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
- **Engine:** PostgreSQL (preferred version: **18**; configure in `versions.json`).
- **Schema management:** ✅ **Hibernate ddl-auto** — schema derived from `@Entity` classes. Do not offer Flyway or Liquibase.
- **Driver:** `org.postgresql:postgresql` (bundled via start.spring.io dependency).
- **Testcontainers:** Use `postgres:18-alpine` images.

## Spring Boot Configuration

`src/main/resources/application.properties`:
```properties
# Local .env support
spring.config.import=optional:file:.env[.properties]

# Datasource
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:${POSTGRES_PORT:5432}/mydb}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:user}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:password}
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
    return new PostgreSQLContainer("postgres:18-alpine")
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
volumes:
  postgres_data:
```

## Production Tips
- **Pooling:** Use HikariCP defaults; tune `maximum-pool-size` and `connection-timeout`.
- **Indexes:** Add indexes on foreign keys and columns used in `WHERE` / `ORDER BY` via `@Index` in `@Table`. Verify query plans with `EXPLAIN ANALYZE` under production-like data volumes — ddl-auto does not create indexes for you beyond primary keys and those you declare.
- **Secrets:** Inject via environment variables or Vault/Key Vault; never commit plaintext.
- **Schema Validation:** Keep `spring.jpa.hibernate.ddl-auto=validate` in prod.
- **UTF-8:** Ensure DB encoding is UTF8 (default for official Postgres images).

## Performance Optimization

### Avoiding N+1 Queries
The most common JPA performance issue. Use `JOIN FETCH` or `@EntityGraph` to load associations in a single query:

```java
// BAD: triggers N+1 — one query per order's items
List<Order> orders = orderRepository.findAll();
orders.forEach(o -> o.getItems().size()); // N extra queries

// GOOD: single query with JOIN FETCH
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.status = :status")
List<Order> findByStatusWithItems(@Param("status") String status);

// GOOD: declarative with @EntityGraph
@EntityGraph(attributePaths = {"items"})
List<Order> findByStatus(String status);
```

Enable Hibernate statistics in development to detect N+1 issues:
```properties
# Development only — disable in production
spring.jpa.properties.hibernate.generate_statistics=true
logging.level.org.hibernate.stat=DEBUG
```

### Pagination
Always paginate large result sets. Never use unbounded `findAll()` in production:

```java
// Repository
Page<AppUser> findByActiveTrue(Pageable pageable);

// Controller
@GetMapping("/users")
Page<AppUser> listUsers(@RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "20") int size) {
    return userRepository.findByActiveTrue(PageRequest.of(page, size, Sort.by("login")));
}
```

For large tables, deep offset pagination (`OFFSET 100000`) becomes slow because the database must scan-and-discard all skipped rows. Switch to **keyset (seek) pagination** based on an indexed column:

```java
// Instead of PageRequest.of(page, size), use a cursor on the last seen id
List<AppUser> findByIdGreaterThanOrderByIdAsc(Long cursorId, Limit limit);
```

### Batch Operations
For bulk inserts/updates, configure Hibernate batching:

```properties
spring.jpa.properties.hibernate.jdbc.batch_size=25
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
```

Use `saveAll()` instead of individual `save()` calls inside loops:
```java
// BAD: N individual INSERT statements
items.forEach(item -> repository.save(item));

// GOOD: batched — Hibernate groups INSERTs
repository.saveAll(items);
```

PostgreSQL's JDBC driver only sends true batches when `reWriteBatchedInserts` is enabled on the JDBC URL:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb?reWriteBatchedInserts=true
```

Without this flag, `batch_size` has little effect on INSERT performance.

### Connection Pool Sizing
HikariCP pool size should match your workload. A good starting formula:

```properties
# connections = (2 × CPU cores) + effective_spindle_count
# For a typical 4-core server with SSD:
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.connection-timeout=30000
```

### Caching
For read-heavy data that changes infrequently, enable Hibernate second-level cache:

```properties
spring.jpa.properties.hibernate.cache.use_second_level_cache=true
spring.jpa.properties.hibernate.cache.region.factory_class=org.hibernate.cache.jcache.JCacheRegionFactory
```

```java
@Entity
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
public class Country { ... }
```

For application-level caching, use Spring's `@Cacheable`:
```java
@Cacheable("users")
public AppUser findByLogin(String login) {
    return userRepository.findByLogin(login);
}
```

> The second-level cache is only a win for read-mostly entities that are looked up frequently by primary key (reference data, lookup tables). For write-heavy or frequently-invalidated entities it **adds** overhead. Measure before enabling it broadly.

### Read-only transactions

Mark query-only service methods `@Transactional(readOnly = true)`. Hibernate skips dirty-checking and auto-flush, which is a measurable win on large result sets.

```java
@Service
public class UserService {

    @Transactional(readOnly = true)
    public Page<AppUser> listActive(Pageable pageable) {
        return userRepository.findByActiveTrue(pageable);
    }
}
```

Combine with `spring.jpa.open-in-view=false` (already the default in generated projects) to keep transaction boundaries tight.

### DTO / record projections

For list endpoints and dashboards, project only the columns you actually render. This avoids hydrating full entity graphs and sidesteps many N+1 traps.

```java
public record UserSummary(Long id, String login, String email) {}

public interface UserRepository extends JpaRepository<AppUser, Long> {

    @Query("""
        SELECT new com.example.app.user.UserSummary(u.id, u.login, u.email)
        FROM AppUser u
        WHERE u.active = true
        """)
    List<UserSummary> findActiveSummaries();
}
```

Spring Data also supports interface projections (`Page<UserSummaryView>`) when you prefer declarative mapping.

## Local Developer Experience
- Enable `spring-boot-docker-compose` (Boot 3.1+) to auto-start `compose.yaml` on `./mvnw spring-boot:run`.
- Provide `.env.sample` with placeholders: `SPRING_DATASOURCE_PASSWORD`, etc. (see [Project Setup](PROJECT-SETUP.md)).

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

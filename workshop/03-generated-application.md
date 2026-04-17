# 03 — Anatomy of the generated application

**In this chapter:**
- Understand the **backend** layout: entity, repository, service, controller
- See how **Hibernate** creates the database schema for you
- See how **Docker Compose** starts PostgreSQL during development
- See how **Vite + Vue** plug into the Maven build

No code to write. You'll explore what the agent already generated, so Chapter 4 onwards makes sense.

---

## 1. Where things live

Open your project in VS Code (or your editor of choice):

```bash
code ~/workshop
```

Focus on four areas:

```
pom.xml                    <-- the Maven build file (deps, plugins, profiles)
src/main/java/             <-- the Spring Boot backend
src/main/resources/        <-- configuration
compose.yaml               <-- Docker Compose for Postgres
frontend/                  <-- Vue.js application
```

Everything else is plumbing (tests, Dockerfiles, dotfiles). We'll meet those in later chapters.

## 2. The backend, layer by layer

Spring Boot apps are typically organized in **layers**. Open `src/main/java/` and you'll see something close to:

```
com/example/app/
  Application.java               <-- main() entry point
  todo/
    Todo.java                    <-- entity (JPA @Entity)
    TodoRepository.java          <-- data-access (Spring Data JPA)
    TodoService.java             <-- business logic
    TodoController.java          <-- REST API (@RestController)
```

Exact package names may differ — the agent picks them — but the **pattern** is the same. Here is what each layer does.

### 2.1 The entity — `Todo.java`

```java
@Entity
@Table(name = "todo")
public class Todo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private boolean completed;

    // getters, setters, constructors, equals/hashCode...
}
```

`@Entity` tells Hibernate this class maps to a database table. JPA annotations describe columns, constraints, and relationships. **Dr JSkill never uses Lombok** — getters and setters are written out explicitly. Verbose but transparent.

### 2.2 The repository — `TodoRepository.java`

```java
public interface TodoRepository extends JpaRepository<Todo, Long> {
}
```

You declare an interface, Spring Data generates the implementation at runtime. `findAll()`, `findById(Long)`, `save(Todo)`, `deleteById(Long)` — all free. No SQL to write for basic CRUD.

### 2.3 The service — `TodoService.java`

The service holds **business logic**: validations, cross-repository coordination, transactions. In a tiny CRUD app it's thin — sometimes just delegations. That's fine. Having the layer there means you have a place to grow into when logic appears.

### 2.4 The controller — `TodoController.java`

```java
@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService service;

    public TodoController(TodoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Todo> list() { return service.findAll(); }

    @PostMapping
    public Todo create(@RequestBody Todo todo) { return service.save(todo); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { service.deleteById(id); }
}
```

This is the HTTP surface. `@RestController` + `@GetMapping` turn method calls into REST endpoints. The Vue front-end calls these URLs with `fetch()` / `axios`.

## 3. Configuration — `application.properties`

Open `src/main/resources/application.properties`. You'll see something like:

```properties
spring.application.name=todo-app

# Datasource — injected by spring-boot-docker-compose at dev time
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/mydb}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:user}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:password}

# Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
```

Two things worth noticing:

**`spring.jpa.hibernate.ddl-auto=update`**. On startup, Hibernate inspects your `@Entity` classes and **creates or updates the database schema automatically**. No Flyway, no Liquibase, no SQL migration files — that is a deliberate Dr JSkill choice.

- `update` (dev default): creates missing tables, adds new columns. Never drops.
- `validate` (prod default): only checks that the schema matches — fails fast if it doesn't.

See [`references/DATABASE.md`](../references/DATABASE.md) for the full story.

**`spring.datasource.*` uses environment variables** with fallback defaults. Production overrides them via real env vars; `.env.sample` documents what they are.

## 4. The database — `compose.yaml`

Open `compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "user"]
      ...
```

Here's the magic: Spring Boot has a built-in feature called [`spring-boot-docker-compose`](https://docs.spring.io/spring-boot/reference/features/dev-services.html#features.dev-services.docker-compose). When you run `./mvnw spring-boot:run`, it:

1. Detects `compose.yaml` in the project root
2. Runs `docker compose up -d` for you
3. Reads the service definition and auto-wires `spring.datasource.url` to the running container
4. Stops the container when you shut down the app

That's why Chapter 2's `./mvnw spring-boot:run` "just works" without you running `docker compose up` yourself.

See [`references/DOCKER.md`](../references/DOCKER.md) for production Docker deployment (a completely separate topic).

## 5. The front-end — `frontend/`

Open `frontend/`:

```
frontend/
  index.html
  package.json
  vite.config.js
  src/
    main.js
    App.vue
    components/
    views/
    services/
  public/
```

This is a standard [Vite + Vue](https://vitejs.dev) project. The interesting question is: **how does it get packaged with the Spring Boot app?**

### 5.1 The Maven Frontend Plugin

Open `pom.xml` and look for `frontend-maven-plugin`:

```xml
<plugin>
  <groupId>com.github.eirslett</groupId>
  <artifactId>frontend-maven-plugin</artifactId>
  ...
  <executions>
    <execution>
      <id>install node and npm</id>
      <goals><goal>install-node-and-npm</goal></goals>
    </execution>
    <execution>
      <id>npm install</id>
      <goals><goal>npm</goal></goals>
      <configuration><arguments>install</arguments></configuration>
    </execution>
    <execution>
      <id>npm build</id>
      <goals><goal>npm</goal></goals>
      <configuration><arguments>run build</arguments></configuration>
    </execution>
  </executions>
</plugin>
```

When you run `./mvnw package` (or `./mvnw spring-boot:run` with the `prod` profile), Maven:

1. Installs a local Node.js inside `frontend/node/` (doesn't touch your system Node)
2. Runs `npm install` inside `frontend/`
3. Runs `npm run build` — Vite produces optimized, hashed assets in `frontend/dist/`
4. Copies `frontend/dist/` into `src/main/resources/static/` so Spring Boot serves it

Result: a single executable JAR that contains both the Spring Boot backend and the compiled Vue front-end. No separate web server needed.

### 5.2 Dev vs prod

- **Dev (`./mvnw spring-boot:run`):** Spring Boot serves a pre-built front-end from `src/main/resources/static/`. If you edit `.vue` files and want fast hot-reload, run `npm run dev` inside `frontend/` separately — it starts Vite on port 5173 with HMR.
- **Prod (`./mvnw -Pprod package`):** produces a fat JAR with the optimized bundle baked in.

See [`references/VUE.md`](../references/VUE.md) for the full front-end reference.

## 6. The dotfiles — the "feels professional" layer

Have a look at these files — each one does a small job:

| File | Purpose |
|---|---|
| `.gitignore` | Excludes `target/`, `node_modules/`, `.jdtls-workspace/`, etc. |
| `.editorconfig` | Enforces indentation / line endings across editors |
| `.gitattributes` | Line-ending normalization (CRLF vs LF) |
| `.dockerignore` | Keeps Docker images small (excludes `.git`, `target/`, tests…) |
| `.env.sample` | Documents the env vars the app expects — copy to `.env` for local secrets |
| `.github/lsp.json` | Tells Copilot CLI to wire JDTLS for this project |
| `.vscode/extensions.json` | Recommends the Java and Vue VS Code extensions |
| `Dockerfile` | Multi-stage build: compile with JDK, run on JRE |
| `Dockerfile-native` | Alternate: GraalVM native image (much smaller, faster startup) |
| `compose.yaml` | Postgres for development |

None of these are flashy — they're the difference between "a prototype" and "a project a team can pick up tomorrow". Dr JSkill ships them by default.

## 7. Commits so far

Let's see the git history:

```bash
git log --oneline
```

You should see one or two commits from Chapter 2. From here on, every chapter ends with a new commit — that's your trail of breadcrumbs if anything goes wrong.

---

**Try this yourself**

Pick a file you're curious about (say `TodoController.java`) and ask the agent:

```
Explain TodoController.java line by line — I'm new to Spring Boot.
```

The agent reads the file and explains it using JDTLS under the hood (so it can tell you what `@RestController` actually registers, not just guess). This kind of "explain-the-code" prompt is one of the highest-leverage uses of Copilot CLI during a workshop.

---

**Checkpoint**

- You can locate the entity, repository, service, and controller files
- You understand roughly what `ddl-auto=update` does
- You know how Vite + Vue get packaged into the Spring Boot JAR
- No code changes expected — `git status` should still be clean

**Next →** [Chapter 4 — Adding users](04-adding-users.md)

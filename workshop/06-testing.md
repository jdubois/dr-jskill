# 06 — Testing

**In this chapter:**
- Ask the agent to **add tests** for what you built so far
- Learn the two test styles Dr JSkill generates: **unit tests** with Mockito and **integration tests** with Testcontainers
- Run the full test suite with `./mvnw verify`
- Understand *what* to test, not just *how*

A generated project already ships a minimal context test. This chapter grows the suite to real coverage.

---

## 1. Why test AI-generated code?

Two reasons:

1. **Regression safety.** Every time you give the agent a new prompt, it may change more than you intended. Tests catch that in seconds, not in production.
2. **Documentation.** A good test reads like a spec: *"when I POST a todo without a userId, the API returns 400"*. Tests make future prompts more accurate — the agent reads them too.

## 2. The two test styles

Open `src/test/java/` in your project. You'll see the one test the generator ships:

```java
@SpringBootTest
class ApplicationTest {
    @Test
    void contextLoads() {}
}
```

This proves the app starts. Useful, but tiny. Dr JSkill's convention (see [`references/TEST.md`](../references/TEST.md)) uses two styles:

| Style | Scope | Runs via | Speed |
|---|---|---|---|
| **Unit tests** with Mockito (`@WebMvcTest`, plain `@Test`) | One class in isolation, collaborators mocked | `./mvnw test` | Milliseconds |
| **Integration tests** with Testcontainers (`@SpringBootTest` + real Postgres) | The whole app against a real DB in a container | `./mvnw verify` | Seconds |

Unit tests go in `src/test/java/.../*Test.java`. Integration tests follow a `*IT.java` naming convention and are run by the Maven Failsafe plugin during the `verify` phase.

## 3. Add unit tests for the controller

In your Copilot CLI session:

```
Add unit tests for TodoController using @WebMvcTest and MockMvc.

Cover:
- GET /api/todos returns a list and 200
- GET /api/todos?userId=1 filters correctly (mock the service)
- POST /api/todos with a valid body returns 201 and the created todo
- POST /api/todos with an empty title returns 400
- DELETE /api/todos/{id} returns 204

Use Mockito's @MockitoBean for the service dependency (not the deprecated @MockBean).
Follow the conventions in references/TEST.md.
```

Review the diff. Run:

```bash
./mvnw test
```

Should finish in seconds, all green.

Commit:

```bash
git add . && git commit -m "Add @WebMvcTest coverage for TodoController"
```

## 4. Add an integration test with Testcontainers

Integration tests verify the **whole stack**: REST → service → repository → real PostgreSQL — no mocks.

```
Add an integration test TodoIntegrationIT that:

- Uses Testcontainers with postgres:18-alpine via @ServiceConnection
- Creates a todo via POST, reads it back via GET, deletes it via DELETE
- Asserts the todo is gone afterwards
- Uses RestAssured or TestRestTemplate, whichever is already in the project

Put the test in the same package as TestcontainersConfiguration (package-private).
Follow references/TEST.md.
```

Review the diff. The agent should:

- Place the file at `src/test/java/.../TodoIntegrationIT.java` (note the `IT` suffix)
- Use `@Import(TestcontainersConfiguration.class)` so the same Postgres container is shared
- Not create a new container per test

## 5. Run the full suite

```bash
./mvnw verify
```

This runs:

1. Unit tests (Surefire, `*Test.java`)
2. Integration tests (Failsafe, `*IT.java`)
3. Checksums and packaging

First run downloads the Testcontainers Postgres image — slow. Subsequent runs reuse it if you enabled container reuse (see below).

## 6. Speed up the feedback loop

Testcontainers can **reuse** a container across runs rather than recreating it each time. Per [`references/TEST.md`](../references/TEST.md#7-test-suite-performance), create this file on your machine (not in the project):

```properties
# ~/.testcontainers.properties
testcontainers.reuse.enable=true
```

Next `./mvnw verify` keeps the Postgres container running in the background and reuses it. First run still pays the full startup cost; from the second onwards integration tests start in seconds.

## 7. Run a single test

While iterating, you don't want to run the whole suite every time:

```bash
# One unit test class
./mvnw test -Dtest=TodoControllerTest

# One integration test class
./mvnw verify -Dit.test=TodoIntegrationIT -DskipUnitTests

# One test method
./mvnw test -Dtest=TodoControllerTest#createReturnsBadRequestOnEmptyTitle
```

## 8. Fix a failure with the agent

Deliberately break something to practice the fix-loop:

1. Open `TodoController.java`, change `@PostMapping` to return `HttpStatus.OK` instead of `CREATED`.
2. Run `./mvnw test` — the POST test should fail.
3. Without fixing by hand, paste into Copilot CLI:

   ```
   ./mvnw test is failing with an expected 201 but got 200 in TodoControllerTest.
   Please fix TodoController so POST /api/todos returns 201 Created.
   ```

4. Review the diff, run tests again, confirm green.
5. Revert to a clean state: `git restore .` (or commit if you like).

This is the loop you'll use against real bugs in later projects.

---

## When to write tests yourself vs. ask the agent

- **Ask the agent** for boilerplate: `@WebMvcTest` setup, Testcontainers wiring, repetitive CRUD assertions.
- **Write yourself** (or carefully review) tests that encode **business rules**: "a todo can't be assigned to a deleted user", "titles longer than 200 chars are rejected". These are the tests that protect your intent.

---

**Try this yourself**

Pick one of these and prompt the agent:

- *"Add a unit test for TodoService covering the user-not-found case."*
- *"Add an integration test that asserts todos created for alice are not visible when filtering by bob."*
- *"Add a repository test (`@DataJpaTest`) verifying that saving a Todo with a null title throws a validation exception."*

Review every diff before running.

---

**Checkpoint**

- `./mvnw test` — all unit tests green
- `./mvnw verify` — unit + integration tests green
- `git log --oneline` shows test-adding commits from this chapter

**Next →** [Chapter 7 — Performance](07-performance.md)

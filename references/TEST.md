# Spring Boot Testing Best Practices

## Contents
- [Overview](#overview)
- [Testing Dependencies](#testing-dependencies)
- [Testcontainers 2 + @ServiceConnection quickstart](#testcontainers-2--serviceconnection-quickstart)
- [Unit Tests with Mocks](#unit-tests-with-mocks)
- [Integration Tests with TestContainers](#integration-tests-with-testcontainers)
- [Test Naming Conventions](#test-naming-conventions)
- [Testing Best Practices](#testing-best-practices)
- [Example Test Structure](#example-test-structure)
- [Running Tests](#running-tests)
- [Security Scanning & SBOM (CI-ready)](#security-scanning--sbom-ci-ready)
- [Additional Resources](#additional-resources)
- [Spring Boot 4 Migration Notes](#spring-boot-4-migration-notes)

## Overview
This guide covers testing best practices for Spring Boot 4.x applications, including unit tests with mocks and integration tests with TestContainers.

**Spring Boot 4 Testing Changes:**
- TestContainers 2.0+ is required (integration simplified with `@ServiceConnection`)
- **@MockBean/@SpyBean are DEPRECATED** - use `@MockitoBean/@MockitoSpyBean` from Spring Framework instead
- `@ServiceConnection` eliminates need for manual `@DynamicPropertySource` configuration
- New modular test starter structure (e.g., `spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`)
- **`@WebMvcTest` and `@AutoConfigureMockMvc` moved** to `org.springframework.boot.webmvc.test.autoconfigure.servlet` package — requires `spring-boot-starter-webmvc-test` dependency

## Testing Dependencies

Add these dependencies to your `pom.xml`:

> ⚠️ `TestcontainersConfiguration` classes must be **package-private** (no `public`) in Spring Boot 4 when used with `@ServiceConnection`.

```xml
<dependencies>
    <!-- Spring Boot Test Starter (includes JUnit 5, Mockito, AssertJ) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- WebMvc Test Starter (provides @WebMvcTest, @AutoConfigureMockMvc) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webmvc-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- TestContainers 2.0+ for integration tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-testcontainers</artifactId>
        <scope>test</scope>
    </dependency>
    
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers-postgresql</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Testcontainers 2 + @ServiceConnection quickstart

```java
// src/test/java/.../TestcontainersConfiguration.java (package-private!)
import org.testcontainers.postgresql.PostgreSQLContainer; // ✅ TC 2.x package

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
  @Bean
  @ServiceConnection
  PostgreSQLContainer<?> postgresContainer() {
    return new PostgreSQLContainer<>("postgres:16-alpine");
  }
}
```

Use `@Import(TestcontainersConfiguration.class)` or `@ImportAutoConfiguration` in your integration tests.

## Unit Tests with Mocks

Unit tests should test individual components in isolation using mocks for dependencies.

**Two approaches to mocking in Spring Boot 4:**

1. **Pure Mockito** (for unit tests without Spring context):
   - Use `@ExtendWith(MockitoExtension.class)`
   - Use `@Mock` and `@InjectMocks` from Mockito
   - Fast, no Spring container overhead
   - Best for testing service logic, utilities, domain logic

2. **Spring Boot Test with @MockitoBean** (for tests with Spring context):
   - Use `@MockitoBean` from `org.springframework.test.context.bean.override.mockito.MockitoBean`
   - **DO NOT use deprecated** `@MockBean` from `org.springframework.boot.test.mock.mockito.MockBean`
   - Integrated with Spring's dependency injection
   - Use with `@WebMvcTest`, `@DataJpaTest`, or `@SpringBootTest`
   - Best for testing Spring-managed components

### Testing Services with Mockito

**Example: Service Unit Test**

```java
package com.example.app.service;

import com.example.app.domain.User;
import com.example.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
    }

    @Test
    void shouldCreateUser() {
        // Given
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        User createdUser = userService.createUser(testUser);

        // Then
        assertThat(createdUser).isNotNull();
        assertThat(createdUser.getUsername()).isEqualTo("testuser");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void shouldFindUserById() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        Optional<User> foundUser = userService.findById(1L);

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser");
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void shouldThrowExceptionWhenUserNotFound() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        assertThatThrownBy(() -> userService.getUserById(999L))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessageContaining("User not found");
    }
}
```

### Testing Controllers with @WebMvcTest

Test controllers without loading the full application context. Uses `@MockitoBean` to mock service dependencies.

> ✅ **Spring Boot 4 import:** `org.springframework.boot.webmvc.test.autoconfigure.servlet.WebMvcTest`
> ✅ **Dependency:** `spring-boot-starter-webmvc-test` (required — `spring-boot-starter-test` alone no longer provides `@WebMvcTest`). Avoid IDE auto-imports to the old `org.springframework.boot.test.autoconfigure.web.servlet` package or `org.springframework.test.web.servlet.*`.

**Example: Controller Unit Test**

```java
package com.example.app.controller;

import com.example.app.domain.User;
import com.example.app.service.UserService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.servlet.WebMvcTest; // ✅ correct package for Boot 4
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    @Test
    void shouldGetAllUsers() throws Exception {
        // Given
        User user1 = new User(1L, "user1", "user1@example.com");
        User user2 = new User(2L, "user2", "user2@example.com");
        when(userService.findAll()).thenReturn(Arrays.asList(user1, user2));

        // When/Then
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$[0].username").value("user1"))
            .andExpect(jsonPath("$[1].username").value("user2"));
    }

    @Test
    void shouldGetUserById() throws Exception {
        // Given
        User user = new User(1L, "testuser", "test@example.com");
        when(userService.findById(1L)).thenReturn(Optional.of(user));

        // When/Then
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("testuser"))
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void shouldCreateUser() throws Exception {
        // Given
        User newUser = new User(null, "newuser", "new@example.com");
        User savedUser = new User(1L, "newuser", "new@example.com");
        when(userService.createUser(any(User.class))).thenReturn(savedUser);

        // When/Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newUser)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.username").value("newuser"));
    }

    @Test
    void shouldReturn404WhenUserNotFound() throws Exception {
        // Given
        when(userService.findById(999L)).thenReturn(Optional.empty());

        // When/Then
        mockMvc.perform(get("/api/users/999"))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldValidateUserInput() throws Exception {
        // Given
        User invalidUser = new User(null, "", "invalid-email");

        // When/Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidUser)))
            .andExpect(status().isBadRequest());
    }
}
```

## Integration Tests with TestContainers

Integration tests verify the complete application stack, including database interactions.

### TestContainers Configuration

Create a test configuration class for TestContainers. **This is the recommended pattern used by Spring Initializr.**

**IMPORTANT: This class must be package-private (no `public` modifier)**

**Example: TestcontainersConfiguration.java**

```java
package com.example.app;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {  // ✅ Note: package-private (no public modifier)

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }
}
```

**Common mistake:**
```java
// ❌ WRONG - Don't make this public
public class TestcontainersConfiguration {
    // ...
}

// ✅ CORRECT - Package-private
class TestcontainersConfiguration {
    // ...
}
```

**Why package-private?**
- Test configuration should not be exported outside the test package
- Follows Spring Boot's convention for test-only configuration
- Prevents accidental use in production code

**Using TestcontainersConfiguration in tests:**

```java
package com.example.app;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestcontainersConfiguration.class)  // Import the configuration
class ApplicationIT {
    
    @Test
    void testDatabaseConnection() {
        // Test with real PostgreSQL from TestContainers
    }
}
```
```

**Note:** With Spring Boot 4.0, `@ServiceConnection` automatically configures datasource properties. No need for manual `@DynamicPropertySource` configuration. TestContainers 2.0+ is required.

### REST API Integration Test

Test the complete REST endpoint with real database interactions.

**Example: UserIntegrationIT.java**

```java
package com.example.app.controller;

import com.example.app.TestcontainersConfiguration;
import com.example.app.domain.User;
import com.example.app.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class UserIntegrationIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldCreateAndRetrieveUser() throws Exception {
        // Given
        User newUser = new User(null, "integrationuser", "integration@example.com");

        // When - Create user
        String response = mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newUser)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value("integrationuser"))
            .andReturn()
            .getResponse()
            .getContentAsString();

        User createdUser = objectMapper.readValue(response, User.class);

        // Then - Verify user exists in database
        assertThat(userRepository.findById(createdUser.getId())).isPresent();

        // When - Retrieve user
        mockMvc.perform(get("/api/users/" + createdUser.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("integrationuser"))
            .andExpect(jsonPath("$.email").value("integration@example.com"));
    }

    @Test
    void shouldUpdateUser() throws Exception {
        // Given
        User user = new User(null, "oldname", "old@example.com");
        user = userRepository.save(user);

        User updatedUser = new User(user.getId(), "newname", "new@example.com");

        // When
        mockMvc.perform(put("/api/users/" + user.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedUser)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("newname"))
            .andExpect(jsonPath("$.email").value("new@example.com"));

        // Then
        User savedUser = userRepository.findById(user.getId()).orElseThrow();
        assertThat(savedUser.getUsername()).isEqualTo("newname");
    }

    @Test
    void shouldDeleteUser() throws Exception {
        // Given
        User user = new User(null, "todelete", "delete@example.com");
        user = userRepository.save(user);

        // When
        mockMvc.perform(delete("/api/users/" + user.getId()))
            .andExpect(status().isNoContent());

        // Then
        assertThat(userRepository.findById(user.getId())).isEmpty();
    }

    @Test
    void shouldGetAllUsers() throws Exception {
        // Given
        userRepository.save(new User(null, "user1", "user1@example.com"));
        userRepository.save(new User(null, "user2", "user2@example.com"));

        // When/Then
        mockMvc.perform(get("/api/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(2));
    }
}
```

### Repository Integration Test

Test repository methods with real database.

**Example: UserRepositoryIT.java**

```java
package com.example.app.repository;

import com.example.app.TestcontainersConfiguration;
import com.example.app.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class UserRepositoryIT {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void shouldSaveAndFindUser() {
        // Given
        User user = new User(null, "testuser", "test@example.com");

        // When
        User savedUser = userRepository.save(user);

        // Then
        assertThat(savedUser.getId()).isNotNull();
        Optional<User> foundUser = userRepository.findById(savedUser.getId());
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getUsername()).isEqualTo("testuser");
    }

    @Test
    void shouldFindByUsername() {
        // Given
        userRepository.save(new User(null, "john", "john@example.com"));
        userRepository.save(new User(null, "jane", "jane@example.com"));

        // When
        Optional<User> found = userRepository.findByUsername("john");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("john");
    }

    @Test
    void shouldFindAllUsers() {
        // Given
        userRepository.save(new User(null, "user1", "user1@example.com"));
        userRepository.save(new User(null, "user2", "user2@example.com"));

        // When
        List<User> users = userRepository.findAll();

        // Then
        assertThat(users).hasSize(2);
    }

    @Test
    void shouldDeleteUser() {
        // Given
        User user = userRepository.save(new User(null, "todelete", "delete@example.com"));

        // When
        userRepository.deleteById(user.getId());

        // Then
        assertThat(userRepository.findById(user.getId())).isEmpty();
    }
}
```

## Test Naming Conventions

**Unit tests** end with `Test`:
- `UserServiceTest.java`
- `OrderControllerTest.java`
- Fast, isolated tests with mocks

**Integration tests** end with `IT`:
- `UserIntegrationIT.java`
- `UserRepositoryIT.java`
- Slower tests with real database and full context

This naming convention allows:
- Maven Surefire plugin to run unit tests (`*Test.java`)
- Maven Failsafe plugin to run integration tests (`*IT.java`)
- Separate execution in CI/CD pipelines
- Clear distinction between test types

## Testing Best Practices

### 1. Test Organization
- Use descriptive test method names (e.g., `shouldCreateUserWhenValidInput()`)
- Follow the Given-When-Then pattern in test structure
- Keep tests focused - one assertion per test when possible
- Use `@BeforeEach` for common setup
- **Name unit tests with `Test` suffix, integration tests with `IT` suffix**

### 2. Unit Tests
- Mock all external dependencies
- Test business logic in isolation
- **For pure unit tests**: Use `@ExtendWith(MockitoExtension.class)` with `@Mock` and `@InjectMocks`
- **For Spring-integrated tests**: Use `@WebMvcTest`, `@DataJpaTest` with `@MockitoBean` (not deprecated `@MockBean`)
- Verify mock interactions with `verify()`

### 3. Integration Tests
- Use `@Import(TestcontainersConfiguration.class)` for consistent TestContainers setup
- Use `@SpringBootTest` to load full application context
- Use `@AutoConfigureMockMvc` for REST endpoint testing
- Clean database state in `@BeforeEach` for test isolation
- Test complete user flows and edge cases

### 4. TestContainers Configuration
- Use lightweight PostgreSQL Alpine image (`postgres:16-alpine`)
- Share container across tests with `@Container static` field
- Use `@ServiceConnection` for automatic Spring Boot configuration
- Container starts once per test class, improving performance

### 5. Assertions
- Prefer AssertJ for fluent, readable assertions
- Use `assertThat()` over `assertEquals()`
- Test both success and failure scenarios
- Verify exception types and messages

### 6. Test Coverage
- Aim for 80%+ code coverage
- Focus on critical business logic
- Test edge cases and error conditions
- Don't test framework code or simple getters/setters

## Example Test Structure

```
src/test/java/
└── com/example/app/
    ├── TestcontainersConfiguration.java     # TestContainers config (package-private!)
    ├── controller/
    │   ├── UserControllerTest.java          # Unit test with mocks
    │   └── UserIntegrationIT.java           # Integration test with TestContainers
    ├── service/
    │   └── UserServiceTest.java             # Unit test with mocks
    └── repository/
        └── UserRepositoryIT.java            # Integration test with TestContainers
```

**Note:** All integration tests should use `@Import(TestcontainersConfiguration.class)` to access the shared TestContainers configuration.

## Running Tests

```bash
# Run all tests (unit + integration)
./mvnw verify

# Run only unit tests (fast)
./mvnw test

# Run only integration tests
./mvnw failsafe:integration-test

# Run specific test class
./mvnw test -Dtest=UserServiceTest

# Run specific integration test
./mvnw verify -Dit.test=UserIntegrationIT

# Run with coverage report
./mvnw verify jacoco:report

# Skip tests during build
./mvnw package -DskipTests
```

## Security Scanning & SBOM (CI-ready)

Add to `pom.xml` (plugins section):
```xml
<plugin>
  <groupId>org.cyclonedx</groupId>
  <artifactId>cyclonedx-maven-plugin</artifactId>
  <version>2.8.0</version>
  <executions>
    <execution>
      <phase>verify</phase>
      <goals><goal>makeAggregateBom</goal></goals>
    </execution>
  </executions>
</plugin>
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <version>9.2.0</version>
  <configuration>
    <failBuildOnCVSS>7</failBuildOnCVSS>
  </configuration>
</plugin>
```

CI commands:
```bash
mvn -B -DskipTests=false verify cyclonedx:makeAggregateBom dependency-check:check
```

## Additional Resources
- [Spring Boot Testing Guide](https://spring.io/guides/gs/testing-web/)
- [TestContainers Documentation](https://testcontainers.com/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)

## Spring Boot 4 Migration Notes

### @MockBean and @SpyBean Deprecation

**Important:** Spring Boot 4 deprecates `@MockBean` and `@SpyBean` in favor of Spring Framework's `@MockitoBean` and `@MockitoSpyBean`.

#### Key Differences

**Old (Deprecated in Spring Boot 4):**
```java
import org.springframework.boot.test.mock.mockito.MockBean;  // ❌ Deprecated

@SpringBootTest
class MyTest {
    @MockBean
    private UserService userService;
}
```

**New (Spring Boot 4):**
```java
import org.springframework.test.context.bean.override.mockito.MockitoBean;  // ✅ Correct

@SpringBootTest
class MyTest {
    @MockitoBean
    private UserService userService;
}
```

#### Migration Path

1. **Field-based mocks** - Direct replacement:
   ```java
   // Change this:
   @MockBean
   private UserService userService;
   
   // To this:
   @MockitoBean
   private UserService userService;
   ```

2. **Shared mocks in @Configuration classes** - Use class-level annotation:
   ```java
   // OLD - Not supported with @MockitoBean
   @TestConfiguration
   public class TestConfig {
       @MockBean
       private UserService userService;
       @MockBean
       private OrderService orderService;
   }
   
   // NEW - Declare on test class
   @SpringBootTest
   @MockitoBean(types = {UserService.class, OrderService.class})
   class ApplicationTests {
       @Test
       void check() {
           // ...
       }
   }
   ```

3. **Custom annotation for shared mocks** - Recommended approach:
   ```java
   @Target(ElementType.TYPE)
   @Retention(RetentionPolicy.RUNTIME)
   @MockitoBean(types = {UserService.class, OrderService.class})
   @MockitoBean(name = "emailService", types = EmailService.class)
   public @interface SharedMocks {
   }
   
   @SpringBootTest
   @SharedMocks
   class ApplicationTests {
       // Clean test class
   }
   ```

#### When to Migrate

- **Now:** For new Spring Boot 4 projects, use `@MockitoBean` from the start
- **Gradually:** For existing projects, you can temporarily use `@SuppressWarnings("removal")` but plan migration
- **Soon:** Spring Boot will remove `@MockBean`/`@SpyBean` support in a future release

#### Full Import Statements

```java
// Spring Boot 4 correct imports:
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

// Deprecated (will be removed):
import org.springframework.boot.test.mock.mockito.MockBean;  // ❌
import org.springframework.boot.test.mock.mockito.SpyBean;   // ❌
```

### TestContainers 2.0 Requirements

Spring Boot 4 requires **TestContainers 2.0+**, which brings:
- **Artifact rename:** `org.testcontainers:postgresql` → `org.testcontainers:testcontainers-postgresql`
- **Package rename:** `org.testcontainers.containers.PostgreSQLContainer` → `org.testcontainers.postgresql.PostgreSQLContainer`
- `junit-jupiter` artifact removed — TC 2.x integrates with JUnit 5 directly
- Improved performance and resource management
- Better cleanup of containers
- Enhanced Docker platform support
- Simplified configuration with `@ServiceConnection`
- [AssertJ Documentation](https://assertj.github.io/doc/)

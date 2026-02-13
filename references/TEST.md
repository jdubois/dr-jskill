# Spring Boot Testing Best Practices

## Overview
This guide covers testing best practices for Spring Boot applications, including unit tests with mocks and integration tests with TestContainers.

## Testing Dependencies

Add these dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Test Starter (includes JUnit 5, Mockito, AssertJ) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    
    <!-- TestContainers for integration tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-testcontainers</artifactId>
        <scope>test</scope>
    </dependency>
    
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <scope>test</scope>
    </dependency>
    
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## Unit Tests with Mocks

Unit tests should test individual components in isolation using mocks for dependencies.

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

Test controllers without loading the full application context.

**Example: Controller Unit Test**

```java
package com.example.app.controller;

import com.example.app.domain.User;
import com.example.app.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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

    @MockBean
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

Create a base test configuration class:

**Example: AbstractIntegrationTest.java**

```java
package com.example.app;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

### REST API Integration Test

Test the complete REST endpoint with real database interactions.

**Example: UserIntegrationIT.java**

```java
package com.example.app.controller;

import com.example.app.AbstractIntegrationTest;
import com.example.app.domain.User;
import com.example.app.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class UserIntegrationIT extends AbstractIntegrationTest {

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

import com.example.app.AbstractIntegrationTest;
import com.example.app.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class UserRepositoryIT extends AbstractIntegrationTest {

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
- Use `@ExtendWith(MockitoExtension.class)` for Mockito
- Use `@WebMvcTest` for controller tests (faster than full context)
- Verify mock interactions with `verify()`

### 3. Integration Tests
- Extend `AbstractIntegrationTest` for consistent TestContainers setup
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
    ├── AbstractIntegrationTest.java         # Base class for integration tests
    ├── controller/
    │   ├── UserControllerTest.java          # Unit test with mocks
    │   └── UserIntegrationIT.java           # Integration test with TestContainers
    ├── service/
    │   └── UserServiceTest.java             # Unit test with mocks
    └── repository/
        └── UserRepositoryIT.java            # Integration test with TestContainers
```

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

## Additional Resources
- [Spring Boot Testing Guide](https://spring.io/guides/gs/testing-web/)
- [TestContainers Documentation](https://testcontainers.com/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [AssertJ Documentation](https://assertj.github.io/doc/)

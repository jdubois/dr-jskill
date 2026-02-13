# Logging Best Practices for Spring Boot Applications

## Overview
This guide covers logging best practices for Spring Boot applications using Logback, the default and only recommended logging framework. Proper logging is essential for debugging, monitoring, and understanding application behavior in production.

## Why Logback?

Logback is the default logging implementation in Spring Boot and is the only framework we use:
- **Native support** in Spring Boot (no additional dependencies)
- **Better performance** than alternatives
- **Automatic configuration** with sensible defaults
- **Simple XML configuration**
- **Advanced features** like async logging and rolling file appenders

## Basic Configuration

### Application Properties

Start with simple property-based configuration:

```properties
# Root log level
logging.level.root=INFO

# Package-specific log levels
logging.level.com.example.app=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.hibernate.SQL=DEBUG

# Log file
logging.file.name=logs/application.log
logging.file.max-size=10MB
logging.file.max-history=30

# Console pattern
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %logger{36} - %msg%n

# File pattern
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n
```

### Log Levels

| Level | Usage | Example |
|-------|-------|---------|
| **ERROR** | Something went wrong, immediate attention needed | Database connection failed |
| **WARN** | Potentially harmful situation | API rate limit approaching |
| **INFO** | Important business events | Order created, User logged in |
| **DEBUG** | Detailed information for debugging | SQL queries, Method parameters |
| **TRACE** | Very detailed diagnostic information | Step-by-step processing |

## Using SLF4J with Logback

Always use **SLF4J** as the logging API:

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public User createUser(User user) {
        log.debug("Creating user: {}", user.getUsername());
        
        try {
            User saved = userRepository.save(user);
            log.info("User created successfully: id={}, username={}", 
                saved.getId(), saved.getUsername());
            return saved;
        } catch (Exception e) {
            log.error("Failed to create user: {}", user.getUsername(), e);
            throw new UserCreationException("Could not create user", e);
        }
    }
}
```

## Logging Best Practices

### 1. Use Parameterized Logging

**✅ Correct:**
```java
log.debug("User {} logged in from IP: {}", username, ipAddress);
log.info("Order {} processed in {}ms", orderId, duration);
```

**❌ Wrong:**
```java
log.debug("User " + username + " logged in from IP: " + ipAddress);
log.info("Order " + orderId + " processed in " + duration + "ms");
```

### 2. Never Log Sensitive Information

**❌ Never log:**
- Passwords or credentials
- Credit card numbers
- API keys or tokens
- Social security numbers
- Personal identifiable information (PII)

**✅ Always sanitize:**
```java
log.info("User logged in: username={}", user.getUsername());
log.debug("Credit card ending in: {}", creditCard.substring(12));
```

### 3. Include Context in Log Messages

**✅ Good:**
```java
log.info("Order processing started: orderId={}, customerId={}, items={}", 
    order.getId(), order.getCustomerId(), order.getItems().size());

log.error("Payment gateway timeout: orderId={}, gateway={}, amount={}", 
    orderId, gatewayName, amount, exception);
```

**❌ Poor:**
```java
log.info("Processing started");
log.error("Timeout occurred", exception);
```

### 4. Log Exceptions Properly

**✅ Correct:**
```java
try {
    processPayment(order);
} catch (PaymentException e) {
    log.error("Payment failed for order: {}", order.getId(), e);
    throw e;
}
```

**❌ Wrong:**
```java
log.error("Payment failed: " + e.getMessage()); // Lost stack trace!
log.error("Payment failed: {}", e.toString()); // Lost stack trace!
```

### 5. Don't Log and Throw

**❌ Wrong:**
```java
try {
    processOrder(order);
} catch (OrderException e) {
    log.error("Order processing failed", e); // Logged here
    throw e; // Will be logged again by caller
}
```

**✅ Correct - Log or throw, not both:**
```java
// Either log and handle
try {
    processOrder(order);
} catch (OrderException e) {
    log.error("Order processing failed: orderId={}", order.getId(), e);
    return ErrorResponse.of(e);
}

// Or just throw (let higher level log)
public void processOrder(Order order) throws OrderException {
    if (!isValid(order)) {
        throw new OrderException("Invalid order");
    }
}
```

### 6. Avoid Excessive Logging in Loops

**❌ Wrong:**
```java
for (Order order : orders) {
    log.debug("Processing order: {}", order.getId()); // Too many logs!
    process(order);
}
```

**✅ Better:**
```java
log.info("Starting batch processing: {} orders", orders.size());
for (Order order : orders) {
    process(order);
}
log.info("Batch processing completed: {} orders processed", orders.size());
```

## Logback XML Configuration

For more control, create `src/main/resources/logback-spring.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    
    <!-- Console Appender -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <!-- Rolling File Appender -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
    </appender>
    
    <!-- Application loggers -->
    <logger name="com.example.app" level="DEBUG"/>
    <logger name="org.springframework.web" level="INFO"/>
    <logger name="org.hibernate.SQL" level="DEBUG"/>
    
    <!-- Root logger -->
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
    
</configuration>
```

## Common Patterns

### REST Controller Logging

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @PostMapping
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        log.info("Creating user: username={}", user.getUsername());
        
        try {
            User created = userService.createUser(user);
            log.info("User created successfully: id={}", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (UserAlreadyExistsException e) {
            log.warn("User creation failed, username already exists: {}", user.getUsername());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error creating user: username={}", user.getUsername(), e);
            throw e;
        }
    }
}
```

### Service Layer Logging

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    
    private final PaymentGateway paymentGateway;
    private final OrderRepository orderRepository;
    
    public PaymentService(PaymentGateway paymentGateway, OrderRepository orderRepository) {
        this.paymentGateway = paymentGateway;
        this.orderRepository = orderRepository;
    }
    
    @Transactional
    public Payment processPayment(Order order) {
        log.info("Processing payment: orderId={}, amount={}", 
            order.getId(), order.getTotal());
        
        try {
            Payment payment = paymentGateway.charge(order);
            log.info("Payment successful: orderId={}, paymentId={}", 
                order.getId(), payment.getId());
            return payment;
        } catch (PaymentGatewayException e) {
            log.error("Payment gateway error: orderId={}, gateway={}, errorCode={}", 
                order.getId(), e.getGateway(), e.getErrorCode(), e);
            throw new PaymentProcessingException("Payment failed", e);
        }
    }
}
```

### Repository Logging

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Repository
public class CustomUserRepositoryImpl implements CustomUserRepository {
    private static final Logger log = LoggerFactory.getLogger(CustomUserRepositoryImpl.class);
    
    private final EntityManager entityManager;
    
    public CustomUserRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }
    
    @Override
    public List<User> findActiveUsersByRole(String role) {
        log.debug("Finding active users by role: {}", role);
        
        String jpql = "SELECT u FROM User u WHERE u.role = :role AND u.active = true";
        List<User> users = entityManager.createQuery(jpql, User.class)
            .setParameter("role", role)
            .getResultList();
        
        log.debug("Found {} active users with role: {}", users.size(), role);
        return users;
    }
}
```

## What to Log

### ✅ DO Log:

1. Application startup and shutdown
2. Business events: User registration, orders, payments
3. Authentication events: Login, logout, failed attempts
4. External API calls and responses
5. Configuration values at startup (excluding secrets)
6. Performance metrics: Slow operations, timeouts
7. State changes: Status updates, workflow transitions
8. Error conditions with full context
9. Security events: Authorization failures

### ❌ DON'T Log:

1. Passwords or credentials
2. Credit card numbers or PII
3. API keys or tokens
4. Session IDs
5. Large payloads or binary data
6. Every method entry/exit
7. Redundant information

## Performance Tips

### 1. Check Log Level for Expensive Operations

```java
if (log.isDebugEnabled()) {
    log.debug("Complex object: {}", expensiveToStringOperation(object));
}
```

### 2. Avoid Logging in Hot Paths

```java
// ❌ Bad
public int calculateSum(List<Integer> numbers) {
    log.debug("Calculating sum of {} numbers", numbers.size());
    return numbers.stream().mapToInt(Integer::intValue).sum();
}

// ✅ Good
public void processBatch(List<List<Integer>> batches) {
    log.info("Processing {} batches", batches.size());
    for (List<Integer> batch : batches) {
        int sum = calculateSum(batch);
        processBatchResult(sum);
    }
}
```

## Async Logging for High Performance

For high-throughput applications, use async appenders:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
    </appender>
    
    <!-- Async wrapper -->
    <appender name="ASYNC_FILE" class="ch.qos.logback.classic.AsyncAppender">
        <queueSize>512</queueSize>
        <discardingThreshold>0</discardingThreshold>
        <appender-ref ref="FILE"/>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="ASYNC_FILE"/>
    </root>
    
</configuration>
```

## Summary of Best Practices

1. ✅ Use **SLF4J** with **Logback** (Spring Boot default)
2. ✅ Use **parameterized logging** instead of concatenation
3. ✅ Use **appropriate log levels** (ERROR, WARN, INFO, DEBUG, TRACE)
4. ✅ **Never log sensitive data** (passwords, PII, credentials)
5. ✅ **Include context** in log messages (IDs, parameters)
6. ✅ **Log exceptions properly** (exception as last parameter)
7. ✅ **Don't log and throw** - log at one level only
8. ✅ **Avoid excessive logging** in loops and hot paths
9. ✅ Use **rolling file appenders** to manage disk space
10. ✅ Use **async appenders** for high-throughput applications
11. ✅ **Configure via properties** for simple needs, XML for complex
12. ✅ Always instantiate logger: `LoggerFactory.getLogger(ClassName.class)`

## Additional Resources

- [Logback Documentation](https://logback.qos.ch/documentation.html)
- [SLF4J Manual](http://www.slf4j.org/manual.html)
- [Spring Boot Logging Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.logging)

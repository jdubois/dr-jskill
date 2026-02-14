---
name: jdubois-skill
description: Creates Spring Boot projects following Julien Dubois' best practices. Generates Web applications, full-stack apps with Vue.js, PostgreSQL, REST APIs, and Docker configurations. Use when creating Spring Boot projects, setting up Java microservices, or building enterprise applications with the Spring Framework.
---

# Spring Boot skill that follows Julien Dubois' best practices.

## Overview
This agent skill helps you create Spring Boot projects following Julien Dubois' best practices. It provides tools and scripts to quickly bootstrap Spring Boot applications using https://start.spring.io

## Prerequisites

- Java 21 installed
- Node.js 22.x and NPM 10.x are installed (when doing front-end development)
- Docker is installed and running

## Capabilities
- Generate Spring Boot projects with predefined configurations
- Support for various Spring Boot versions and dependencies
- Follow best practices for project structure and configuration
- Quick setup scripts for common use cases
- Docker support for containerized deployments
- Front-end development with multiple framework options:
  - **Vue.js 3** (default) - Progressive framework with Composition API
  - **React 18** - Popular library for building user interfaces
  - **Angular 19** - Full-featured framework with TypeScript
  - **Vanilla JavaScript** - No framework, pure ES6+ with Vite

## Validation

Once the project is generated, this skill MUST:

- Validate that the project builds successfully with `./mvnw clean install`
- Validate that the application starts successfully with `./mvnw spring-boot:run`
- Validate that the application responds to HTTP requests (e.g. `curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`)
- Validate that the unit tests run successfully with `./mvnw test`
- Validate the the integration tests run successfully with `./mvnw verify` (if included)
- Valide that the front-end assets are correctly bundled and served (e.g. `curl http://localhost:8080/index.html` returns the HTML page)
- Validate that the Vue.js development server starts successfully with `npm run dev` (if included)
- Validate that the Docker images build successfully
- Validate that the GraalVM native image builds successfully with `./mvnw -Pnative native:compile`

## Usage

### Using the Scripts
This skill includes sample bash scripts in the `scripts/` directory that can be used to download pre-configured Spring Boot projects from start.spring.io.

### Latest Version Project ⭐
Use the `create-project-latest.sh` script to create a project with the **latest Spring Boot version** (automatically fetched):
```bash
./scripts/create-project-latest.sh my-app com.mycompany my-app com.mycompany.myapp 21 web
```

Project types available:
- `basic` - Minimal Spring Boot project
- `web` - Web application with REST API capabilities
- `fullstack` - Complete application with database and security

### Basic Spring Boot Project
Use the `create-basic-project.sh` script to create a basic Spring Boot project with essential dependencies:
```bash
./scripts/create-basic-project.sh
```

### Web Application
Use the `create-web-project.sh` script to create a Spring Boot web application with web dependencies:
```bash
./scripts/create-web-project.sh
```

### Full-Stack Application
Use the `create-fullstack-project.sh` script to create a comprehensive Spring Boot application with database, security, and web dependencies:
```bash
./scripts/create-fullstack-project.sh
```

## Best Practices
- Use the latest Spring Boot version for new projects (currently 4.x)
- Use the `create-project-latest.sh` script to automatically get the latest version
- **Spring Boot 4 changes**: See [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) for key differences from Spring Boot 3
- Use Spring Boot Actuator for production-ready features
- Use Spring Data JPA for database access
- Use PostgreSQL for database (see [Database Best Practices](references/DATABASE.md) for optimization)
- Use `spring-boot-docker-compose` for automatic database startup during development
- Follow RESTful API design principles
- Use proper logging with Logback (see [Logging Best Practices](references/LOGGING.md))
- Use Maven for dependency management
- Add Spring Boot DevTools
- Use Docker for containerized deployments
- Configure GraalVM native image support

## Critical Spring Boot 4 Considerations

When generating or modifying Spring Boot 4 applications, **ALWAYS** verify:

### 1. Jackson 3 Annotations (Common Mistake!)
**✅ CORRECT - Annotations stay in `com.fasterxml.jackson.annotation` package:**
```java
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonFormat;
```

**❌ WRONG - Do NOT use `tools.jackson.annotation`:**
```java
import tools.jackson.annotation.JsonProperty;  // This package doesn't exist!
```

**Only Jackson API classes change to `tools.jackson`:**
```java
import tools.jackson.databind.ObjectMapper;  // ✅ Correct for API classes
```

See [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) for complete Jackson 3 details.

### 2. TestcontainersConfiguration Must Be Package-Private
**✅ CORRECT - Package-private (no `public` modifier):**
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {  // No public!
    // ...
}
```

**❌ WRONG - Public modifier:**
```java
public class TestcontainersConfiguration {  // Wrong!
    // ...
}
```

See [Testing Best Practices](references/TEST.md) for complete TestContainers patterns.

## Project Structure

The service layer is only included if it adds value (e.g. complex business logic). For simple CRUD applications, the controller can directly call the repository.

Generated projects follow the following recommended structure:
```plaintext
my-spring-boot-app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── Application.java
│   │   │       ├── config/
│   │   │       ├── controller/
│   │   │       ├── service/         # Only included if needed
│   │   │       ├── repository/
│   │   │       └── domain/
│   │   └── resources/
│   │       ├── static/              # Front-end web assets (HTML, CSS, JS)
│   │       │   ├── index.html
│   │       │   ├── css/
│   │       │   │   └── styles.css
│   │       │   ├── js/
│   │       │   │   └── app.js
│   │       │   └── images/
│   │       └── application.properties
│   └── test/
│       └── java/
│           └── com/example/app/
│               ├── config/
│               ├── controller/
│               ├── service/         # Only included if needed
│               ├── repository/
│               └── domain/
├── Dockerfile                   # Standard JVM Docker build
├── Dockerfile-native            # GraalVM native image build
├── docker-compose.yml           # Full stack with PostgreSQL
├── docker-compose-native.yml    # Native image with PostgreSQL
├── pom.xml
└── README.md
```

## Dependencies
Common dependencies included in generated projects:
- Spring Web (for REST APIs)
- Spring Data JPA (for database access)
- Spring Boot Actuator (for monitoring)
- Spring Boot DevTools (for development productivity)
- PostgreSQL Driver (for database)
- Validation (for bean validation)
- Spring Boot Docker Compose (for automatic PostgreSQL startup during development)
- Spring Boot Test Starter (for testing with JUnit 5 and Mockito)
- TestContainers (for integration tests with PostgreSQL)

## Configuration

### Application Properties
Properties files are favored over YAML configuration files.

```properties
# Server configuration
server.port=8080

# Database configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=user
spring.datasource.password=password

# JPA configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# Actuator configuration
management.endpoints.web.exposure.include=health,info,metrics
```

**For advanced database configuration and performance optimization**, see the [Database Best Practices Guide](references/DATABASE.md). It covers connection pooling, query optimization, transaction management, locking strategies, and PostgreSQL-specific optimizations based on Vlad Mihalcea's best practices.

## Automatic Docker Compose Support

For full-stack applications with databases, the `spring-boot-docker-compose` dependency is included to automatically start PostgreSQL during development.

### How It Works

When you run `./mvnw spring-boot:run`, Spring Boot will:
1. Detect the `compose.yaml` or `docker-compose.yml` file in your project root
2. Automatically start the PostgreSQL container defined in the compose file
3. Configure the datasource connection automatically
4. Stop the container when the application shuts down

### Setup

Create a `compose.yaml` file in your project root (or copy from `assets/compose.yaml`):

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
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Usage

```bash
# Just run your application - PostgreSQL starts automatically!
./mvnw spring-boot:run
```

**No manual `docker compose up` needed!** Spring Boot handles container lifecycle automatically during development.

### Configuration
You can disable automatic startup if needed:

```properties
# Disable Docker Compose support
spring.docker.compose.enabled=false

# Keep containers running after application stops (useful for debugging)
spring.docker.compose.lifecycle-management=start-only
```

## Testing
For comprehensive testing best practices, see the [Testing Guide](references/TEST.md).

Key highlights:
- Unit tests with Mockito for isolated component testing
- `@WebMvcTest` for controller unit tests
- Integration tests with TestContainers for PostgreSQL
- REST API integration tests with real database
- Given-When-Then test structure
- AssertJ for fluent assertions

## Front-End Development

This skill supports multiple front-end framework options. Choose the one that best fits your project requirements:

### Vue.js (Default) ⭐
For detailed instructions, see the [Vue.js Development Guide](references/VUE.md).

Key highlights:
- Vue.js 3 with Composition API
- Vite for development server with hot reload
- Pinia for state management
- Vue Router for SPA routing
- Bootstrap 5.3+ for responsive design
- Production builds minified and bundled into Spring Boot JAR

### React
For detailed instructions, see the [React Development Guide](references/REACT.md).

Key highlights:
- React 18 with hooks and functional components
- Vite for fast development with hot reload
- Custom hooks for reusable logic
- React Router for navigation
- Bootstrap 5.3+ for responsive design
- Production builds optimized and bundled into Spring Boot JAR

### Angular
For detailed instructions, see the [Angular Development Guide](references/ANGULAR.md).

Key highlights:
- Angular 19 with standalone components
- Angular CLI for development and build tooling
- TypeScript by default for type safety
- RxJS for reactive programming
- Angular Router for navigation
- Bootstrap 5.3+ for responsive design
- Production builds optimized and bundled into Spring Boot JAR

### Vanilla JavaScript
For detailed instructions, see the [Vanilla JS Development Guide](references/VANILLA-JS.md).

Key highlights:
- No framework - pure ES6+ JavaScript
- Vite for modern development experience
- Custom client-side routing
- Minimal dependencies and bundle size
- Bootstrap 5.3+ for responsive design
- Production builds minified and bundled into Spring Boot JAR

**All front-end options include:**
- Hot reload during development
- RESTful API integration patterns
- Bootstrap 5.3+ for responsive UI
- Automatic build and bundle into Spring Boot JAR
- SPA routing with HTML5 history mode
- CORS configuration for development

## Docker Deployment
For comprehensive Docker deployment instructions, see the [Docker Guide](references/DOCKER.md).

Key highlights:
- Automatic PostgreSQL startup during development with `spring-boot-docker-compose`
- Standard JVM deployment with `Dockerfile`
- GraalVM native images with `Dockerfile-native`
- PostgreSQL integration with `docker-compose.yml`

### Development Mode (Automatic)
```bash
# PostgreSQL starts automatically with your app
./mvnw spring-boot:run
```

### Production Deployment
```bash
# Standard deployment
docker compose up -d

# Native image deployment (faster startup)
docker compose -f docker-compose-native.yml up -d
```

## GraalVM Native Support
Project is configured to support GraalVM.

Build native image locally:
```bash
./mvnw -Pnative native:compile
```

## Deploying in production to Azure

For deploying in production to Azure, see the [Azure Deployment Guide](references/AZURE.md).

Key highlights:

- Use Azure Container Apps for containerized deployments
- Use Azure Database for PostgreSQL for managed database service if needed
- Uses the Azure CLI for deployment and management

## Additional Resources
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Initializr](https://start.spring.io)
- [Julien Dubois on GitHub](https://github.com/jdubois)
- [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) (included in this skill - Key changes from Spring Boot 3)
- [Database Best Practices](references/DATABASE.md) (included in this skill - PostgreSQL and Hibernate optimization)
- [Logging Best Practices](references/LOGGING.md) (included in this skill - Logback configuration and patterns)
- [Testing Guide](references/TEST.md) (included in this skill - Unit and integration testing with TestContainers)
- Front-End Development Guides (included in this skill):
  - [Vue.js Development Guide](references/VUE.md) (default - Vue.js 3 with Vite)
  - [React Development Guide](references/REACT.md) (React 18 with Vite)
  - [Angular Development Guide](references/ANGULAR.md) (Angular 19 with Angular CLI)
  - [Vanilla JS Development Guide](references/VANILLA-JS.md) (Pure ES6+ with Vite)
- [Docker Deployment Guide](references/DOCKER.md) (included in this skill)
- [GraalVM Documentation](https://www.graalvm.org/)
- [Spring Native Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [TestContainers Documentation](https://testcontainers.com/)
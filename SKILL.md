---
name: jdubois-skill
description: Creates Spring Boot projects following Julien Dubois' best practices. Generates Web applications, full-stack apps with Vue.js, PostgreSQL, REST APIs, and Docker configurations. Use when creating Spring Boot projects, setting up Java microservices, or building enterprise applications with the Spring Framework.
---

# Spring Boot skill that follows Julien Dubois' best practices.

## Overview
This agent skill helps you create Spring Boot projects following [Julien Dubois](https://www.julien-dubois.com)' best practices. It provides tools and scripts to quickly bootstrap Spring Boot applications using [https://start.spring.io](https://start.spring.io).

## Prerequisites

1. Java 21 installed
2. Node.js 22.x and NPM 10.x (for front-end development)
3. Docker installed and running

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

When creating Spring Boot projects:

1. Use the latest Spring Boot version (currently 4.x) - the `create-project-latest.sh` script automatically fetches it
2. **Review Spring Boot 4 critical considerations**: See [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) for Jackson 3 annotations and TestContainers configuration
3. Include Spring Boot Actuator for production-ready features
4. Use Spring Data JPA for database access
5. Use PostgreSQL for database - see [Database Best Practices](references/DATABASE.md) for optimization
6. Use properties files for configuration - see [Configuration Best Practices](references/CONFIGURATION.md)
7. Use `spring-boot-docker-compose` for automatic database startup during development - see [Docker Guide](references/DOCKER.md)
8. Follow RESTful API design principles
9. Configure proper logging with Logback - see [Logging Best Practices](references/LOGGING.md)
10. Use Maven for dependency management
11. Include Spring Boot DevTools for development productivity
12. Add Spring Security only when needed - see [Security Guide](references/SECURITY.md) for best practices
13. Configure Docker for containerized deployments - see [Docker Guide](references/DOCKER.md)
14. Enable GraalVM native image support for faster startup - see [GraalVM Guide](references/GRAALVM.md)

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

1. Spring Web - REST APIs
2. Spring Data JPA - Database access
3. Spring Boot Actuator - Monitoring and health checks
4. Spring Boot DevTools - Development productivity
5. PostgreSQL Driver - Database connectivity
6. Validation - Bean validation
7. Spring Boot Docker Compose - Automatic PostgreSQL startup during development
8. Spring Boot Test Starter - Testing with JUnit 5 and Mockito
9. TestContainers - Integration tests with PostgreSQL

## Configuration

For comprehensive configuration best practices, see the [Configuration Guide](references/CONFIGURATION.md).

**Key Principles:**

1. **Use Properties Files** (not YAML) for better IDE support and readability
2. **Externalize Configuration** with environment variables for portability
3. **Never Commit Secrets** to version control
4. **Use Profiles** for environment-specific settings (dev, test, prod)
5. **Type-Safe Configuration** with `@ConfigurationProperties` classes

### Application Properties

Basic configuration example:

```properties
# Server configuration
server.port=8080

# Database configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=user
spring.datasource.password=${DATABASE_PASSWORD}

# JPA configuration
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# Actuator configuration
management.endpoints.web.exposure.include=health,info,metrics
```

**See the [Configuration Guide](references/CONFIGURATION.md) for:**
- Profile-specific properties files
- Environment variable management
- Secrets management (local and production)
- Type-safe `@ConfigurationProperties` classes
- Common configuration patterns
- Testing configuration

**For database configuration and performance optimization**, see the [Database Best Practices Guide](references/DATABASE.md).

## Security (Optional)

Spring Security is **optional** - only add it when you need authentication and authorization.

For complete security implementation guide, see the [Security Guide](references/SECURITY.md).

**When to Add Spring Security:**

✅ Add when you need:
- User authentication (login/logout)
- API authentication (JWT, OAuth2)
- Role-based access control
- Protection against common vulnerabilities

❌ Don't add if:
- Building a simple public API
- Creating a prototype
- No authentication requirements

**See the [Security Guide](references/SECURITY.md) for:**
- Basic security configuration with Spring Boot 4
- Database-backed user authentication
- JWT authentication for REST APIs
- OAuth2 and social login
- Role-based authorization with `@PreAuthorize`
- CORS configuration
- Security best practices and testing

## Development with Docker Compose

For full-stack applications with databases, Spring Boot 4 can automatically manage Docker containers during development. Simply run `./mvnw spring-boot:run` and PostgreSQL starts automatically - no manual `docker compose up` needed!

**For complete setup and configuration**, see the [Docker Guide](references/DOCKER.md) section on "Development with Automatic Docker Compose Support".

## Testing

For comprehensive testing best practices, see the [Testing Guide](references/TEST.md).

Key features:

1. Unit tests with Mockito for isolated component testing
2. `@WebMvcTest` for controller unit tests
3. Integration tests with TestContainers for PostgreSQL
4. REST API integration tests with real database
5. Given-When-Then test structure
6. AssertJ for fluent assertions

## Front-End Development

This skill supports multiple front-end framework options. Choose the one that best fits your project requirements:

### Vue.js (Default) ⭐

For detailed instructions, see the [Vue.js Development Guide](references/VUE.md).

Key features:

- Vue.js 3 with Composition API
- Vite for development server with hot reload
- Pinia for state management
- Vue Router for SPA routing
- Bootstrap 5.3+ for responsive design
- Production builds minified and bundled into Spring Boot JAR

### React

For detailed instructions, see the [React Development Guide](references/REACT.md).

Key features:

- React 18 with hooks and functional components
- Vite for fast development with hot reload
- Custom hooks for reusable logic
- React Router for navigation
- Bootstrap 5.3+ for responsive design
- Production builds optimized and bundled into Spring Boot JAR

### Angular

For detailed instructions, see the [Angular Development Guide](references/ANGULAR.md).

Key features:

- Angular 19 with standalone components
- Angular CLI for development and build tooling
- TypeScript by default for type safety
- RxJS for reactive programming
- Angular Router for navigation
- Bootstrap 5.3+ for responsive design
- Production builds optimized and bundled into Spring Boot JAR

### Vanilla JavaScript

For detailed instructions, see the [Vanilla JS Development Guide](references/VANILLA-JS.md).

Key features:

- No framework - pure ES6+ JavaScript
- Vite for modern development experience
- Custom client-side routing
- Minimal dependencies and bundle size
- Bootstrap 5.3+ for responsive design
- Production builds minified and bundled into Spring Boot JAR

**All front-end options include:**

1. Hot reload during development
2. RESTful API integration patterns
3. Bootstrap 5.3+ for responsive UI
4. Automatic build and bundle into Spring Boot JAR
5. SPA routing with HTML5 history mode
6. CORS configuration for development

## Docker Deployment

For comprehensive Docker deployment instructions, see the [Docker Guide](references/DOCKER.md).

**Key Features:**

1. Automatic PostgreSQL startup during development with `spring-boot-docker-compose`
2. Standard JVM deployment with `Dockerfile`
3. GraalVM native images with `Dockerfile-native`
4. PostgreSQL integration with `docker-compose.yml`

### Development Mode (Automatic)
```bash
# PostgreSQL starts automatically with your app
./mvnw spring-boot:run
```

### Production Deployment
```bash
# Standard JVM deployment
docker compose up -d

# Native image deployment (faster startup)
docker compose -f docker-compose-native.yml up -d
```

**See the [Docker Guide](references/DOCKER.md) for:**
- Automatic Docker Compose support in development
- Multi-stage Dockerfile best practices
- Docker Compose configuration for full-stack apps
- Health checks and monitoring
- Production deployment patterns

## GraalVM Native Images

For comprehensive GraalVM native image instructions, see the [GraalVM Guide](references/GRAALVM.md).

### Building with Docker (Recommended)

```bash
# Build native image with Docker
docker build -f Dockerfile-native -t myapp-native:latest .

# Run the native image
docker run -p 8080:8080 myapp-native:latest

# Or use Docker Compose
docker compose -f docker-compose-native.yml up -d
```

### Building Locally (Optional)

```bash
# Requires GraalVM 25+ installed locally
./mvnw -Pnative native:compile

# Run the native executable
./target/myapp-exec
```

**See the [GraalVM Guide](references/GRAALVM.md) for:**
- Docker-based native builds (no local GraalVM needed)
- Multi-stage Dockerfile for native images
- Spring Boot native configuration
- Runtime hints for reflection and resources
- Performance characteristics and trade-offs
- Testing and troubleshooting native images
- CI/CD integration examples

## Azure Deployment

For production deployment to Azure, see the [Azure Deployment Guide](references/AZURE.md).

Key features:

1. Azure Container Apps for containerized deployments
2. Azure Database for PostgreSQL for managed database service
3. Azure CLI for deployment and management

## Validation

Once the project is generated, this skill MUST validate that:

1. The project builds successfully with `./mvnw clean install`
2. The application starts successfully with `./mvnw spring-boot:run`
3. The application responds to HTTP requests (e.g. `curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`)
4. The unit tests run successfully with `./mvnw test`
5. The integration tests run successfully with `./mvnw verify` (if included)
6. The front-end assets are correctly bundled and served (e.g. `curl http://localhost:8080/index.html` returns the HTML page)
7. The Vue.js development server starts successfully with `npm run dev` (if included)
8. The Docker images build successfully
9. The GraalVM native image builds successfully with `./mvnw -Pnative native:compile`
10. The Docker native image builds successfully with `docker build -f Dockerfile-native`

Once the project is generated, go through the steps above to ensure that the generated project is fully functional and follows best practices. If any validation step fails, try to identify the issue and fix it before proceeding. This ensures that the generated project is of high quality and ready for development.

## Additional Resources

### External Documentation
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Initializr](https://start.spring.io)
- [Julien Dubois](https://www.julien-dubois.com)
- [Julien Dubois on GitHub](https://github.com/jdubois)
- [GraalVM Documentation](https://www.graalvm.org/)
- [Spring Native Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [TestContainers Documentation](https://testcontainers.com/)
- [Spring Security Documentation](https://docs.spring.io/spring-security/reference/)

### Included Reference Guides

**Core Spring Boot:**
- [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) - Key changes from Spring Boot 3, Jackson 3 annotations
- [Configuration Best Practices](references/CONFIGURATION.md) - Properties files, profiles, secrets management
- [Logging Best Practices](references/LOGGING.md) - Logback configuration and patterns

**Data and Persistence:**
- [Database Best Practices](references/DATABASE.md) - PostgreSQL and Hibernate optimization

**Security (Optional):**
- [Security Guide](references/SECURITY.md) - Spring Security, JWT, OAuth2, authentication patterns

**Testing:**
- [Testing Guide](references/TEST.md) - Unit and integration testing with TestContainers

**Front-End Development:**
- [Vue.js Development Guide](references/VUE.md) - Vue.js 3 with Vite (default)
- [React Development Guide](references/REACT.md) - React 18 with Vite
- [Angular Development Guide](references/ANGULAR.md) - Angular 19 with Angular CLI
- [Vanilla JS Development Guide](references/VANILLA-JS.md) - Pure ES6+ with Vite

**Deployment:**
- [Docker Deployment Guide](references/DOCKER.md) - Docker, Docker Compose, development automation
- [GraalVM Native Images Guide](references/GRAALVM.md) - Docker-based native builds, optimization
- [Azure Deployment Guide](references/AZURE.md) - Azure Container Apps, Azure Database for PostgreSQL
---
name: jdubois-skill
description: Creates Spring Boot projects following Julien Dubois' best practices. Generates Web applications, full-stack apps with Vue.js, PostgreSQL, REST APIs, and Docker configurations. Use when creating Spring Boot projects, setting up Java microservices, or building enterprise applications with the Spring Framework.
---

# Spring Boot skill that follows Julien Dubois' best practices.

## Overview
This agent skill helps you create Spring Boot projects following Julien Dubois' best practices. It provides tools and scripts to quickly bootstrap Spring Boot applications using https://start.spring.io

## Prerequisites

- Java 25 installed
- Node.js and NPM are installed (when doing front-end development)
- Docker is installed and running

## Capabilities
- Generate Spring Boot projects with predefined configurations
- Support for various Spring Boot versions and dependencies
- Follow best practices for project structure and configuration
- Quick setup scripts for common use cases
- Docker support for containerized deployments
- Front-end development with Vue.js 3 and Vite when needed

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
./scripts/create-project-latest.sh my-app com.mycompany my-app com.mycompany.myapp 25 web
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

## Project Structure

The service layer is only included if it adds value (e.g. complex business logic). For simple CRUD applications, the controller can directly call the repository.

Generated projects follow the following recommended structure:
```
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
│               └── domain/├── Dockerfile                   # Standard JVM Docker build
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
For detailed instructions on creating front-end applications with Vue.js 3 and Vite, see the [Front-End Development Guide](references/FRONT-END.md).

Key highlights:
- Vue.js 3 with Composition API
- Vite for development server with hot reload
- Production builds minified and bundled into Spring Boot JAR
- Pinia for state management
- Vue Router for SPA routing
- Bootstrap 5.3+ for responsive design
- RESTful API integration patterns

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

## Additional Resources
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Initializr](https://start.spring.io)
- [Julien Dubois on GitHub](https://github.com/jdubois)
- [Database Best Practices](references/DATABASE.md) (included in this skill - PostgreSQL and Hibernate optimization)
- [Logging Best Practices](references/LOGGING.md) (included in this skill - Logback configuration and patterns)
- [Testing Guide](references/TEST.md) (included in this skill)
- [Front-End Development Guide](references/FRONT-END.md) (included in this skill)
- [Docker Deployment Guide](references/DOCKER.md) (included in this skill)
- [GraalVM Documentation](https://www.graalvm.org/)
- [Spring Native Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [TestContainers Documentation](https://testcontainers.com/)

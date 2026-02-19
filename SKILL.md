---
name: dr-jskill
description: "Creates Java + Spring Boot projects: Web applications, full-stack apps with Vue.js or Angular or React or vanilla JS, PostgreSQL, REST APIs, and Docker. Use when creating Spring Boot projects, setting up Java microservices, or building enterprise applications with the Spring Framework."
---

# Spring Boot skill that follows Julien Dubois' best practices.

## Overview
This agent skill helps you create Spring Boot projects following [Julien Dubois](https://www.julien-dubois.com)' best practices. It provides tools and scripts to quickly bootstrap Spring Boot applications using [https://start.spring.io](https://start.spring.io).

## Version Management

Centralized versions live in `versions.json`. All scripts read from it via `scripts/lib/versions.mjs` (JavaScript). Update this file to bump Java, Spring Boot fallback, Postgres, Node/npm, Testcontainers, etc.

## Prerequisites

1. Java 25 installed
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
This skill includes cross-platform JavaScript (Node.js) scripts in the `scripts/` directory that can be used to download pre-configured Spring Boot projects from start.spring.io. They work on Linux, macOS, and Windows.

**Unified launcher (cross-platform):**
```bash
node scripts/create-project my-app com.myco my-app com.myco.myapp 21 fullstack
```

**Direct invocation:**
```bash
node scripts/create-project-latest.mjs my-app com.myco my-app com.myco.myapp 21 fullstack
```

Flags supported:
- `--boot-version <x.y.z>` / `-BootVersion`: override Spring Boot version
- `--project-type basic|web|fullstack` / `-ProjectType`

> Tip: The `create-project-latest` script auto-resolves preferred Boot 4.x and falls back to the configured `springBootFallback` if 4.x is not yet available. Override with `--boot-version` if needed.

### Latest Version Project ⭐
Use the `create-project-latest.mjs` script to create a project with the **latest Spring Boot version** (automatically fetched):
```bash
node scripts/create-project-latest.mjs my-app com.mycompany my-app com.mycompany.myapp 21 web
```

Project types available:
- `basic` - Minimal Spring Boot project
- `web` - Web application with REST API capabilities
- `fullstack` - Complete application with database and security

### Basic Spring Boot Project
Use the `create-basic-project.mjs` script to create a basic Spring Boot project with essential dependencies:
```bash
node scripts/create-basic-project.mjs
```

### Web Application
Use the `create-web-project.mjs` script to create a Spring Boot web application with web dependencies:
```bash
node scripts/create-web-project.mjs
```

### Full-Stack Application
Use the `create-fullstack-project.mjs` script to create a comprehensive Spring Boot application with database, security, and web dependencies:
```bash
node scripts/create-fullstack-project.mjs
```

## Best Practices

When creating Spring Boot projects:

1. Use the latest Spring Boot version (currently 4.x) - the `create-project-latest.mjs` script automatically fetches it
2. **Review Spring Boot 4 critical considerations**: See [Spring Boot 4 Migration Guide](references/SPRING-BOOT-4.md) for Jackson 3 annotations and TestContainers configuration
3. Include Spring Boot Actuator for production-ready features
4. Use Spring Data JPA for database access
5. Use PostgreSQL for database - see [Database Best Practices](references/DATABASE.md) for optimization
6. Use properties files for configuration - see [Configuration Best Practices](references/CONFIGURATION.md)
7. Set up foundational dotfiles: `.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.dockerignore`, optional `.vscode/`, `.devcontainer/` - see [Project Setup & Dotfiles](references/PROJECT-SETUP.md)
8. Use `spring-boot-docker-compose` for automatic database startup during development - see [Docker Guide](references/DOCKER.md)
9. Follow RESTful API design principles
10. Configure proper logging with Logback - see [Logging Best Practices](references/LOGGING.md)
11. Use Maven for dependency management
12. Include Spring Boot DevTools for development productivity
13. Add Spring Security only when needed - see [Security Guide](references/SECURITY.md) for best practices
14. Configure Docker for containerized deployments - see [Docker Guide](references/DOCKER.md)
15. Enable GraalVM native image support for faster startup - see [GraalVM Guide](references/GRAALVM.md)
16. The user must review changes before they are committed to git. Ask the user before initializing a Git repository, or running git commands.

## Project Structure

The service layer is only included if it adds value (e.g. complex business logic). For simple CRUD applications, the controller can directly call the repository.

Generated projects follow the following recommended structure:
```plaintext
my-spring-boot-app/
├── .gitignore                 # Java + front-end + secrets (see references/PROJECT-SETUP.md)
├── .env.sample                # Template for local env vars; .env is gitignored
├── .editorconfig              # Consistent formatting across IDEs
├── .gitattributes             # Normalize line endings, better diffs
├── .dockerignore              # Slim Docker build contexts
├── .vscode/                   # Optional editor recommendations
│   ├── extensions.json
│   └── settings.json
├── .devcontainer/             # Optional Dev Container (Java 25 + Node 22 + PostgreSQL)
│   ├── devcontainer.json
│   └── docker-compose.yml
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
├── compose.yaml                 # Dev database (spring-boot-docker-compose)
├── docker-compose.yml           # Full stack with PostgreSQL
├── docker-compose-native.yml    # Native image with PostgreSQL
├── pom.xml
└── README.md
```

## Dependencies

Generated projects include: Spring Web, Spring Data JPA, Spring Boot Actuator, DevTools, PostgreSQL, Validation, Docker Compose support, Test Starter with JUnit 5, and TestContainers.

## Configuration

Use `.properties` files (not YAML), externalize secrets via environment variables, and leverage `@ConfigurationProperties` for type safety. See the [Configuration Guide](references/CONFIGURATION.md) for profiles, secrets management, and common patterns.

**For database optimization**, see the [Database Best Practices Guide](references/DATABASE.md).

## Security (Optional)

Spring Security is **optional** - only add it when you need authentication or authorization. See the [Security Guide](references/SECURITY.md) for JWT, OAuth2, role-based access, and CORS configuration.

## Testing

See the [Testing Guide](references/TEST.md) for unit tests (Mockito, `@WebMvcTest`), integration tests (TestContainers + `@ServiceConnection`), and Given-When-Then patterns with AssertJ.

## Front-End Development

Choose a front-end framework:

- **Vue.js 3** (default) ⭐ → [Vue.js Guide](references/VUE.md)
- **React 18** → [React Guide](references/REACT.md)
- **Angular 19** → [Angular Guide](references/ANGULAR.md)
- **Vanilla JavaScript** (no framework) → [Vanilla JS Guide](references/VANILLA-JS.md)

All options include: Vite/CLI dev server with hot reload, Bootstrap 5.3+, SPA routing, and automatic build into the Spring Boot JAR.

## Docker Deployment

Spring Boot automatically manages Docker containers during development via `spring-boot-docker-compose`. For production, use the provided `Dockerfile` (JVM) or `Dockerfile-native` (GraalVM). See the [Docker Guide](references/DOCKER.md) for full setup, health checks, and deployment patterns.

## GraalVM Native Images

Build native images via Docker (no local GraalVM needed) or locally with `./mvnw native:compile`. See the [GraalVM Guide](references/GRAALVM.md) for configuration, runtime hints, testing, and CI/CD integration.

## Azure Deployment

Deploy to Azure Container Apps with Azure Database for PostgreSQL. See the [Azure Deployment Guide](references/AZURE.md).

## Validation

| # | What | Command |
|---|------|---------|
| 1 | Build backend | `./mvnw clean install` |
| 2 | Unit tests | `./mvnw test` |
| 3 | Integration tests | `./mvnw verify` (uses Testcontainers 2 + `@ServiceConnection`) |
| 4 | Front-end dev server | `cd frontend && npm run dev` |

> Run validation steps first. If anything fails, fix before proceeding.

Once the project is generated, go through the steps above to ensure that the generated project is fully functional and follows best practices. If any validation step fails, try to identify the issue and fix it before proceeding. This ensures that the generated project is of high quality and ready for development.

## Additional Resources

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

**Project Setup:**
- [Project Setup & Dotfiles](references/PROJECT-SETUP.md) - `.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.dockerignore`, `.devcontainer/`

**Deployment:**
- [Docker Deployment Guide](references/DOCKER.md) - Docker, Docker Compose, development automation
- [GraalVM Native Images Guide](references/GRAALVM.md) - Docker-based native builds, optimization
- [Azure Deployment Guide](references/AZURE.md) - Azure Container Apps, Azure Database for PostgreSQL
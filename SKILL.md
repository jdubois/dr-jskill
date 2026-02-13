---
name: jdubois-skill
description: Creates Spring Boot projects following Julien Dubois' best practices. Generates web applications, full-stack apps with PostgreSQL, REST APIs, and Docker configurations. Use when creating Spring Boot projects, setting up Java microservices, or building enterprise applications with Spring Framework.
---

# Spring Boot skill that follows Julien Dubois' best practices.

## Overview
This agent skill helps you create Spring Boot projects following Julien Dubois' best practices. It provides tools and scripts to quickly bootstrap Spring Boot applications using start.spring.io.

## Capabilities
- Generate Spring Boot projects with predefined configurations
- Support for various Spring Boot versions and dependencies
- Follow best practices for project structure and configuration
- Quick setup scripts for common use cases

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
- Use PostgreSQL for database
- Follow RESTful API design principles
- Include proper logging configuration
- Use Maven for dependency management
- Add Spring Boot DevTools
- Use Docker for containerized deployments
- Configure GraalVM native image support

## Project Structure

The service layer is only included if it adds value (e.g. complex business logic). For simple CRUD applications, the controller can directly call the repository.

DTO classes are only included if there is a need to separate the API model from the domain model. For simple applications, the domain entities can be used directly in the controllers.

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

## Front-End Development
For detailed instructions on creating front-end websites with vanilla JavaScript and Bootstrap, see the [Front-End Development Guide](references/FRONT-END.md).

Key highlights:
- Static resources placed in `src/main/resources/static/`
- Vanilla JavaScript (no frameworks) with ES6+ features
- Bootstrap for responsive design
- RESTful API integration patterns

## Docker Deployment
For comprehensive Docker deployment instructions, see the [Docker Guide](references/DOCKER.md).

Key highlights:
- Standard JVM deployment with `Dockerfile`
- GraalVM native images with `Dockerfile-native`
- PostgreSQL integration with `docker-compose.yml`

### Quick Start with Docker
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
- [Front-End Development Guide](references/FRONT-END.md) (included in this skill)
- [Docker Deployment Guide](references/DOCKER.md) (included in this skill)
- [GraalVM Documentation](https://www.graalvm.org/)
- [Spring Native Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)

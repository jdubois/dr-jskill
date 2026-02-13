# Spring Boot Project Creation Skill

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
- Use Spring Boot 3.x for new projects
- Include Spring Boot Actuator for production-ready features
- Use Spring Data JPA for database access
- Implement proper security with Spring Security
- Follow RESTful API design principles
- Include proper logging configuration
- Use profiles for environment-specific configurations

## Project Structure
Generated projects follow this recommended structure:
```
my-spring-boot-app/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/app/
│   │   │       ├── Application.java
│   │   │       ├── config/
│   │   │       ├── controller/
│   │   │       ├── service/
│   │   │       ├── repository/
│   │   │       └── domain/
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── application-dev.properties
│   │       └── application-prod.properties
│   └── test/
│       └── java/
│           └── com/example/app/
├── pom.xml (or build.gradle)
└── README.md
```

## Dependencies
Common dependencies included in generated projects:
- Spring Web (for REST APIs)
- Spring Data JPA (for database access)
- Spring Security (for authentication and authorization)
- Spring Boot Actuator (for monitoring)
- H2 Database (for development)
- PostgreSQL Driver (for production)

## Configuration Examples

### Application Properties
```properties
# Server configuration
server.port=8080

# Database configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=user
spring.datasource.password=password

# JPA configuration
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# Actuator configuration
management.endpoints.web.exposure.include=health,info,metrics
```

## Additional Resources
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Initializr](https://start.spring.io)
- [Julien Dubois on GitHub](https://github.com/jdubois)

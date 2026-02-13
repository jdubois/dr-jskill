# jdubois-skill

Agent skill that follows Julien Dubois' best practices for Spring Boot development.

## Overview

This skill provides tools, scripts, and templates for creating Spring Boot applications following modern best practices and conventions.

## Features

### Project Generation
- **Automated project creation** from start.spring.io
- **Latest Spring Boot version** (currently 4.x) automatically detected
- **Java 25** as the default version
- **Maven-based** projects (no Gradle)
- Multiple project templates: basic, web, and fullstack

### Technology Stack
- Spring Boot 4.x
- Java 25
- PostgreSQL database
- Spring Web for REST APIs
- Spring Data JPA for database access
- Spring Boot Actuator for monitoring
- Spring Boot DevTools for development productivity
- Bootstrap for front-end

### Docker Support
- Standard JVM deployments with `Dockerfile`
- GraalVM native images with `Dockerfile-native`
- Complete stack with `docker-compose.yml`
- PostgreSQL database integration
- Multi-stage builds for optimized images

### Front-End Development
- Vanilla JavaScript (no frameworks)
- Bootstrap for responsive design
- Modern ES6+ patterns
- RESTful API integration
- Standard Spring Boot static resource structure

## Quick Start

```bash
# Create a new project with the latest Spring Boot version
./scripts/create-project-latest.sh my-app com.mycompany my-app com.mycompany.app 25 web

# Navigate to your project
cd my-app

# Run with Maven
./mvnw spring-boot:run

# Or run with Docker
docker compose up -d
```

## Documentation

- **[SKILL.md](SKILL.md)** - Complete skill documentation
- **[scripts/README.md](scripts/README.md)** - Script usage guide
- **[references/FRONT-END.md](references/FRONT-END.md)** - Front-end development guide
- **[references/DOCKER.md](references/DOCKER.md)** - Docker deployment guide

## Project Templates

### Docker Files
- `Dockerfile` - Standard JVM-based deployment
- `Dockerfile-native` - GraalVM native image build
- `docker-compose.yml` - Full stack with PostgreSQL
- `docker-compose-native.yml` - Native image with PostgreSQL

### Scripts
- `create-project-latest.sh` ⭐ - Creates project with latest Spring Boot version (recommended)
- `create-basic-project.sh` - Minimal Spring Boot project
- `create-web-project.sh` - Web application with REST APIs
- `create-fullstack-project.sh` - Complete application with database

## Key Principles

- ✅ Use latest Spring Boot and Java versions
- ✅ Use Maven for dependency management
- ✅ Use PostgreSQL for production databases
- ✅ Include Spring Boot DevTools for development
- ✅ No Spring Security by default (add when needed)
- ✅ No environment profiles (use environment variables)
- ✅ Docker-ready with native image support
- ✅ Vanilla JavaScript for front-end (no complex frameworks)

## Requirements

- bash
- curl
- unzip
- grep and sed
- Docker (for containerization)
- Java 25 (for local development)

## License

See [LICENSE](LICENSE) file for details.


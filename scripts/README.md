# Optional Spring Boot Project Scripts

This directory contains sample bash scripts to quickly create Spring Boot projects using start.spring.io.

## Available Scripts

### 0. create-project-latest.sh ⭐ RECOMMENDED
Creates a Spring Boot project using the **latest available Spring Boot version** (automatically fetched from start.spring.io). This is the recommended script as it always uses the most current Spring Boot release.

**Usage:**
```bash
./create-project-latest.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [project-type]
```

**Example:**
```bash
./create-project-latest.sh my-app com.mycompany my-app com.mycompany.myapp 21 web
```

**Default values:**
- Project Name: my-spring-boot-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.app
- Java Version: 21
- Project Type: web (options: basic, web, fullstack)

**Project Types:**
- `basic` - Minimal project with Spring Web and Actuator
- `web` - Web application with validation and DevTools
- `fullstack` - Complete application with database, automatic Docker Compose support, TestContainers for integration testing, and all web features

**Features:**
- ✓ Automatically fetches the latest Spring Boot version
- ✓ Supports Spring Boot 4.x and beyond
- ✓ Flexible project types
- ✓ Uses Java 21 by default

### 1. create-basic-project.sh
Creates a minimal Spring Boot project with essential dependencies.

**Usage:**
```bash
./create-basic-project.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [spring-boot-version]
```

**Example:**
```bash
./create-basic-project.sh my-app com.mycompany my-app com.mycompany.myapp 21 4.0.0
```

**Default values:**
- Project Name: my-spring-boot-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.app
- Java Version: 21
- Spring Boot Version: 4.0.0

**Included dependencies:**
- Spring Web
- Spring Boot Actuator
- Spring Boot DevTools

### 2. create-web-project.sh
Creates a Spring Boot web application with REST API capabilities.

**Usage:**
```bash
./create-web-project.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [spring-boot-version]
```

**Example:**
```bash
./create-web-project.sh my-web-app com.mycompany my-web-app com.mycompany.webapp 21 4.0.0
```

**Default values:**
- Project Name: my-web-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.webapp
- Java Version: 21
- Spring Boot Version: 4.0.0

**Included dependencies:**
- Spring Web
- Spring Boot Actuator
- Validation
- Spring Boot DevTools

### 3. create-fullstack-project.sh
Creates a comprehensive Spring Boot application with database, security, and web dependencies.

**Usage:**
```bash
./create-fullstack-project.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [spring-boot-version]
```

**Example:**
```bash
./create-fullstack-project.sh my-fullstack-app com.mycompany my-fullstack-app com.mycompany.fullstack 21 4.0.0
```

**Default values:**
- Project Name: my-fullstack-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.fullstack
- Java Version: 21
- Spring Boot Version: 4.0.0

**Included dependencies:**
- Spring Web
- Spring Data JPA
- Spring Boot Actuator
- Validation
- Spring Boot DevTools
- PostgreSQL Driver
- Spring Boot Docker Compose (automatically starts PostgreSQL during development)
- TestContainers (for integration testing with PostgreSQL)

**Note:** Full-stack projects include automatic Docker Compose support. When you run `./mvnw spring-boot:run`, PostgreSQL will start automatically if you have a `compose.yaml` file in your project root. TestContainers is included for writing integration tests with a real PostgreSQL database.

## Requirements

- `curl` - for downloading projects from start.spring.io
- `unzip` - for extracting the downloaded project
- `bash` - for running the scripts
- `grep` and `sed` - standard Unix tools (included in macOS, Linux, Git Bash, WSL)
- `docker` - optional, for automatic database startup in full-stack projects

## Platform Compatibility

These scripts work on:
- **macOS** - Uses built-in bash and Unix tools
- **Linux** - Uses standard GNU tools
- **Windows** - Requires Git Bash or WSL (Windows Subsystem for Linux)

## Quick Start

1. Choose the appropriate script based on your needs
2. Run the script with default values or provide custom parameters
3. Navigate to the created project directory
4. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

## Notes

- All scripts use **Maven** as the build tool (Gradle is not supported)
- All scripts create projects with Java packaging (JAR)
- The scripts will create a new directory with your project name in the current directory
- If a directory with the same name already exists, the unzip operation may fail
- **Testing support**: All projects include `spring-boot-starter-test` (JUnit 5, Mockito, AssertJ)
- **TestContainers**: Full-stack projects include TestContainers for integration testing with PostgreSQL
- Spring Boot DevTools is included for development productivity
- No Spring Security is included by default
- PostgreSQL is the only database driver included (no H2)

## Automatic Database Startup (Full-Stack Projects)

Full-stack projects include `spring-boot-docker-compose` for automatic PostgreSQL startup during development.

**Setup:**
```bash
# Copy the compose.yaml to your project
cp assets/compose.yaml my-fullstack-app/

# Run your application - PostgreSQL starts automatically!
cd my-fullstack-app
./mvnw spring-boot:run
```

The database container will start automatically when you run the application and stop when you shut it down. No manual `docker compose up` needed during development!

## Docker Deployment

After creating your project, you can add Docker support by copying the Docker templates from the `assets/` directory:

```bash
# Copy Docker files to your project
cp assets/Dockerfile my-project/
cp assets/Dockerfile-native my-project/
cp assets/docker-compose.yml my-project/
cp assets/docker-compose-native.yml my-project/

# Run with Docker Compose
cd my-project
docker compose up -d
```

See [Docker Guide](../references/DOCKER.md) for detailed instructions.

## Build and Run

### Standard Maven Build
```bash
cd my-project
./mvnw spring-boot:run
```

### Running Tests
```bash
cd my-project

# Run all tests (unit + integration)
./mvnw verify

# Run only unit tests
./mvnw test

# Skip tests
./mvnw package -DskipTests
```

### GraalVM Native Build
```bash
cd my-project
./mvnw -Pnative native:compile
./target/my-project-exec
```

### Docker Build
```bash
# Standard JVM image
docker build -t my-project .

# GraalVM native image
docker build -f Dockerfile-native -t my-project-native .
```

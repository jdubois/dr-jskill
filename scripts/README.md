# Optional Spring Boot Project Scripts

This directory contains sample bash scripts to quickly create Spring Boot projects using start.spring.io.

## Available Scripts

### 1. create-basic-project.sh
Creates a minimal Spring Boot project with essential dependencies.

**Usage:**
```bash
./create-basic-project.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [spring-boot-version]
```

**Example:**
```bash
./create-basic-project.sh my-app com.mycompany my-app com.mycompany.myapp 17 3.2.2
```

**Default values:**
- Project Name: my-spring-boot-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.app
- Java Version: 17
- Spring Boot Version: 3.2.2

**Included dependencies:**
- Spring Web
- Spring Boot Actuator

### 2. create-web-project.sh
Creates a Spring Boot web application with REST API capabilities.

**Usage:**
```bash
./create-web-project.sh [project-name] [group-id] [artifact-id] [package-name] [java-version] [spring-boot-version]
```

**Example:**
```bash
./create-web-project.sh my-web-app com.mycompany my-web-app com.mycompany.webapp 17 3.2.2
```

**Default values:**
- Project Name: my-web-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.webapp
- Java Version: 17
- Spring Boot Version: 3.2.2

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
./create-fullstack-project.sh my-fullstack-app com.mycompany my-fullstack-app com.mycompany.fullstack 17 3.2.2
```

**Default values:**
- Project Name: my-fullstack-app
- Group ID: com.example
- Artifact ID: (same as project name)
- Package Name: com.example.fullstack
- Java Version: 17
- Spring Boot Version: 3.2.2

**Included dependencies:**
- Spring Web
- Spring Data JPA
- Spring Security
- Spring Boot Actuator
- Validation
- Spring Boot DevTools
- H2 Database
- PostgreSQL Driver

## Requirements

- `curl` - for downloading projects from start.spring.io
- `unzip` - for extracting the downloaded project
- `bash` - for running the scripts

## Quick Start

1. Choose the appropriate script based on your needs
2. Run the script with default values or provide custom parameters
3. Navigate to the created project directory
4. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

## Notes

- All scripts use Maven as the build tool by default
- All scripts create projects with Java packaging (JAR)
- The scripts will create a new directory with your project name in the current directory
- If a directory with the same name already exists, the unzip operation may fail

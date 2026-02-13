#!/bin/bash

# Script to create a full-stack Spring Boot application from start.spring.io
# This creates a comprehensive application with database, security, and web dependencies

set -e

# Configuration
PROJECT_NAME="${1:-my-fullstack-app}"
GROUP_ID="${2:-com.example}"
ARTIFACT_ID="${3:-$PROJECT_NAME}"
PACKAGE_NAME="${4:-$GROUP_ID.fullstack}"
JAVA_VERSION="${5:-21}"
SPRING_BOOT_VERSION="${6:-4.0.0}"

echo "Creating full-stack Spring Boot application..."
echo "Project Name: $PROJECT_NAME"
echo "Group ID: $GROUP_ID"
echo "Artifact ID: $ARTIFACT_ID"
echo "Package Name: $PACKAGE_NAME"
echo "Java Version: $JAVA_VERSION"
echo "Spring Boot Version: $SPRING_BOOT_VERSION"

# Download project from start.spring.io with comprehensive dependencies
curl -G https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion="$SPRING_BOOT_VERSION" \
  -d baseDir="$PROJECT_NAME" \
  -d groupId="$GROUP_ID" \
  -d artifactId="$ARTIFACT_ID" \
  -d name="$ARTIFACT_ID" \
  -d description="Full-stack+Spring+Boot+application" \
  -d packageName="$PACKAGE_NAME" \
  -d packaging=jar \
  -d javaVersion="$JAVA_VERSION" \
  -d dependencies=web,data-jpa,actuator,validation,devtools,postgresql,docker-compose,testcontainers \
  -o "$PROJECT_NAME.zip"

# Unzip the project
unzip -q "$PROJECT_NAME.zip"
rm "$PROJECT_NAME.zip"

echo "✓ Full-stack Spring Boot application created successfully in ./$PROJECT_NAME"
echo ""
echo "To get started:"
echo "  cd $PROJECT_NAME"
echo "  ./mvnw spring-boot:run"
echo ""
echo "The application includes:"
echo "  - Spring Web (REST APIs)"
echo "  - Spring Data JPA (Database access)"
echo "  - Spring Boot Actuator (Monitoring)"
echo "  - PostgreSQL Driver (Database)"
echo "  - Validation (Bean validation)"
echo "  - DevTools (Hot reload)"
echo "  - Docker Compose (Automatic database startup)"
echo "  - TestContainers (Integration testing with PostgreSQL)"

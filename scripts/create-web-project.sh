#!/bin/bash

# Script to create a Spring Boot web application from start.spring.io
# This creates a web application with REST API capabilities

set -e

# Configuration
PROJECT_NAME="${1:-my-web-app}"
GROUP_ID="${2:-com.example}"
ARTIFACT_ID="${3:-$PROJECT_NAME}"
PACKAGE_NAME="${4:-$GROUP_ID.webapp}"
JAVA_VERSION="${5:-17}"
SPRING_BOOT_VERSION="${6:-3.2.2}"

echo "Creating Spring Boot web application..."
echo "Project Name: $PROJECT_NAME"
echo "Group ID: $GROUP_ID"
echo "Artifact ID: $ARTIFACT_ID"
echo "Package Name: $PACKAGE_NAME"
echo "Java Version: $JAVA_VERSION"
echo "Spring Boot Version: $SPRING_BOOT_VERSION"

# Download project from start.spring.io with web dependencies
curl -G https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion="$SPRING_BOOT_VERSION" \
  -d baseDir="$PROJECT_NAME" \
  -d groupId="$GROUP_ID" \
  -d artifactId="$ARTIFACT_ID" \
  -d name="$ARTIFACT_ID" \
  -d description="Spring+Boot+web+application" \
  -d packageName="$PACKAGE_NAME" \
  -d packaging=jar \
  -d javaVersion="$JAVA_VERSION" \
  -d dependencies=web,actuator,validation,devtools \
  -o "$PROJECT_NAME.zip"

# Unzip the project
unzip -q "$PROJECT_NAME.zip"
rm "$PROJECT_NAME.zip"

echo "✓ Spring Boot web application created successfully in ./$PROJECT_NAME"
echo ""
echo "To get started:"
echo "  cd $PROJECT_NAME"
echo "  ./mvnw spring-boot:run"
echo ""
echo "The application will be available at http://localhost:8080"

#!/bin/bash

# Script to create a Spring Boot project using the LATEST Spring Boot version
# Automatically fetches the latest version from start.spring.io

set -e

# Configuration
PROJECT_NAME="${1:-my-spring-boot-app}"
GROUP_ID="${2:-com.example}"
ARTIFACT_ID="${3:-$PROJECT_NAME}"
PACKAGE_NAME="${4:-$GROUP_ID.app}"
JAVA_VERSION="${5:-25}"
PROJECT_TYPE="${6:-web}"  # Options: basic, web, fullstack

echo "Fetching latest Spring Boot version from start.spring.io..."

# Fetch the latest Spring Boot version from start.spring.io metadata
# Using standard Unix tools (grep, sed) for cross-platform compatibility
LATEST_VERSION=$(curl -s https://start.spring.io -H 'Accept: application/json' | \
  grep -o '"bootVersion"[^}]*"default":"[^"]*"' | \
  sed 's/.*"default":"\([^"]*\)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
  echo "❌ Failed to fetch latest Spring Boot version. Please check your internet connection."
  exit 1
fi

echo "✓ Latest Spring Boot version: $LATEST_VERSION"
echo ""
echo "Creating Spring Boot project..."
echo "Project Name: $PROJECT_NAME"
echo "Group ID: $GROUP_ID"
echo "Artifact ID: $ARTIFACT_ID"
echo "Package Name: $PACKAGE_NAME"
echo "Java Version: $JAVA_VERSION"
echo "Spring Boot Version: $LATEST_VERSION"
echo "Project Type: $PROJECT_TYPE"

# Set dependencies based on project type
case "$PROJECT_TYPE" in
  basic)
    DEPENDENCIES="web,actuator,devtools"
    DESCRIPTION="Basic+Spring+Boot+application"
    ;;
  web)
    DEPENDENCIES="web,actuator,validation,devtools"
    DESCRIPTION="Spring+Boot+web+application"
    ;;
  fullstack)
    DEPENDENCIES="web,data-jpa,actuator,validation,devtools,postgresql,docker-compose"
    DESCRIPTION="Full-stack+Spring+Boot+application"
    ;;
  *)
    echo "Unknown project type: $PROJECT_TYPE"
    echo "Valid options: basic, web, fullstack"
    exit 1
    ;;
esac

# Download project from start.spring.io
curl -G https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion="$LATEST_VERSION" \
  -d baseDir="$PROJECT_NAME" \
  -d groupId="$GROUP_ID" \
  -d artifactId="$ARTIFACT_ID" \
  -d name="$ARTIFACT_ID" \
  -d description="$DESCRIPTION" \
  -d packageName="$PACKAGE_NAME" \
  -d packaging=jar \
  -d javaVersion="$JAVA_VERSION" \
  -d dependencies="$DEPENDENCIES" \
  -o "$PROJECT_NAME.zip"

# Unzip the project
unzip -q "$PROJECT_NAME.zip"
rm "$PROJECT_NAME.zip"

echo ""
echo "✓ Spring Boot project created successfully in ./$PROJECT_NAME"
echo ""
echo "To get started:"
echo "  cd $PROJECT_NAME"
echo "  ./mvnw spring-boot:run"
echo ""
echo "The application will be available at http://localhost:8080"

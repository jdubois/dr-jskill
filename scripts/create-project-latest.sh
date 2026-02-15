#!/usr/bin/env bash
# Script to create a Spring Boot project using the LATEST available Spring Boot version
# Automatically fetches latest from start.spring.io; falls back per versions.json when preferred major unavailable
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/versions.sh
source "$ROOT_DIR/scripts/lib/versions.sh"

PREFERRED_BOOT_MAJOR="$(get_boot_preferred_major)"
DEFAULT_BOOT_FALLBACK="$(get_boot_fallback)"
JAVA_VERSION_DEFAULT="$(get_java_version)"

usage() {
  cat <<'EOF'
Usage: create-project-latest.sh [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION] [PROJECT_TYPE]

Environment / Flags:
  --boot-version <version>   Override Spring Boot version (otherwise resolves preferred major with fallback)
  --project-type <type>      basic | web | fullstack (default: web)
  --flyway                   Include Flyway migration support (no Liquibase)
  -h|--help                  Show this help

Examples:
  ./scripts/create-project-latest.sh myapp com.acme myapp com.acme.myapp 21 fullstack --flyway
  ./scripts/create-project-latest.sh --boot-version 4.0.0-M1 myapp
EOF
}

# Parse flags
BOOT_VERSION_OVERRIDE=""
PROJECT_TYPE="web"
INCLUDE_FLYWAY=false
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --boot-version)
      BOOT_VERSION_OVERRIDE="$2"; shift 2;;
    --project-type)
      PROJECT_TYPE="$2"; shift 2;;
    --flyway)
      INCLUDE_FLYWAY=true; shift;;
    -h|--help)
      usage; exit 0;;
    --) shift; break;;
    -* ) echo "Unknown option: $1" >&2; usage; exit 1;;
    *) POSITIONAL+=("$1"); shift;;
  esac
done
set -- "${POSITIONAL[@]}" # restore positionals

# Configuration
PROJECT_NAME="${1:-my-spring-boot-app}"
GROUP_ID="${2:-com.example}"
ARTIFACT_ID="${3:-$PROJECT_NAME}"
PACKAGE_NAME="${4:-${GROUP_ID}.app}"
JAVA_VERSION="${5:-$JAVA_VERSION_DEFAULT}"
PROJECT_TYPE="${6:-$PROJECT_TYPE}"

resolve_version() {
  if [[ -n "$BOOT_VERSION_OVERRIDE" ]]; then
    echo "$BOOT_VERSION_OVERRIDE"
  else
    resolve_boot_version "$PREFERRED_BOOT_MAJOR" "$DEFAULT_BOOT_FALLBACK"
  fi
}

BOOT_VERSION=$(resolve_version)

>&2 echo "Resolved Spring Boot version: $BOOT_VERSION (preferred major: $PREFERRED_BOOT_MAJOR, fallback: $DEFAULT_BOOT_FALLBACK)"

# Dependencies based on project type
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
    DEPENDENCIES="web,data-jpa,actuator,validation,devtools,postgresql,docker-compose,testcontainers"
    DESCRIPTION="Full-stack+Spring+Boot+application"
    ;;
  *)
    echo "Unknown project type: $PROJECT_TYPE" >&2
    echo "Valid options: basic, web, fullstack" >&2
    exit 1
    ;;
esac

if [[ "$INCLUDE_FLYWAY" == true ]]; then
  DEPENDENCIES=$(join_dependencies "$DEPENDENCIES" flyway)
fi

# Download project from start.spring.io
curl -G https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion="$BOOT_VERSION" \
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

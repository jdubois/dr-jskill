#!/usr/bin/env bash
# Script to create a basic Spring Boot project from start.spring.io
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/versions.sh
source "$ROOT_DIR/scripts/lib/versions.sh"

usage() {
  cat <<'EOF'
Usage: create-basic-project.sh [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
Options:
  --boot-version <version>   Override Spring Boot version
  --flyway                   Include Flyway migration support
  -h|--help                  Show this help
EOF
}

BOOT_VERSION_OVERRIDE=""
INCLUDE_FLYWAY=false
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --boot-version) BOOT_VERSION_OVERRIDE="$2"; shift 2;;
    --flyway) INCLUDE_FLYWAY=true; shift;;
    -h|--help) usage; exit 0;;
    -* ) echo "Unknown option: $1" >&2; usage; exit 1;;
    *) POSITIONAL+=("$1"); shift;;
  esac
done
set -- "${POSITIONAL[@]}"

PROJECT_NAME="${1:-my-spring-boot-app}"
GROUP_ID="${2:-com.example}"
ARTIFACT_ID="${3:-$PROJECT_NAME}"
PACKAGE_NAME="${4:-${GROUP_ID}.app}"
JAVA_VERSION="${5:-$(get_java_version)}"
BOOT_VERSION="${BOOT_VERSION_OVERRIDE:-$(resolve_boot_version)}"

DEPENDENCIES="web,actuator,devtools"
if [[ "$INCLUDE_FLYWAY" == true ]]; then
  DEPENDENCIES=$(join_dependencies "$DEPENDENCIES" flyway)
fi

>&2 echo "Creating basic Spring Boot project with Boot=$BOOT_VERSION, Java=$JAVA_VERSION"

curl -G https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion="$BOOT_VERSION" \
  -d baseDir="$PROJECT_NAME" \
  -d groupId="$GROUP_ID" \
  -d artifactId="$ARTIFACT_ID" \
  -d name="$ARTIFACT_ID" \
  -d description="Basic+Spring+Boot+application" \
  -d packageName="$PACKAGE_NAME" \
  -d packaging=jar \
  -d javaVersion="$JAVA_VERSION" \
  -d dependencies="$DEPENDENCIES" \
  -o "$PROJECT_NAME.zip"

unzip -q "$PROJECT_NAME.zip"
rm "$PROJECT_NAME.zip"

echo "✓ Basic Spring Boot project created successfully in ./$PROJECT_NAME"
echo "  cd $PROJECT_NAME"
echo "  ./mvnw spring-boot:run"

# This is a Spring Boot skill that follows Julien Dubois' best practices

- You MUST follow the Agents Skills specifications at: https://agentskills.io/home
- When doing a script, you MUST do a Bash script that works on Mac OS X, Windows and Linux.
  - Provide **PowerShell equivalents** for Windows (`scripts/*.ps1`). Use POSIX-safe bash (`set -euo pipefail`).
- NEVER propose to use Lombok in the generated projects (add Maven Enforcer/ArchUnit checks in generated templates).
- Build tool is **Maven only** (no Gradle).
- **Flyway** is the supported migration tool (do not offer Liquibase).
- Do not add OpenAPI/springdoc, feature toggles, Buildpacks, or Jib.

## Versions Manifest
Centralize versions in `versions.json`. Scripts load from `scripts/lib/versions.sh` (bash) and `scripts/lib/versions.ps1` (PowerShell). Update this file first when bumping versions.

## Updating Versions

To update all versions of tools, libraries, and frameworks in this skill, update the following:

### Backend & Java
1. **Java version**: Currently Java 21
   - Update in: `SKILL.md`, `assets/Dockerfile`, `assets/Dockerfile-native`, all script files
   - Check latest LTS at: https://adoptium.net/

2. **Spring Boot version**: Currently 4.x (fetched dynamically)
   - The `create-project-latest.sh` script automatically fetches the latest version from start.spring.io
   - For manual updates, check: https://spring.io/projects/spring-boot

3. **PostgreSQL version**: Currently 16
   - Update in: `assets/compose.yaml`, `assets/docker-compose.yml`, `assets/docker-compose-native.yml`
   - Update references in: `references/TEST.md`, `references/DOCKER.md`, `references/DATABASE.md`
   - Check latest at: https://www.postgresql.org/

4. **Eclipse Temurin (Docker base image)**: Currently 21
   - Update in: `assets/Dockerfile`, `assets/Dockerfile-native`
   - Check latest at: https://hub.docker.com/_/eclipse-temurin

5. **Maven**: Currently 3.8+
   - Update references in: `references/SPRING-BOOT-4.md`
   - Check latest at: https://maven.apache.org/

6. **GraalVM**: Currently 25+ (for native images)
   - Update references in: `references/SPRING-BOOT-4.md`
   - Check latest at: https://www.graalvm.org/

### Front-End (All Frameworks)
7. **Node.js version**: Currently v22.14.0
   - Update in: `references/VUE.md`, `references/REACT.md`, `references/ANGULAR.md`, `references/VANILLA-JS.md`
   - Check latest LTS at: https://nodejs.org/

8. **npm version**: Currently 10.10.0
   - Update in: `references/VUE.md`, `references/REACT.md`, `references/ANGULAR.md`, `references/VANILLA-JS.md`
   - Check latest at: https://www.npmjs.com/package/npm

9. **Maven Frontend Plugin**: Currently 1.15.1
   - Update in: `references/VUE.md`, `references/REACT.md`, `references/ANGULAR.md`, `references/VANILLA-JS.md`
   - Check latest at: https://github.com/eirslett/frontend-maven-plugin/releases

### Framework-Specific Versions
10. **Vite**: Currently 5.x
   - Update in: `references/VUE.md`, `references/REACT.md`, `references/VANILLA-JS.md`
   - Check latest at: https://vitejs.dev/

11. **Bootstrap**: Currently 5.3+
   - Update references in all front-end guides
   - Check latest at: https://getbootstrap.com/

12. **Vue.js**: Currently 3.x
    - Update in: `references/VUE.md`, `SKILL.md`, `README.md`
    - Check latest at: https://vuejs.org/

13. **React**: Currently 18.x
    - Update in: `references/REACT.md`, `SKILL.md`, `README.md`
    - Check latest at: https://react.dev/

14. **Angular**: Currently 19.x
    - Update in: `references/ANGULAR.md`, `SKILL.md`, `README.md`
    - Check latest at: https://angular.io/

### Additional Dependencies to Check
15. **Pinia** (Vue state management): Update in `references/VUE.md`
16. **React Router** (React routing): Update in `references/REACT.md`
17. **Vue Router** (Vue routing): Update in `references/VUE.md`
18. **TestContainers**: Update in `references/TEST.md` and `references/SPRING-BOOT-4.md` - https://testcontainers.com/
19. **Spring Framework**: Currently 7.0 - Update in `references/SPRING-BOOT-4.md`
20. **Hibernate/Jakarta EE**: Update in `references/SPRING-BOOT-4.md`
21. **Docker Compose file format**: Update in compose files if needed

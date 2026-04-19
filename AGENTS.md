# This is a Spring Boot skill that follows Julien Dubois' best practices

- You MUST follow the Agents Skills specifications at: https://agentskills.io/home
- When doing a script, you MUST do a JavaScript (Node.js) script that works on Mac OS X, Windows and Linux.
  - Scripts use ES modules (`.mjs` extension) and only Node.js built-in APIs (no npm dependencies).
  - Node.js 24.x and npm 11.x are prerequisites.
- NEVER propose to use Lombok in the generated projects (add Maven Enforcer/ArchUnit checks in generated templates).
- Build tool is **Maven only** (no Gradle).
- **Hibernate ddl-auto** is the supported database initialization mechanism (`spring.jpa.hibernate.ddl-auto`). Do not offer Liquibase or Flyway.
- Do not add OpenAPI/springdoc, feature toggles, Buildpacks, or Jib.
- **Ship dotfiles**: ensure `.gitignore`, `.env.sample`, `.editorconfig`, `.gitattributes`, `.dockerignore`, optional `.vscode/` are added to generated projects (see `references/PROJECT-SETUP.md`).
- **`.env` is the canonical local secret store**: generated projects load real credentials from a `.env` file (gitignored). Always instruct users to copy `.env.sample` → `.env` and fill in real values there.
- **NEVER read or expose `.env`**: the `.env` file contains real secrets. Never `cat`, `view`, `read`, or print its contents — not to the console, not in output, not in logs. Only `.env.sample` (placeholder values) may be read or displayed. If a task requires inspecting current env values, ask the user to share only the specific variable name, never the whole file.
- **Java code intelligence**: when working on Java files in a generated project, **prefer the JDTLS-backed `lsp` tool** (goToDefinition, findReferences, hover, documentSymbol, rename) over grep/view/sed. Generated projects ship `.github/lsp.json` so GitHub Copilot CLI wires JDTLS automatically. See `references/JDTLS.md`.

## Versions Manifest
Centralize versions in `versions.json`. Scripts load from `scripts/lib/versions.mjs` (JavaScript). Update this file first when bumping versions.

## Updating Versions

**All versions live in `versions.json` — the single source of truth.**

### Bump workflow

1. Edit `versions.json` with the new value(s).
2. Search-and-replace the old value across the repo. Typical hotspots:
   - `assets/Dockerfile`, `assets/Dockerfile-native` (Temurin / GraalVM image tags)
   - `assets/compose.yaml`, `assets/docker-compose*.yml` (Postgres image tag)
   - `assets/ci/github-actions.yml` (Java setup-java action version)
   - `references/**/*.md` (narrative mentions like "Node 24" / "PostgreSQL 18")
   - `SKILL.md`, `README.md` (prerequisites, headline framework versions)
3. Regenerate the version tables in the front-end reference guides:
   ```bash
   node scripts/sync-versions-in-docs.mjs
   ```
   Use `--check` in CI to fail builds if a doc is out of sync.
4. Update fallback defaults in `scripts/lib/versions.mjs` (the `getXxx()` getters) so the scripts still work without `versions.json`.
5. Smoke-test by generating a project and running `./mvnw verify`.

### Where to check for new releases

| Tool | Source |
|------|--------|
| Java (Temurin) | https://adoptium.net/ |
| Spring Boot | https://spring.io/projects/spring-boot (also auto-resolved by `create-project-latest.mjs`) |
| PostgreSQL | https://www.postgresql.org/ |
| GraalVM | https://www.graalvm.org/ |
| Maven | https://maven.apache.org/ |
| Node.js (LTS) | https://nodejs.org/en/about/previous-releases |
| npm | https://www.npmjs.com/package/npm |
| Vite | https://vitejs.dev/ |
| Vue.js / Pinia / Vue Router | https://vuejs.org/ |
| React / React Router | https://react.dev/ |
| Angular / Angular Router | https://angular.dev/ |
| Bootstrap | https://getbootstrap.com/ |
| Testcontainers | https://testcontainers.com/ |
| Spring Framework / Hibernate | https://spring.io/ / https://hibernate.org/ |
| Maven Frontend Plugin | https://github.com/eirslett/frontend-maven-plugin/releases |

Do **not** add new `Currently X.Y.Z` lines here — hardcoded version numbers in this file drift out of sync with `versions.json`. Keep this guide version-free.

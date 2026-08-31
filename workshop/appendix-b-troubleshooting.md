# Appendix B — Troubleshooting

When something breaks during the workshop, check here first.

---

## Setup issues

### `node --version` prints an older version

**Cause:** a previously installed Node is still on `PATH`.

**Fix:**
```bash
which -a node       # macOS / Linux
where node          # Windows
```

Remove old installs or switch with your version manager (`mise use node@24`, `volta install node@24`).

### `java --version` shows Java 21 (or similar)

**Cause:** `JAVA_HOME` points at an older JDK.

**Fix (macOS):**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
```

**Fix (Linux):**
```bash
sudo update-alternatives --config java   # pick Temurin 25
```

**Fix (Windows):** update `JAVA_HOME` in *System Properties → Environment Variables*, then open a new terminal.

### Docker: `Cannot connect to the Docker daemon`

**Cause:** Docker Desktop is not running (macOS / Windows), or the Linux service is stopped.

**Fix:**
- macOS / Windows — open Docker Desktop; wait for the whale icon to stop animating.
- Linux — `sudo systemctl start docker && sudo systemctl enable docker`.

### `copilot` command not found

**Cause:** npm global bin is not on `PATH`.

**Fix:**
```bash
npm config get prefix           # prints the global prefix, e.g. /opt/homebrew
# Add $(npm config get prefix)/bin to your PATH
```

### Copilot CLI doesn't see the Dr JSkill skill

**Check:**
```bash
ls ~/.copilot/skills/dr-jskill/SKILL.md
```

If the file isn't there, re-clone:

```bash
mkdir -p ~/.copilot/skills
git clone https://github.com/jdubois/dr-jskill.git ~/.copilot/skills/dr-jskill
```

Restart your Copilot CLI session after cloning.

### `jdtls --help` errors / not found

**Cause:** `jdtls` isn't on `PATH`.

**Fix:**
- Install with `brew install jdtls` (macOS / Linux) or from the [JDTLS releases](https://github.com/eclipse-jdtls/eclipse.jdt.ls/releases).
- Confirm the install location is on `PATH` — `which jdtls` should print a path.
- See [`references/JDTLS.md`](../references/JDTLS.md) for platform-specific notes.

---

## Generation / first run (Chapter 2)

### `./mvnw spring-boot:run` fails with `Port 5432 is already in use`

**Cause:** another Postgres is already running on 5432 (Homebrew service, another Docker container, previous workshop attempt).

**Fix:**
```bash
# macOS (Homebrew service)
brew services stop postgresql

# Any OS: list and stop stray containers
docker ps
docker stop <container-id>
```

Or change the port in `compose.yaml` (`"15432:5432"`) and the datasource URL accordingly.

### `./mvnw` fails with `No such file or directory`

**Cause:** line endings in `mvnw` got converted to CRLF (Windows).

**Fix:**
```bash
git rm -f --cached mvnw
git checkout -- mvnw
chmod +x mvnw
```

Make sure your `.gitattributes` enforces LF for `mvnw` (Dr JSkill's generated `.gitattributes` handles this).

### Frontend build fails with `ERESOLVE` mentioning `oxlint`

**Cause:** `create-vue` scaffolds both `oxlint` and `eslint-plugin-oxlint`, pinned to
mismatched minors. npm refuses to resolve the peer dependency, so `npm install` fails —
and because the `frontend-maven-plugin` runs `npm install`, the whole Maven build fails
with it.

```
npm error Could not resolve dependency:
npm error peer oxlint@"~1.73.0" from eslint-plugin-oxlint@1.73.0
```

**Fix:** drop the oxlint dual-linter (Dr JSkill uses a single ESLint pipeline).
The simplest route is to ask the agent: *"run the Vue normalizer on `frontend/`"*.

To do it yourself, note that `scripts/` lives in the **Dr JSkill skill folder**, not in
your generated project — running `node scripts/...` from the project root fails with
`MODULE_NOT_FOUND`. Point at the skill's copy instead:

```bash
node /path/to/dr-jskill/scripts/normalize-vue-frontend.mjs frontend
cd frontend && npm install
```

The script is idempotent, so it is safe to run at any time. Run it immediately after
scaffolding a Vue front-end, before the first `npm install`.

### Frontend build fails with `EACCES` or permission errors

**Cause:** an earlier `npm` run left root-owned files in `frontend/node_modules`.

**Fix:**
```bash
sudo rm -rf frontend/node_modules frontend/node
./mvnw clean package
```

### Port 8080 already in use

**Cause:** leftover Java process, or another app (Confluence, Jenkins, etc.).

**Fix:**
```bash
# macOS / Linux
lsof -i :8080
kill <pid>

# Windows PowerShell
netstat -ano | findstr :8080
taskkill /PID <pid> /F
```

---

## Agent behavior

### The agent made a huge change I didn't want

```bash
git restore .                      # throw away all unstaged changes
git restore --staged .             # unstage anything the agent staged
git reset --hard HEAD              # nuke everything back to the last commit
```

Then write a smaller, more scoped prompt.

### The agent insists on adding a dependency I rejected

**Cause:** it forgot your previous constraint.

**Fix:** repeat it explicitly in the next prompt: *"Do not add `spring-boot-starter-security` — keep authentication stubbed with the user dropdown."*

For stubborn cases, tell the agent what *file* it's modifying: *"Revert the last edit to `pom.xml`."*

### The agent keeps producing different code each run

That's how agents work. If you need determinism, keep diffs small and commit frequently — you can always cherry-pick the bits you like.

### The agent says "done" but nothing changed

Run `git status`. If it's clean, the agent may have hit a silent error. Ask: *"Summarize what you actually did, file by file."* If there's truly no change, paste the last error it mentioned and ask it to retry.

---

## Tests & build

### `./mvnw test` fails with `Failed to start application`

**Cause:** usually a Postgres connection error (container not up, credentials changed).

**Fix:**
```bash
docker compose ps           # is postgres running?
docker compose logs postgres | tail -30
```

Compare `spring.datasource.*` in `application.properties` against `compose.yaml`.

### Testcontainers can't pull the Postgres image

**Cause:** rate limits on Docker Hub, or no internet.

**Fix:**
- Log in to Docker Hub (`docker login`) to get the authenticated rate limit.
- Enable container reuse so you don't re-pull:
  ```properties
  # ~/.testcontainers.properties
  testcontainers.reuse.enable=true
  ```

### Tests fail only on CI, not locally

**Common culprits:**
- Env vars differ (CI runs with `prod` profile by mistake).
- Port already bound (CI containers use fixed ports).
- Timezone (`TZ=UTC` on CI vs your local).
- Missing Docker in a non-DooD CI runner — Testcontainers needs Docker.

Ask the agent: *"The test passes locally but fails on CI with `<paste stack trace>`. What's different about the CI environment?"*

---

## Docker & deployment

### `docker compose up` builds slowly every time

**Cause:** Docker layer cache is being invalidated (usually by a `COPY . .` before `pom.xml`).

**Fix:** check your `Dockerfile` — `pom.xml` should be copied and `./mvnw dependency:go-offline` run **before** copying the source. The generated Dockerfile already does this; if you edited it, restore the order.

### Docker build fails downloading Node/npm: "SSL peer shut down incorrectly"

**Symptom:** `docker build` (or `docker compose up --build`) fails in the Maven stage with:

```
Failed to execute goal ...frontend-maven-plugin...(install node and npm):
Could not download npm: Could not download https://registry.npmjs.org/npm/-/npm-X.Y.Z.tgz:
Remote host terminated the handshake: SSL peer shut down incorrectly
```

**Cause:** your host can reach the npm registry (so `npm install` works in `frontend/`), but the
**container** cannot. This is almost always a corporate proxy, VPN, or TLS-inspecting firewall:
your host npm is pointed at an internal registry mirror, while the Docker build uses the
default `https://registry.npmjs.org`. Nothing is wrong with the generated `Dockerfile`.

**Check it in one command** — if this fails, it is your network, not the project:

```bash
docker run --rm alpine:3 sh -c "apk add -q --no-cache curl && curl -sS -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/npm"
```

**Fixes**, in order of preference:

1. Point the build at the same mirrors your host uses. **Three separate things** get downloaded,
   and they need different flags — this is the step most people get wrong:

   | What | Flag | Default |
   |------|------|---------|
   | Node binary | `NODE_DOWNLOAD_ROOT` | `https://nodejs.org/dist/` |
   | npm binary | `NPM_DOWNLOAD_ROOT` | `https://registry.npmjs.org/npm/-/` |
   | npm packages | `NPM_CONFIG_REGISTRY` | `https://registry.npmjs.org` |

   The error above (`Could not download npm`) happens during the **binary** download, which runs
   *before* npm exists — so `NPM_CONFIG_REGISTRY` alone will not fix it. All four generated
   Dockerfiles (`Dockerfile`, `Dockerfile-aot`, `Dockerfile-native`, `Dockerfile-crac`) declare
   all three as build args, so you only need to pass them — no need to edit any file:
   ```bash
   # strip any trailing slash so the URL does not end up with a double slash
   REGISTRY="$(npm config get registry)"; REGISTRY="${REGISTRY%/}"
   docker build \
     --build-arg NPM_DOWNLOAD_ROOT="${REGISTRY}/npm/-/" \
     --build-arg NPM_CONFIG_REGISTRY="${REGISTRY}" \
     -t todo-app:latest .
   ```
   Add `--build-arg NODE_DOWNLOAD_ROOT=...` too if your mirror also proxies the Node
   distribution (many corporate mirrors do, under a `nodejs/dist` path).
2. Add your proxy's CA certificate to the build stage, and/or pass `HTTP_PROXY` / `HTTPS_PROXY`
   as build args.
3. If you only need to *run* the app, build the jar on the host and copy it in — this skips the
   container's network entirely. One catch: the generated `.dockerignore` excludes `/target`, so
   a plain `COPY target/*.jar` fails with
   `CopyIgnoredFile: Attempting to Copy file "target/app.jar" that is excluded by .dockerignore`.
   BuildKit reads `<dockerfile-name>.dockerignore` *instead of* `.dockerignore`, so ship one
   alongside your Dockerfile.

   `Dockerfile.hostjar`:

   ```dockerfile
   FROM eclipse-temurin:25-jre-noble
   WORKDIR /app
   COPY target/*.jar app.jar
   EXPOSE 8080
   ENTRYPOINT ["java", "-jar", "/app/app.jar"]
   ```

   `Dockerfile.hostjar.dockerignore` — deliberately does **not** exclude `/target`:

   ```text
   .git
   node_modules
   frontend/node_modules
   frontend/dist
   ```

   Then:

   ```bash
   ./mvnw -DskipTests package
   docker build -f Dockerfile.hostjar -t todo-app:hostjar .
   ```

   Treat this as a debugging convenience, not a production image: a full JRE base lands around
   560 MB, versus roughly 260 MB for the generated jlink + distroless `Dockerfile`.

> The rest of Chapter 8 (image layers, distroless, `docker inspect`) still applies — this is
> purely about reaching the npm registry from inside the build.

**Cause:** GraalVM needs ~8 GB of heap for a typical Spring Boot app.

**Fix:**
- Increase Docker Desktop memory allocation (*Settings → Resources*) to at least 8 GB.
- Or skip the native build — it's optional. The JVM Dockerfile is plenty for a workshop.

### `docker exec ... sh` fails with "exec: \"sh\": executable file not found"

**Cause:** the generated JVM, AOT and native images run on a **distroless** base — there's no shell, `curl` or package manager inside. That's deliberate: it keeps the image small and the attack surface tiny.

**Fix:** don't try to shell into those containers. Use `docker logs <container>` for output and `docker inspect <container>` for the effective config. To debug interactively, attach a temporary sidecar that shares the container's process namespace:

```bash
docker run -it --rm --pid=container:<container> --network=container:<container> \
  busybox sh
```

(The CRaC image keeps a shell, so `docker exec -it <container> sh` still works there.) See "Debugging a distroless image" in [`references/DOCKER.md`](../references/DOCKER.md).

### Spring Boot Actuator endpoints return 404

**Cause:** the endpoints aren't exposed — or they're exposed but don't exist.

**Fix:** in `application.properties`:
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
```

Then check what actually got registered:

```bash
curl -s http://localhost:8080/actuator | jq '._links | keys'
```

If a name you listed is missing from that output, exposure wasn't the problem — the endpoint isn't on the classpath at all:

- **`prometheus`** needs the `micrometer-registry-prometheus` dependency.
- **`httpexchanges`** needs an `HttpExchangeRepository` bean (none is auto-configured).
- **`httptrace`** doesn't exist any more; it was renamed `httpexchanges` in Spring Boot 3.

### A POST returns 400 and the log says "Cannot map `null` into type `boolean`"

**Cause:** Jackson 3 (Spring Boot 4) enables `FAIL_ON_NULL_FOR_PRIMITIVES` by default, so omitting a primitive field from the JSON body — `{"title":"Buy milk"}` with no `"completed"` — is an error rather than a fall-back to `false`.

**Fix:** generated projects already set this in `application.properties`. If yours doesn't, add it (and repeat it in `src/test/resources/application.properties`, which shadows the main file on the test classpath):

```properties
spring.jackson.deserialization.fail-on-null-for-primitives=false
```

---

## JDTLS / code intelligence

### JDTLS never finishes indexing

**Cause:** first open of a new project; it's downloading the Maven dependencies.

**Fix:** be patient (30–60s for a small project). Make sure `./mvnw compile` has succeeded at least once; JDTLS reads from `~/.m2/repository`.

### `lsp workspaceSymbol` returns empty results

**Cause:** indexing isn't done, or the workspace data got corrupted.

**Fix:**
```bash
rm -rf .jdtls-workspace
```

Then restart Copilot CLI. JDTLS will rebuild its index from scratch.

### Stale type errors after a `pom.xml` change

**Cause:** JDTLS cached the old classpath.

**Fix:** in the Copilot CLI session:
```
/lsp
```
Restart the Java server. Or close and reopen VS Code.

---

## Still stuck?

1. Run `git status` and `git log --oneline`. Paste both to the agent with a one-line description of what you see.
2. Check the [Dr JSkill issues](https://github.com/jdubois/dr-jskill/issues) — someone may have hit the same thing.
3. If you find a reproducible issue, open a new one with:
   - The prompt you ran
   - The full error / stack trace
   - Your OS, Node version, Java version, Docker version

Good luck — and welcome to life with an AI coding agent.

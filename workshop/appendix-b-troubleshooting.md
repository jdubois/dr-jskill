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

### Frontend build fails with `EACCES` or permission errors

**Cause:** an earlier `npm` run left root-owned files in `frontend/node_modules`.

**Fix:**
```bash
sudo rm -rf frontend/node_modules frontend/node
./mvnw -Pprod clean package
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

### Native image build runs out of memory

**Cause:** GraalVM needs ~8 GB of heap for a typical Spring Boot app.

**Fix:**
- Increase Docker Desktop memory allocation (*Settings → Resources*) to at least 8 GB.
- Or skip the native build — it's optional. The JVM Dockerfile is plenty for a workshop.

### Spring Boot Actuator endpoints return 404

**Cause:** the endpoints aren't exposed.

**Fix:** in `application.properties`:
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
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

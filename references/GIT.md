# Git Best Practices

> Covers day-to-day Git operations for Spring Boot projects generated with this skill. Project setup dotfiles live in [Project Setup & Dotfiles](PROJECT-SETUP.md); this guide focuses on daily workflow after the repository exists.

## Contents
- [Core principles](#core-principles)
- [Daily workflow](#daily-workflow)
- [Branching](#branching)
- [Committing](#committing)
- [Syncing with the remote](#syncing-with-the-remote)
- [Pull requests and reviews](#pull-requests-and-reviews)
- [Undoing safely](#undoing-safely)
- [Stashing](#stashing)
- [Working with Git worktrees](#working-with-git-worktrees)
- [Agent rules](#agent-rules)

## Core principles

- Keep changes small, focused, and easy to review.
- Run `git status` before and after meaningful changes.
- Review diffs before committing: `git diff` for unstaged changes and `git diff --staged` before `git commit`.
- Commit working checkpoints frequently so Git remains a useful undo and audit tool.
- Never commit secrets. `.env` must stay ignored; commit `.env.sample` with placeholders instead.
- Prefer explicit commands over aliases in documentation and automation.

## Daily workflow

Start each work session by checking where you are:

```bash
git status
git branch --show-current
git remote -v
```

Before editing, make sure the current branch matches the task. During work, inspect changes regularly:

```bash
git diff
git status --short
```

Before committing, stage intentionally instead of blindly committing everything:

```bash
git add path/to/file
git diff --staged
```

Use `git add .` only when you have reviewed the full working tree and know every changed file belongs in the same commit.

## Branching

- Use short, descriptive branch names such as `add-user-filtering`, `fix-login-validation`, or `update-postgres-config`.
- Keep one branch focused on one task or feature.
- Start from an up-to-date `main` unless the task explicitly depends on another branch.
- Avoid long-lived branches. Merge or close stale work quickly.

Recommended starting point:

```bash
git switch main
git pull --ff-only
git switch -c add-user-filtering
```

## Committing

Good commits tell reviewers what changed and why. Prefer concise, imperative messages:

```bash
git commit -m "Add user-specific todo filtering"
```

For larger changes, use a body:

```bash
git commit -m "Add user-specific todo filtering" \
  -m "Store the selected user in the controller and filter todos before rendering the response."
```

Before committing:

1. Run the relevant tests or build command for the change.
2. Check `git diff --staged`.
3. Confirm no generated artifacts, local caches, or secrets are staged.

## Syncing with the remote

Use fast-forward pulls on shared branches to avoid accidental merge commits:

```bash
git pull --ff-only
```

For feature branches, rebase onto the latest `main` when you need to refresh your branch:

```bash
git fetch origin
git rebase origin/main
```

Do not rewrite shared history unless the team explicitly agrees. If a branch has already been reviewed or used by others, prefer a merge from `main` or ask before force-pushing.

When a force push is appropriate for your own feature branch, use the safer form:

```bash
git push --force-with-lease
```

## Pull requests and reviews

- Open a pull request when the branch is coherent enough for feedback.
- Keep PRs focused; split unrelated changes into separate branches.
- Explain the reason for the change, the main implementation choices, and how it was validated.
- Respond to review comments with new commits unless the reviewer asks for a history cleanup.
- Do not mix formatting-only changes with behavior changes unless the formatting change is required.

Useful commands:

```bash
gh pr create --fill
gh pr view --web
gh pr checks
```

## Undoing safely

Prefer non-destructive commands while work is still in progress:

```bash
git restore path/to/file
git restore --staged path/to/file
```

Use `git revert` for changes that have already been pushed or shared:

```bash
git revert <commit-sha>
```

Avoid destructive commands such as `git reset --hard` unless you are certain no useful uncommitted work will be lost.

## Stashing

Use stash for short interruptions, not long-term storage:

```bash
git stash push -m "WIP user filtering"
git stash list
git stash pop
```

If the work is valuable, prefer a WIP commit on a private branch over a long-lived stash.

## Working with Git worktrees

Git worktrees let you check out multiple branches from the same repository at the same time, each in its own directory. They are useful for parallel tasks, urgent fixes while a feature branch is in progress, and comparing branches without constantly switching.

Initial day-to-day guidance:

- Use one worktree per active task.
- Keep each worktree on its own branch.
- Check `git worktree list` before creating or removing worktrees.
- Do not delete a worktree directory manually; use `git worktree remove`.
- Prune stale metadata with `git worktree prune` after branches or directories are cleaned up.

### Avoiding port conflicts across worktrees

Each worktree should be able to run the Spring Boot app, Vite dev server, and PostgreSQL at the same time as the other worktrees. The recommended pattern is:

1. Keep `.env` ignored and local to each worktree.
2. Generate a unique `.env` when a worktree is checked out.
3. Make every local port configurable through environment variables with safe defaults.
4. Avoid fixed Docker Compose `container_name` values, or parameterize them with a worktree-specific `COMPOSE_PROJECT_NAME`.

Recommended local port variables:

```dotenv
SPRING_BOOT_PORT=18080
VITE_PORT=15173
POSTGRES_PORT=15432
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:15432/mydb
COMPOSE_PROJECT_NAME=my-app-main-a1b2c3
```

The exact values should be generated per worktree. The defaults remain the usual ports (`8080`, `5173`, `5432`) only when `.env` is absent and the hook has not run yet.

### Post-checkout hook for worktree-local ports

Git does not version hooks by default, so keep the real logic in a versioned Node.js script and use a small hook wrapper to call it. The script must never print `.env` contents.

Create `scripts/git/update-worktree-env.mjs`:

```javascript
#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomInt } from 'node:crypto';

const envPath = resolve(process.cwd(), '.env');
const managedStart = '# === dr-jskill worktree ports:start ===';
const managedEnd = '# === dr-jskill worktree ports:end ===';
const sampleDefaults = new Map([
  ['SPRING_BOOT_PORT', '8080'],
  ['VITE_PORT', '5173'],
  ['POSTGRES_PORT', '5432'],
  ['COMPOSE_PROJECT_NAME', 'my-spring-boot-app'],
]);

function sanitize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'worktree';
}

function readExistingEnv() {
  if (!existsSync(envPath)) {
    return '';
  }
  return readFileSync(envPath, 'utf8');
}

function getExistingValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim();
}

function getManagedBlock(content) {
  const pattern = new RegExp(`${managedStart}[\\s\\S]*?${managedEnd}`, 'm');
  return content.match(pattern)?.[0] ?? '';
}

function getPreservedValue(content, key) {
  const managedBlock = getManagedBlock(content);
  if (managedBlock) {
    return getExistingValue(managedBlock, key);
  }

  const value = getExistingValue(content, key);
  if (value === undefined || value === sampleDefaults.get(key)) {
    return undefined;
  }
  return value;
}

function isPortAvailable(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => {
      server.close(() => resolveAvailable(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function randomAvailablePort(usedPorts) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const port = randomInt(10000, 49152);
    if (!usedPorts.has(port) && await isPortAvailable(port)) {
      usedPorts.add(port);
      return port;
    }
  }
  throw new Error('Could not find an available local port');
}

function replaceManagedBlock(content, block) {
  const pattern = new RegExp(`${managedStart}[\\s\\S]*?${managedEnd}\\n?`, 'm');
  const trimmed = content.trimEnd();
  if (pattern.test(content)) {
    return content.replace(pattern, `${block}\n`);
  }
  return `${trimmed}${trimmed ? '\n\n' : ''}${block}\n`;
}

const existing = readExistingEnv();
const usedPorts = new Set();

for (const key of ['SPRING_BOOT_PORT', 'VITE_PORT', 'POSTGRES_PORT']) {
  const value = Number(getPreservedValue(existing, key));
  if (Number.isInteger(value)) {
    usedPorts.add(value);
  }
}

const springBootPort = getPreservedValue(existing, 'SPRING_BOOT_PORT') ?? String(await randomAvailablePort(usedPorts));
const vitePort = getPreservedValue(existing, 'VITE_PORT') ?? String(await randomAvailablePort(usedPorts));
const postgresPort = getPreservedValue(existing, 'POSTGRES_PORT') ?? String(await randomAvailablePort(usedPorts));
const datasourceUrl = `jdbc:postgresql://localhost:${postgresPort}/mydb`;
const composeProjectName = getPreservedValue(existing, 'COMPOSE_PROJECT_NAME') ??
  `${sanitize(basename(process.cwd()))}-${randomInt(0x100000, 0xffffff).toString(16)}`;

const block = `${managedStart}
SPRING_BOOT_PORT=${springBootPort}
VITE_PORT=${vitePort}
POSTGRES_PORT=${postgresPort}
SPRING_DATASOURCE_URL=${datasourceUrl}
COMPOSE_PROJECT_NAME=${composeProjectName}
${managedEnd}`;

writeFileSync(envPath, replaceManagedBlock(existing, block));
console.log('Updated worktree-local .env port assignments');
```

Install it through a versioned hook directory:

```bash
mkdir -p .githooks
cat > .githooks/post-checkout <<'EOF'
#!/usr/bin/env sh
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0
node scripts/git/update-worktree-env.mjs
EOF
chmod +x .githooks/post-checkout
```

Create `scripts/git/setup-worktree-env.mjs`:

```javascript
#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
}

let repoRoot;
try {
  repoRoot = run('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() }).trim();
} catch {
  console.error('Cannot set up worktree-local .env files because this directory is not a Git repository.');
  console.error('Run `git init -b main` first, then run `node scripts/git/setup-worktree-env.mjs` again.');
  process.exit(1);
}

const hookPath = resolve(repoRoot, '.githooks', 'post-checkout');
const updaterPath = resolve(repoRoot, 'scripts', 'git', 'update-worktree-env.mjs');

if (!existsSync(hookPath) || !existsSync(updaterPath)) {
  console.error('Cannot set up worktree-local .env files because the Dr JSkill hook files are missing.');
  console.error('Expected .githooks/post-checkout and scripts/git/update-worktree-env.mjs in the repository root.');
  process.exit(1);
}

run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: repoRoot, stdio: 'ignore' });
execFileSync('node', ['scripts/git/update-worktree-env.mjs'], { cwd: repoRoot, stdio: 'inherit' });
console.log('Activated .githooks/post-checkout for future git worktree add operations.');
```

Generated projects run `node scripts/git/setup-worktree-env.mjs` automatically when they are created at the root of an existing Git worktree. If generation happens before Git is initialized, run that setup script once after `git init` or after cloning. The `.githooks/post-checkout` file is versioned, but Git ignores versioned hook directories until `core.hooksPath` is configured; this setting is local Git config and is not committed or pushed.

The setup script creates the first local `.env`. The `post-checkout` hook then runs after branch checkouts and when Git populates a new worktree. The updater script preserves existing values inside its managed block, so a developer can override a port manually by editing `.env`; copied `.env.sample` defaults are treated as placeholders and replaced with random ports on first run.

### Spring Boot configuration

Import the root `.env` file directly from `src/main/resources/application.properties`, then use environment-backed defaults:

```properties
spring.config.import=optional:file:.env[.properties]

server.port=${SPRING_BOOT_PORT:8080}
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:${POSTGRES_PORT:5432}/mydb}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:user}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:password}
```

The `[.properties]` hint tells Spring Boot to parse the extensionless `.env` file as Java properties. With this in place, local development does not need to source `.env` first:

```bash
./mvnw spring-boot:run
```

### Vite configuration

Make the Vite dev server port configurable and fail fast if the port is unexpectedly busy:

```javascript
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, projectRoot, '');
  const vitePort = Number(env.VITE_PORT ?? 5173);
  const springBootPort = Number(env.SPRING_BOOT_PORT ?? 8080);

  return {
    server: {
      port: vitePort,
      strictPort: true,
      proxy: {
        '/api': `http://localhost:${springBootPort}`
      }
    }
  };
});
```

### Docker Compose configuration

For the development database in `compose.yaml`, map the host port through `POSTGRES_PORT`:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
```

For a full-stack `docker-compose.yml`, use the host-specific ports and avoid fixed container names:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "${POSTGRES_PORT:-5432}:5432"

  spring-app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      SPRING_BOOT_PORT: ${SPRING_BOOT_PORT:-8080}
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/mydb
      SPRING_DATASOURCE_USERNAME: user
      SPRING_DATASOURCE_PASSWORD: password
    ports:
      - "${SPRING_BOOT_PORT:-8080}:${SPRING_BOOT_PORT:-8080}"
    depends_on:
      postgres:
        condition: service_healthy
```

Do not use hardcoded `container_name: postgres-db` or `container_name: spring-boot-app` in worktree-safe Compose files. Let Compose derive names from `COMPOSE_PROJECT_NAME`, or parameterize names if your tooling requires stable names:

```yaml
container_name: "${COMPOSE_PROJECT_NAME:-my-app}-postgres"
```

### Dev Containers

For `.devcontainer/docker-compose.yml`, use the same PostgreSQL host-port mapping:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
```

For Spring Boot and Vite running inside the dev container, prefer editor auto-forwarding or export the generated values before opening the container. `devcontainer.json` does not automatically load `.env` as host environment variables for `forwardPorts`.

If you want explicit forwarding, keep defaults in the committed file and override locally when needed:

```jsonc
{
  "forwardPorts": [8080, 5173, 5432],
  "portsAttributes": {
    "8080": { "label": "Spring Boot", "onAutoForward": "notify" },
    "5173": { "label": "Vite Dev Server", "onAutoForward": "silent" },
    "5432": { "label": "PostgreSQL", "onAutoForward": "silent" }
  }
}
```

The important worktree-safe behavior is that Docker Compose uses `POSTGRES_PORT`, and the application-level configs use `SPRING_BOOT_PORT` and `VITE_PORT`.

## Agent rules

When an AI agent works in a Git repository:

- Ask before initializing a repository, creating a remote, committing, pushing, rebasing, or running destructive commands.
- Show or summarize meaningful diffs before committing.
- Never read, print, stage, or commit `.env`.
- Keep generated project setup guidance in [Project Setup & Dotfiles](PROJECT-SETUP.md); use this guide for daily Git operations.

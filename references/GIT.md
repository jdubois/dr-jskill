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
2. Copy `.env.sample` to `.env` inside each worktree and choose unique port values.
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

The exact values should be different per worktree. The defaults remain the usual ports (`8080`, `5173`, `5432`) when `.env` is absent.

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

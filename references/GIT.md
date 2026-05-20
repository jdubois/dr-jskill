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

The most reliable way to run several worktrees in parallel is to use **one Dev Container per worktree**.

Why this works better than Git hooks:

1. Each worktree gets its own Docker Compose project and container network.
2. Spring Boot, Vite, and PostgreSQL can keep their normal internal ports (`8080`, `5173`, `5432`).
3. VS Code / Codespaces forwards those ports back to your machine without fixed host-port assignments.
4. There is no hook setup to install, debug, or keep in sync.

Recommended workflow:

```bash
git worktree add ../my-app-feature feature-branch
cd ../my-app-feature
code .
```

Then in VS Code:

1. Run **Dev Containers: Reopen in Container**
2. Start Spring Boot with `./mvnw spring-boot:run`
3. Start the front-end with `cd frontend && npm run dev` when present

The generated `.devcontainer/devcontainer.json` keeps the application on standard internal ports and points Spring Boot at the sidecar database:

```jsonc
{
  "containerEnv": {
    "SPRING_BOOT_PORT": "8080",
    "VITE_PORT": "5173",
    "SPRING_DATASOURCE_URL": "jdbc:postgresql://postgres:5432/mydb",
    "SPRING_DATASOURCE_USERNAME": "user",
    "SPRING_DATASOURCE_PASSWORD": "password",
    "SPRING_DOCKER_COMPOSE_ENABLED": "false"
  },
  "forwardPorts": [8080, 5173]
}
```

The generated `.devcontainer/docker-compose.yml` keeps PostgreSQL private to the container network instead of publishing a fixed host port:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
```

If you are not using a Dev Container, keep `.env` ignored and override `SPRING_BOOT_PORT`, `VITE_PORT`, and `POSTGRES_PORT` manually when you need multiple local host processes. That is now the fallback path, not the primary worktree workflow.

## Agent rules

When an AI agent works in a Git repository:

- Ask before initializing a repository, creating a remote, committing, pushing, rebasing, or running destructive commands.
- Show or summarize meaningful diffs before committing.
- Never read, print, stage, or commit `.env`.
- Keep generated project setup guidance in [Project Setup & Dotfiles](PROJECT-SETUP.md); use this guide for daily Git operations.

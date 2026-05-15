# 02 — Getting started

**In this chapter:**
- Generate your first Spring Boot application with a **single prompt**
- Watch the agent work and understand what it's doing
- Run the application locally and see it in a browser
- Commit the result as your first checkpoint

This is the "wow" moment. After this chapter you'll have a running, database-backed Todo app you built by writing four sentences of English.

---

## 1. Pick a working directory

You don't want the project inside `~/.copilot/skills/dr-jskill` — the skill lives there, but your project should live somewhere else.

```bash
mkdir -p ~/workshop
cd ~/workshop
```

## 2. Start Copilot CLI

From `~/workshop`, launch an interactive Copilot CLI session:

```bash
copilot
```

You should see a prompt waiting for input. Everything you type here goes to the agent.

> **Why start in an empty directory?** Copilot CLI uses the current working directory as the workspace — all file edits, `git` commits, and `./mvnw` commands will happen here. Starting empty keeps things clean.

### Which model should you pick?

Inside the Copilot CLI session you can switch models at any time with the `/model` command. We have run this entire workshop end-to-end with three of them, and here's how they compared:

| Model | When to pick it |
|---|---|
| **Claude Opus 4.7** | **Recommended default.** The most reliable of the three: slower, but produces more reliable working code, including the trickiest chapter (testing). Pick this one if you want to follow the workshop without detours. |
| **GPT-5.5** | Solid middle ground. Faster than Opus and cheaper. Good choice if you want to exercise the GraalVM native-image path. |
| **Claude Haiku 4.5** | Fastest and cheapest, but with regular minor bugs that you'll need to fix. You can use Haiku for a quick skim of the workshop, but **verify each checkpoint manually** (`curl`, `./mvnw verify`, read the log) and don't trust a "✅ all green" summary from the agent. |

If you're not sure: **start with Opus 4.7**. You can always switch mid-session with `/model` if a step is taking too long.

## 3. Your first prompt

Type (or paste) exactly this prompt into the Copilot CLI session:

```
Use Dr JSkill to create a new Todo List application.

- Features: add/edit/remove todos
- A fancy UI using Vite + Vue, with nice effects
- Data stored in a database
- No security
```

Press Enter and let the agent work.

## 4. What the agent is doing

The agent will do **a lot** of things in sequence. Roughly:

1. **Read Dr JSkill's instructions.** It opens `SKILL.md` and the relevant `references/*.md` files to understand your conventions.
2. **Call Spring Initializr.** It runs a Dr JSkill script that hits `https://start.spring.io` to bootstrap a `pom.xml`, `Application.java`, and a minimal project skeleton.
3. **Scaffold the Vue front-end.** It creates a `frontend/` directory, runs `npm create vite@latest`, and wires Vite to the Maven build via the Frontend Maven Plugin.
4. **Write the domain code.** Entities (`Todo`), repositories (`TodoRepository`), services (`TodoService`), and REST controllers (`TodoController`).
5. **Write the UI.** Vue components for the list, the form, toasts/effects, wired to the REST API.
6. **Add dotfiles.** `.gitignore`, `.editorconfig`, `.env.sample`, `.dockerignore`, `.gitattributes`, `Dockerfile`, `compose.yaml`, `.github/lsp.json`.
7. **Initialize git** and often make a first commit.

Expect this to take a few minutes. The agent may ask you to confirm certain shell commands (installing packages, running `npm`, etc.) — read each one and approve.

> **If the agent gets stuck** on a step, don't restart — just tell it what you see. Example: *"npm install failed with a permissions error on /usr/local/lib."* It will adapt.

## 5. Tour the generated project

Once the agent says "done" (or something equivalent), open a **second terminal** in the same directory and explore.

```bash
cd ~/workshop
ls -la
```

You should see something like:

```
.editorconfig
.env.sample
.github/
.gitignore
Dockerfile
Dockerfile-native
compose.yaml
frontend/                 <-- Vue.js front-end
mvnw                      <-- Maven wrapper (no local Maven install needed)
mvnw.cmd
pom.xml                   <-- Spring Boot backend
src/
  main/
    java/                 <-- Todo, TodoRepository, TodoController, ...
    resources/
      application.properties
  test/
    java/                 <-- tests (we'll revisit in Chapter 6)
```

Don't worry if some details differ — the agent is non-deterministic. As long as you see a `pom.xml`, a `frontend/`, and a `compose.yaml`, you're good.

We'll dissect the structure in Chapter 3. For now, just run it.

## 6. Run the application

In the terminal where you opened the project (not the Copilot CLI session), start the app:

```bash
./mvnw spring-boot:run
```

First run is slow — Maven downloads Spring Boot, dependencies compile, and Vite builds the front-end. Grab a coffee.

A few things happen in parallel:

- **Docker Compose starts PostgreSQL** automatically (thanks to `spring-boot-docker-compose` — the `compose.yaml` is detected at boot).
- **Hibernate creates the schema** from the `@Entity` classes (`spring.jpa.hibernate.ddl-auto=update`).
- **The Vite dev server builds** the front-end bundle and Spring Boot serves it from `/`.

When you see:

```
Started Application in X.X seconds
```

open a browser at [http://localhost:8080](http://localhost:8080). You should see the Todo UI. Try adding, editing, and deleting a todo.

## 7. Poke the REST API

In a third terminal:

```bash
curl http://localhost:8080/api/todos
```

You'll see a JSON array of todos. The exact URL might differ slightly (`/api/todos`, `/todos`, …) — have a quick look at your `TodoController.java` to confirm the base path.

## 8. Stop the application

In the terminal running `./mvnw spring-boot:run`, press **Ctrl+C**. Spring Boot shuts down cleanly and stops the Postgres container too.

## 9. Commit the checkpoint

In the project directory:

```bash
git status
```

If the agent already committed, you'll see *nothing to commit*. Otherwise, commit now:

```bash
git add .
git commit -m "Initial Todo application generated by Dr JSkill"
```

This commit is your **safe harbor**. If later chapters go sideways, you can always `git reset --hard` back to here.

## 10. (Optional) Publish to GitHub

This step is **optional** for the early chapters — you can keep working locally. But **Chapter 8 (Deployment) needs your project on GitHub**: the Azure Container Apps recipe pushes images to `ghcr.io/<owner>/<repo>` and pins the CI/CD OIDC credential to your repo. If you plan to reach the deployment chapter, do this now so the history of every chapter is already there when you need it.

Ask the agent to drive it — per skill rules, it will confirm owner, name, and visibility with you before running any git command:

```
Use Dr JSkill to publish this generated project to a new GitHub repository.

- Ask me whether to use my personal account or an organisation, the repo
  name, and whether it should be public or private. Default branch is main.
- Use `gh repo create` with `--source=. --remote=origin --push`.
- After pushing, export GHCR_OWNER, GHCR_REPO, and GHCR_IMAGE so I can
  reuse them in later chapters.
- Do not run any git command until I confirm.
```

Verify when it's done:

```bash
git remote -v                               # shows origin on github.com
git check-ignore -v .env                    # confirms .env is ignored
gh repo view --web                          # opens the repo in your browser
```

> **Reminder:** if `git check-ignore -v .env` doesn't match anything, stop and fix `.gitignore` **before** the next push — `.env` holds real secrets.

If you'd rather skip this for now, you can always come back and run it before Chapter 8.

---

**Try this yourself**

Before moving on, ask the agent something small to get a feel for iterative editing. Back in the Copilot CLI session, try:

```
Add a "created_at" timestamp to each todo, displayed in the UI next to the title.
```

Watch what files it touches. Run the app again. Then either keep the change or revert it:

```bash
git restore .
```

---

**Checkpoint**

- `./mvnw spring-boot:run` launches the app and you can see the UI at http://localhost:8080
- `curl http://localhost:8080/api/todos` returns JSON (possibly an empty array `[]`)
- Your working tree is clean (`git status` shows no uncommitted changes)

**Next →** [Chapter 3 — Anatomy of the generated app](03-generated-application.md)

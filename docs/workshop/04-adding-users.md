# 04 — Adding users

**In this chapter:**
- Give the agent a **second, bigger prompt** that touches the backend, the database, and the UI
- **Review the diff** the agent produces — the most important skill in this workshop
- Iterate (ask for small fixes) rather than restart
- Commit the result

By the end, each todo will be assigned to one of three hardcoded users (**julien**, **alice**, **bob**), and the list will be filterable by user — all without implementing real authentication.

---

## 1. Setup the session

If Copilot CLI isn't already running in your project directory:

```bash
cd ~/workshop
copilot
```

Confirm your working tree is clean:

```bash
git status
```

It should say *nothing to commit*. If not, commit or stash first — you want the next change to be isolated in its own diff.

## 2. The prompt

Paste into the Copilot CLI session:

```
I want to assign those todos to users, but I don't want to implement authentication.
Can you use a simple user management system with hardcoded users in the database?

There would be a dropdown to select the user when creating a todo, and the list of
todos would be filtered by user.

User names are: julien, alice, bob.
```

Press Enter. Expect the agent to work for a couple of minutes.

## 3. What you'll (probably) see

The agent will make changes along several axes. Typical sequence:

1. **New entity** — `AppUser.java` (or `User.java`) with `id` and `name` fields.
2. **New repository** — `AppUserRepository.java`.
3. **Relationship on `Todo`** — a `@ManyToOne` to `AppUser` (`user_id` foreign key).
4. **Data seeding** — a `CommandLineRunner` or `@PostConstruct` method that inserts the three users on startup if they don't exist.
5. **REST endpoints** — something like `GET /api/users` and filter parameter on `GET /api/todos?userId={id}`.
6. **UI changes** — a user dropdown in the "create todo" form, another dropdown / filter above the todo list.

> **Exact choices vary.** The agent is not deterministic. Some runs might seed users via `application.properties` + a config bean. Others might add a `@Service` layer. Both are fine — *as long as the behavior matches your ask*.

## 4. Review the diff

**This is the most important step of the workshop.** Before running anything, look at what changed.

In a second terminal:

```bash
cd ~/workshop
git status
git diff
```

You'll see changes across both the backend (`src/main/java/…`) and the front-end (`frontend/src/…`). Read every hunk. Ask yourself, for each file:

- **"Does this match what I asked for?"** — are the three users named correctly? Is the filter on the list, not just on the create form?
- **"Is anything missing?"** — did the agent update the delete/edit flows too, or only create?
- **"Is anything too much?"** — did the agent add an authentication dependency even though I said "no security"?
- **"Will this break the existing behavior?"** — the previous todos may not have a `user_id` yet. Is that handled?

If something looks off, don't edit by hand. Go back to the agent.

## 5. Iterate with follow-up prompts

Write short, specific corrections. A few realistic examples:

**If the agent added real auth:**
```
I don't want Spring Security. Remove spring-boot-starter-security from pom.xml
and any related configuration — the "select user" dropdown is enough for now.
```

**If the filter is missing:**
```
The dropdown on the create form works, but the todo list isn't filtered by user.
Add a user filter dropdown above the list too.
```

**If existing todos break:**
```
Existing todos created before this change don't have a user assigned and aren't
shown in the list. Assign them to "julien" automatically the first time the app
starts with the new schema.
```

**If the UI looks wrong:**
```
The user dropdown should show the user's name, not their numeric id.
```

Each follow-up prompt produces a new diff. Re-read, accept, or iterate again.

## 6. Run the app

Once the diff looks right:

```bash
./mvnw spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). You should see:

- A user dropdown (julien / alice / bob) on the create-todo form
- A filter above the list (maybe "All users" + each of the three)
- Creating a todo while "alice" is selected assigns it to alice
- Filtering by "bob" hides alice's todos

Poke the API:

```bash
curl http://localhost:8080/api/users
curl "http://localhost:8080/api/todos?userId=1"
```

If any behavior is off, stop the app (Ctrl+C) and give the agent another follow-up. This iterate-review-run-commit loop is the entire workshop in miniature.

## 7. Peek at the database (optional)

While the app is running, in a new terminal:

```bash
docker compose exec postgres psql -U user -d mydb
```

At the `psql` prompt:

```sql
\dt               -- list tables: todo, app_user (or similar)
SELECT * FROM app_user;
SELECT * FROM todo;
\q
```

You should see three rows in `app_user`. Hibernate created the tables; the agent's seeding code inserted the users.

## 8. Commit the checkpoint

Stop the app (Ctrl+C). Back in the project terminal:

```bash
git add .
git commit -m "Add hardcoded user management with per-user todo filtering"
```

If anything goes wrong in a later chapter, `git reset --hard HEAD~1` sends you back here.

---

## Common pitfalls (and how the agent handles them)

| Symptom | Likely cause | Follow-up prompt |
|---|---|---|
| App fails to start with "column user_id is null" | Existing todos don't have a user_id, and the new column is `NOT NULL` | *"Backfill existing todos with user julien before enforcing NOT NULL."* |
| Creating a todo returns 400 | Front-end doesn't send `userId` | *"The POST /api/todos request body should include userId."* |
| Filter shows no todos even for the right user | Front-end sends user name, backend expects id (or vice versa) | *"Align the filter: use user id in the query parameter, not name."* |
| Users get created twice on restart | Seed runs unconditionally | *"Only insert users on startup if the table is empty."* |

---

**Try this yourself**

After committing, ask for one more small refinement — for example:

```
Show the user's name next to each todo in the list, like a small badge.
```

or:

```
Make julien the default user when the app first loads.
```

Small, scoped prompts are the easiest to review.

---

**Checkpoint**

- `./mvnw spring-boot:run` starts cleanly with no errors
- You can create a todo under each of julien / alice / bob
- The list filter actually filters by user
- `git log --oneline` shows your new commit

**Next →** [Chapter 5 — A more professional front-end](05-professional-frontend.md)

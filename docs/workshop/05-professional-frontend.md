# 05 — A more professional front-end

**In this chapter:**
- Use prompts to give the front-end a **professional-looking shell**: top navigation, consistent layout, Bootstrap styling
- Add the small touches that make an app feel polished: **empty states**, **toasts**, **loading spinners**, **form validation**
- Practice steering the agent's UX choices (colors, density, spacing) without writing CSS yourself

No new backend work in this chapter. We're refining what's already there.

---

## 1. What "professional-looking" means here

The app from Chapter 4 works, but it probably looks like a prototype — a form above a list, maybe no nav bar, minimal visual hierarchy. A "professional" version adds:

- A **top navigation bar** with the app name and links
- A **consistent page layout** (centered content, max-width, padding)
- **[Bootstrap](https://getbootstrap.com/)** (already a default Dr JSkill choice) applied meaningfully — cards, buttons, form groups — not just "imported but unused"
- **Empty states** — what the user sees when there are no todos yet
- **Toasts** — small popup notifications for "Todo created", "Todo deleted"
- **Loading spinners** — shown while API calls are in flight
- **Inline form validation** — the create button is disabled when the title is empty

Each of these is a few-line prompt away.

## 2. Add Bootstrap structure

Start with the shell. In your Copilot CLI session:

```
Polish the front-end using Bootstrap 5:

- Add a top navbar with the app title "Todo List" on the left and a small
  hint on the right that the UI has no real authentication.
- Wrap page content in a Bootstrap container with a reasonable max-width.
- Use Bootstrap cards to group the "create todo" form and the todo list.
- Keep the existing behavior — this is pure styling.
```

Review the diff before running. Typical files touched:

- `frontend/src/App.vue` — layout wrapper
- `frontend/src/components/Navbar.vue` (new)
- `frontend/src/views/*.vue` — card wrappers
- Maybe `frontend/src/main.js` to import Bootstrap if it wasn't already

Then:

```bash
./mvnw spring-boot:run
```

Open http://localhost:8080. You should see a navbar and nicely contained content.

Commit:

```bash
git add . && git commit -m "Add Bootstrap navbar, container layout, and cards"
```

## 3. Empty states

Back in Copilot CLI:

```
When there are no todos for the currently selected user, show a friendly empty
state inside the todo list card — a muted message like "No todos yet — add one
above." — instead of an empty area.
```

Run the app. Delete all todos for one user and switch to that user — you should see the message.

Commit.

## 4. Toasts for feedback

```
Add toast notifications:

- Show a green toast "Todo created" when the user creates a todo.
- Show a red toast "Todo deleted" when a todo is removed.
- Toasts should auto-dismiss after ~3 seconds and stack in the bottom-right corner.

Use Bootstrap toasts — do not add a third-party toast library.
```

The "do not add a third-party toast library" is a deliberate constraint. Without it, the agent may install `vue-toastification` or similar. Teaching yourself to **constrain the agent's dependency choices** is a workshop skill of its own.

Run, test, commit.

## 5. Loading spinners

```
Show a small Bootstrap spinner in the todo list card while todos are being
fetched. The create button should also show a spinner + "Saving..." label
while the POST is in flight, and be disabled during that time.
```

These tend to feel fast locally — to see the spinner, throttle the network in your browser's DevTools (Network tab → "Slow 3G"), reload the page, and watch.

Commit.

## 6. Inline form validation

```
Disable the "Add" button when the todo title is empty or only whitespace.
Highlight the input with Bootstrap's is-invalid class when the user has tried
to submit an empty title, with a small red "Title is required" message below it.
```

Run, try submitting an empty title, see the validation kick in.

Commit.

## 7. Review what the agent produced

Before moving on, spend five minutes reading what changed across chapters 2 → 5:

```bash
git log --oneline
git diff HEAD~5 HEAD -- frontend/
```

You didn't write any CSS. You didn't touch Vue syntax. Yet you have:

- A layout
- Navigation
- Cards, spacing, and typography
- Empty states, toasts, spinners, validation

The point of this chapter isn't the toasts themselves. It's the rhythm:

> **Prompt → review diff → run → iterate → commit.**

That rhythm scales to any UX change. The same prompts would polish a completely different app.

---

## Useful prompt patterns for UX work

| Goal | Pattern |
|---|---|
| Scope a change tightly | *"Only change `TodoList.vue` — keep other components as-is."* |
| Prevent new dependencies | *"Do not install any new npm packages; use what's already there."* |
| Control spacing | *"Use Bootstrap's `gap-3` / `mb-4` utilities rather than custom CSS."* |
| Match a screenshot | *"Make it look like [paste URL or attach image]."* |
| Request a dark mode later | *"Respect `prefers-color-scheme`; no extra toggle needed."* |

---

**Try this yourself**

Pick one of these and ask the agent:

- *"Add a small count badge on the navbar showing how many todos are open for the current user."*
- *"Animate new todos sliding in from the top when they're added."*
- *"Add keyboard shortcut: press `n` to focus the 'new todo' input."*

Each is small enough to fit in a single diff review.

---

**Checkpoint**

- App still runs (`./mvnw spring-boot:run`)
- UI has: navbar, cards, empty state, toasts, spinners, disabled-while-empty button
- `git log --oneline` shows several commits from this chapter — one per feature

**Next →** [Chapter 6 — Testing](06-testing.md)

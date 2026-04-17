# 01 — Setup

**In this chapter:**
- Install the tools you need: **Node.js**, **Java**, **Docker**
- Install and sign in to **GitHub Copilot CLI**
- Install the **Dr JSkill** skill so Copilot CLI can see it
- Install **JDTLS** so the agent has real Java code intelligence

Everything you install here is reusable well beyond this workshop. None of it is workshop-specific.

---

## 1. Install the prerequisites

### 1.1 Node.js 24 and npm 11

The generated front-end (Vue.js) needs Node.js to install dependencies and build the production bundle.

**macOS (Homebrew):**
```bash
brew install node@24
brew link --overwrite node@24
```

**Windows (winget):**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Linux (NodeSource):**
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Any OS (recommended — version manager):** install [mise](https://mise.jdx.dev) or [volta](https://volta.sh) and let it pin Node per project.

**Verify:**
```bash
node --version   # should print v24.x.x
npm --version    # should print 11.x.x
```

### 1.2 Java 25

Spring Boot 4 requires Java 25.

**macOS (Homebrew):**
```bash
brew install --cask temurin@25
```

**Windows (winget):**
```powershell
winget install EclipseAdoptium.Temurin.25.JDK
```

**Linux (Debian/Ubuntu):**
```bash
wget -O- https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo tee /etc/apt/keyrings/adoptium.asc
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt-get update && sudo apt-get install temurin-25-jdk
```

**Verify:**
```bash
java --version   # should show "openjdk 25.x.x" or similar
```

> If `java --version` prints an older version, check `JAVA_HOME`. On macOS: `export JAVA_HOME=$(/usr/libexec/java_home -v 25)`.

### 1.3 Docker

Docker runs PostgreSQL and later your packaged application in containers.

- **macOS / Windows:** install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Start it — the Docker whale must be in your menu bar.
- **Linux:** follow the [official install guide](https://docs.docker.com/engine/install/) for your distro, then `sudo systemctl start docker`.

**Verify:**
```bash
docker --version
docker compose version
docker ps           # must succeed — no "Cannot connect to the Docker daemon"
```

## 2. Install GitHub Copilot CLI

GitHub Copilot CLI is the AI coding agent we'll use for the whole workshop.

**Requirements:** A GitHub account with an active **GitHub Copilot** subscription (Individual, Business, or Enterprise).

**Install:**

```bash
npm install -g @github/copilot
```

**Sign in:**

```bash
copilot
```

On first launch, Copilot CLI opens a browser window for device-code authentication. Follow the prompt, enter the code, and authorize the app. After that, `copilot` drops you into an interactive session.

**Exit the session** (`/exit` or Ctrl+D) for now — we'll come back to it in Chapter 2.

**Verify:**

```bash
copilot --version
```

## 3. Install the Dr JSkill skill

Copilot CLI discovers skills from a known directory on your machine. We'll clone Dr JSkill there.

```bash
mkdir -p ~/.copilot/skills
cd ~/.copilot/skills
git clone https://github.com/jdubois/dr-jskill.git
```

> **Using a fork?** If you plan to customize the skill (change defaults, bump versions, tweak conventions), fork `jdubois/dr-jskill` on GitHub first and clone your fork instead. The root [`README.md`](../README.md#fork-or-clone-this-repository) shows how.

**Verify the skill is loaded** by starting a Copilot CLI session in any directory and running:

```
/help
```

You should see Dr JSkill listed among the available skills. If not, see [Appendix B — Troubleshooting](appendix-b-troubleshooting.md).

## 4. Install JDTLS (Java code intelligence)

**Why this matters.** Copilot CLI has a built-in `lsp` tool that gives the agent *semantic* understanding of Java code — find-definition, find-references, rename, hover, and real-time error checking. Without a Java language server behind it, the agent falls back to text search (grep), which is slower and less accurate. For a Spring Boot workshop, JDTLS is the difference between an agent that edits confidently and one that guesses.

Dr JSkill generates a `.github/lsp.json` in every project it creates, so Copilot CLI wires JDTLS automatically — **as long as the `jdtls` binary is on your `PATH`**.

### Install JDTLS

| Platform | Command |
|---|---|
| macOS | `brew install jdtls` |
| Linux (Homebrew on Linux) | `brew install jdtls` |
| Linux (manual) | Download from [eclipse-jdtls releases](https://github.com/eclipse-jdtls/eclipse.jdt.ls/releases), extract, and add the `bin/` directory to `PATH` |
| Windows | Use WSL + `brew install jdtls`, or download the release and add to `PATH` |

**Verify:**
```bash
jdtls --help
```

For deeper background (workspace tuning, verifying the server is live in a session, gotchas), see [`references/JDTLS.md`](../references/JDTLS.md).

## 5. Install a Git client

You probably have `git` already. If not:

- **macOS:** `brew install git` (also comes with Xcode Command Line Tools)
- **Windows:** install [Git for Windows](https://git-scm.com/download/win)
- **Linux:** `sudo apt-get install git` (or your distro's equivalent)

**Verify:**
```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 6. Sanity check

Run all of these. Every line should print something sensible — no errors.

```bash
node --version
java --version
docker ps
git --version
jdtls --help > /dev/null && echo "jdtls OK"
copilot --version
```

---

**Checkpoint**

You're installed. Nothing to commit yet — the first git repository comes in Chapter 2, when we generate the project.

If anything above failed, head to [Appendix B — Troubleshooting](appendix-b-troubleshooting.md) or ask the facilitator before continuing. Chapter 2 assumes every tool in the sanity check works.

**Next →** [Chapter 2 — Getting started](02-getting-started.md)

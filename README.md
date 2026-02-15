# Dr JSkill

**An Agent Skill for creating Spring Boot applications following Julien Dubois' best practices.**

Generate Spring Boot 4.x projects with Java 21, PostgreSQL, Docker support, and your choice of front-end framework (Vue.js, React, Angular, or Vanilla JS).

Dr JSkill is an agent skill: it is meant to work with tools like GitHub Copliot CLI or Claude Code.

## What This Skill Provides

- **Automated project generation** from https://start.spring.io with the latest available Spring Boot version
- **Docker-ready** applications with standard and native image builds
- **Multiple front-end options**: Vue.js (default), React, Angular, or Vanilla JS
- **Production-ready** configurations with PostgreSQL, REST APIs, and monitoring

## Comparison with JHipster

[JHipster](https://jhipster.tech) is an awesome Spring Boot application generator, also created by Julien Dubois.

Dr JSkill builds on the JHipster experience:

- It generates applications that should be similar to what JHipster creates
- It is closer to Julien Dubois' tastes, as JHipster is ultimately the work of hundreds of people
- Dr JSkill is an AI agent: it is not deterministic, it is slower and can cost some money to execute. But it is easier to tune, more versatile, and can update projects easily.

At the moment, Dr JSkill is an experiment. If it is successful, it might join the JHipster organization.

## Documentation

For complete documentation, usage instructions, and best practices, see **[SKILL.md](SKILL.md)**.

Additional references:
- [Front-end Development Guides](references/) (Vue.js, React, Angular, Vanilla JS)
- [Database Best Practices](references/DATABASE.md)
- [Docker Deployment](references/DOCKER.md)
- [Testing Guide](references/TEST.md)

## Using This Skill with AI Assistants

This is an [Agent Skill](https://agentskills.io) that can be used with AI coding assistants that support the Agent Skills specification.

### Fork or clone this repository

In order to use this skill, and modify it to your needs, you can fork this repository on GitHub, or simply clone it to your local machine.

#### Forking on GitHub

**Using the GitHub website:**
1. Navigate to the repository on GitHub
2. Click the "Fork" button in the top-right corner
3. Select your account as the destination
4. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/dr-jskill.git
   ```

**Using the GitHub CLI:**
1. Install the [GitHub CLI](https://cli.github.com/) if you haven't already
2. Fork and clone in one command:
   ```bash
   gh repo fork jdubois/dr-jskill --clone
   ```
   This will fork the repository to your GitHub account and clone it to your local machine.

#### Just cloning (without forking)

If you only want to use the skill locally without maintaining your own fork:
```bash
git clone https://github.com/jdubois/dr-jskill.git
```

### GitHub Copilot CLI

Configure skills for GitHub Copilot CLI by placing them in the skills directory:

1. Create the skills directory if it doesn't exist:
   ```bash
   mkdir -p ~/.github-copilot/skills
   ```

2. Clone or copy this skill to the skills directory:
   ```bash
   git clone <repository-url> ~/.github-copilot/skills/jdubois-skill
   # Or copy: cp -r /path/to/jdubois-skill ~/.github-copilot/skills/
   ```

3. Use GitHub Copilot CLI as usual - the skill will be automatically loaded:
   ```bash
   gh copilot suggest "create an application using the jdubois-skill"
   ```

The skill will be available for all `gh copilot` commands.

### GitHub Copilot (VS Code)

1. Open VS Code Settings (`Cmd+,` on macOS or `Ctrl+,` on Windows/Linux)
2. Search for `github.copilot.chat.codeGeneration.instructions`
3. Click "Edit in settings.json"
4. Add a skill entry:
   ```json
   {
     "github.copilot.chat.codeGeneration.instructions": [
       {
         "file": "/absolute/path/to/jdubois-skill/SKILL.md"
       }
     ]
   }
   ```
5. Restart VS Code for changes to take effect

Alternatively, you can enable skills globally by placing them in a specific directory:
- macOS/Linux: `~/.github-copilot/skills/`
- Windows: `%USERPROFILE%\.github-copilot\skills\`

### Claude Code / Windsurf (VS Code)

Skills are automatically discovered from configured skill directories.

1. Clone or copy this skill to a directory on your system:
   ```bash
   git clone <repository-url> ~/skills/jdubois-skill
   ```

2. Configure the skills directory in VS Code Settings:
   - Open Settings (`Cmd+,` or `Ctrl+,`)
   - Search for "skills" or look for your assistant's skill configuration
   - Add the path to your skills directory: `~/skills/`

3. Restart VS Code

Claude Code will automatically discover all skills in the configured directory and load them when relevant to your task.

### Other Compatible Assistants

This skill follows the [Agent Skills specification](https://agentskills.io/specification) and works with any compatible AI assistant. Refer to your assistant's documentation for configuration instructions.

## Requirements

- bash, curl, unzip
- Java 21
- Docker (for containerized deployments)
- Node.js 22.x and npm 10.x (for front-end development)

## License

See [LICENSE](LICENSE) file for details.


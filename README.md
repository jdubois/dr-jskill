# Spring Boot skill for AI Assistants by Julien Dubois

**An Agent Skill for creating Spring Boot applications following Julien Dubois' best practices.**

Generate Spring Boot 4.x projects with Java 21, PostgreSQL, Docker support, and your choice of front-end framework (Vue.js, React, Angular, or Vanilla JS).

## What This Skill Provides

- **Automated project generation** from start.spring.io with latest Spring Boot version
- **Docker-ready** applications with standard and native image builds
- **Multiple front-end options**: Vue.js (default), React, Angular, or Vanilla JS
- **Production-ready** configurations with PostgreSQL, REST APIs, and monitoring

## Documentation

For complete documentation, usage instructions, and best practices, see **[SKILL.md](SKILL.md)**.

Additional references:
- [Front-end Development Guides](references/) (Vue.js, React, Angular, Vanilla JS)
- [Database Best Practices](references/DATABASE.md)
- [Docker Deployment](references/DOCKER.md)
- [Testing Guide](references/TEST.md)

## Using This Skill with AI Assistants

This is an [Agent Skill](https://agentskills.io) that can be used with AI coding assistants that support the Agent Skills specification.

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


#!/usr/bin/env node
// Shared version utilities for dr-jskill scripts

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, copyFileSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.ROOT_DIR || resolve(__dirname, '..', '..');
const VERSIONS_FILE = process.env.VERSIONS_FILE || resolve(ROOT_DIR, 'versions.json');
const ASSETS_DIR = resolve(ROOT_DIR, 'assets');
const DOTFILES_MARKER = '# === dr-jskill additions ===';

/** Default timeout for HTTP requests (10 seconds) */
const FETCH_TIMEOUT_MS = 10_000;

/** Cached versions.json data — parsed once per process */
let _versionsCache = undefined;

/** Read a value from versions.json (cached after first read) */
function getVersionValue(key, defaultValue = '') {
  if (_versionsCache === undefined) {
    _versionsCache = existsSync(VERSIONS_FILE)
      ? JSON.parse(readFileSync(VERSIONS_FILE, 'utf8'))
      : null;
  }
  if (_versionsCache === null) return defaultValue;
  const value = _versionsCache[key];
  return value != null && String(value).trim() !== '' ? String(value) : defaultValue;
}

export function getJavaVersion() { return getVersionValue('javaVersion', '25'); }
export function getBootPreferredMajor() { return getVersionValue('springBootPreferredMajor', '4'); }
export function getBootFallback() { return getVersionValue('springBootFallback', '4.0.5'); }
export function getPostgresVersion() { return getVersionValue('postgresVersion', '18'); }
export function getTemurinVersion() { return getVersionValue('temurinVersion', '25'); }
export function getMavenMinVersion() { return getVersionValue('mavenMinVersion', '3.8.0'); }
export function getGraalvmVersion() { return getVersionValue('graalvmVersion', '25'); }
export function getNodeVersion() { return getVersionValue('nodeVersion', '24.15.0'); }
export function getNpmVersion() { return getVersionValue('npmVersion', '11.12.1'); }
export function getViteVersion() { return getVersionValue('viteVersion', '8'); }
export function getMavenFrontendPluginVersion() { return getVersionValue('mavenFrontendPluginVersion', '1.15.1'); }
export function getVueVersion() { return getVersionValue('vueVersion', '3'); }
export function getPiniaVersion() { return getVersionValue('piniaVersion', '3'); }
export function getVueRouterVersion() { return getVersionValue('vueRouterVersion', '5'); }
export function getReactVersion() { return getVersionValue('reactVersion', '19'); }
export function getReactRouterVersion() { return getVersionValue('reactRouterVersion', '7'); }
export function getAngularVersion() { return getVersionValue('angularVersion', '21'); }
export function getBootstrapVersion() { return getVersionValue('bootstrapVersion', '5.3.8'); }
export function getBootstrapIconsVersion() { return getVersionValue('bootstrapIconsVersion', '1.13.1'); }
export function getTestcontainersVersion() { return getVersionValue('testcontainersVersion', '2.0.0'); }
export function getSpringFrameworkVersion() { return getVersionValue('springFrameworkVersion', '7.0'); }
export function getHibernateVersion() { return getVersionValue('hibernateVersion', '7.1'); }

/**
 * Strip legacy qualifiers (.RELEASE, .GA) that Spring Boot 4+ no longer uses.
 * E.g. "4.0.2.RELEASE" → "4.0.2", "4.0.2" → "4.0.2"
 */
function stripLegacyQualifier(version) {
  return version.replace(/\.(RELEASE|GA)$/i, '');
}

/**
 * Check whether a Spring Boot version exists on Maven Central.
 * Returns true if the POM can be found (HTTP 200).
 */
async function existsOnMavenCentral(version) {
  const groupPath = 'org/springframework/boot/spring-boot';
  const url = `https://repo1.maven.org/maven2/${groupPath}/${version}/spring-boot-${version}.pom`;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve preferred Spring Boot version with fallback.
 * Fetches the default boot version from start.spring.io metadata,
 * validates it exists on Maven Central, and strips legacy qualifiers.
 * Only considers versions ≥ 4.x.
 */
export async function resolveBootVersion(preferredMajor, fallback) {
  preferredMajor = preferredMajor || getBootPreferredMajor();
  fallback = fallback || getBootFallback();
  try {
    const response = await fetch('https://start.spring.io', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Warning: start.spring.io returned HTTP ${response.status}. Using fallback ${fallback}.`);
      return fallback;
    }
    let metadata;
    try {
      metadata = await response.json();
    } catch {
      console.error(`Warning: start.spring.io returned invalid JSON. Using fallback ${fallback}.`);
      return fallback;
    }

    // Try multiple metadata paths (API may evolve)
    const fetched = metadata?.bootVersion?.default
      || metadata?.platformVersion?.default
      || metadata?.bootVersion;

    if (!fetched || typeof fetched !== 'string') {
      console.error(`Warning: could not read bootVersion from start.spring.io metadata. Using fallback ${fallback}.`);
      return fallback;
    }

    const cleaned = stripLegacyQualifier(fetched);

    if (cleaned.startsWith(`${preferredMajor}.`)) {
      // Verify the version actually exists on Maven Central
      if (await existsOnMavenCentral(cleaned)) {
        return cleaned;
      }
      console.error(`⚠️  Spring Boot ${cleaned} (from start.spring.io) is not on Maven Central yet. Using fallback ${fallback}.`);
      return fallback;
    }

    // start.spring.io default doesn't match our preferred major — scan available versions
    const values = metadata?.bootVersion?.values || [];
    const candidates = values
      .map(v => typeof v === 'string' ? v : v?.id)
      .filter(Boolean)
      .map(stripLegacyQualifier)
      .filter(v => v.startsWith(`${preferredMajor}.`) && !v.includes('-'));
    // Pick the highest stable version from the list
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      if (await existsOnMavenCentral(candidates[0])) {
        return candidates[0];
      }
    }

    console.error(
      `⚠️  start.spring.io default bootVersion (${fetched}) does not match preferred major ${preferredMajor}. Using fallback ${fallback}. Override with --boot-version if needed.`
    );
    return fallback;
  } catch (err) {
    console.error(`Warning: Failed to fetch bootVersion from start.spring.io: ${err?.message || String(err)}. Using fallback ${fallback}.`);
    return fallback;
  }
}

/** Normalize dependency list, ensuring unique comma-separated values */
export function joinDependencies(...args) {
  const all = args.join(',').split(',').map(s => s.trim()).filter(Boolean);
  return [...new Set(all)].join(',');
}

/**
 * Download a file from a URL and stream it to disk.
 * Uses Node.js built-in fetch API with streaming to avoid loading the entire
 * response into memory.
 */
export async function downloadFile(url, dest) {
  console.log(`  ⬇  Downloading from ${new URL(url).hostname}…`);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status} ${response.statusText}`);
  }
  const fileStream = createWriteStream(dest);
  await pipeline(Readable.fromWeb(response.body), fileStream);
}

/**
 * Extract a zip file to the current directory.
 * Uses platform-appropriate tools (unzip on Unix, PowerShell on Windows).
 */
export function extractZip(zipPath) {
  if (process.platform === 'win32') {
    execFileSync('powershell', [
      '-NoLogo', '-NoProfile', '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '.' -Force`,
    ], { stdio: 'inherit' });
  } else {
    execFileSync('unzip', ['-q', zipPath], { stdio: 'inherit' });
  }
}

/**
 * Download and extract a Spring Boot project from start.spring.io.
 * Automatically strips legacy .RELEASE/.GA qualifiers from bootVersion.
 */
export async function downloadAndExtractProject(params) {
  if (params.bootVersion) {
    params.bootVersion = stripLegacyQualifier(params.bootVersion);
  }
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `https://start.spring.io/starter.zip?${query}`;
  const zipFile = `${params.baseDir}.zip`;

  await downloadFile(url, zipFile);
  console.log('  📦 Extracting project…');
  extractZip(zipFile);
  unlinkSync(zipFile);

  // Ensure pom.xml has <start-class> for process-aot main class detection
  if (params.packageName && params.name) {
    const mainClassName = toCamelCase(params.name) + 'Application';
    patchPomStartClass(params.baseDir, `${params.packageName}.${mainClassName}`);
  }
  console.log('  ✅ Project extracted successfully.');
}

/**
 * Convert a kebab-case or snake_case name to CamelCase.
 * e.g. "my-spring-app" → "MySpringApp"
 */
function toCamelCase(name) {
  return name
    .split(/[-_]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Inject <start-class> property into an existing pom.xml.
 * Spring Boot 4's process-aot goal requires an explicit main class.
 */
export function patchPomStartClass(projectDir, mainClass) {
  const pomPath = join(projectDir, 'pom.xml');
  if (!existsSync(pomPath)) return;
  let pom = readFileSync(pomPath, 'utf8');
  if (pom.includes('<start-class>')) return; // Already present
  // Insert after <java.version>...</java.version> inside <properties>
  const javaVersionTag = /<java\.version>[^<]*<\/java\.version>/;
  const match = pom.match(javaVersionTag);
  if (match) {
    pom = pom.replace(javaVersionTag, `${match[0]}\n\t\t<start-class>${mainClass}</start-class>`);
    writeFileSync(pomPath, pom, 'utf8');
  }
}

/**
 * Append or merge .gitignore content. Preserves existing content; appends our template once.
 */
export function mergeGitignore(projectDir) {
  const target = join(projectDir, '.gitignore');
  const templatePath = resolve(ASSETS_DIR, 'gitignore');
  if (!existsSync(templatePath)) return;
  const templateContent = readFileSync(templatePath, 'utf8');
  if (!existsSync(target)) {
    writeFileSync(target, templateContent, 'utf8');
    return;
  }
  const current = readFileSync(target, 'utf8');
  if (current.includes(DOTFILES_MARKER)) return; // Already appended
  const merged = `${current.trimEnd()}\n\n${DOTFILES_MARKER}\n${templateContent.trim()}\n`;
  writeFileSync(target, merged, 'utf8');
}

function copyAssetIfMissing(assetName, destPath) {
  const assetPath = resolve(ASSETS_DIR, assetName);
  if (!existsSync(assetPath)) return;
  if (existsSync(destPath)) return;
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  copyFileSync(assetPath, destPath);
}

function writeTextFileIfMissing(destPath, content) {
  if (existsSync(destPath)) return;
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, content, 'utf8');
}

/**
 * Comment out the frontend COPY lines in a Dockerfile when no frontend is present.
 *
 * We intentionally *comment* the lines rather than delete them: if the user later
 * scaffolds a `frontend/` directory (e.g. adds a Vue/React app to a `web` project),
 * they simply uncomment one line instead of hunting down why `docker build` fails
 * with "/app/frontend doesn't exist".
 */
function stripFrontendCopyLines(filePath) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, 'utf8');
  // Replace the comment + COPY frontend block with a commented-out version
  // that includes a clear hint for future-you.
  content = content.replace(
    /(^|\n)# Copy frontend directory[^\n]*\n(?:#[^\n]*\n)*COPY frontend ([^\n]+)\n/g,
    '$1# Uncomment the next line if you add a frontend/ directory\n' +
    '# (e.g. Vue/React/Angular via the frontend-maven-plugin build).\n' +
    '# COPY frontend $2\n'
  );
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Write the StartupInfoListener.java to the project's `<root-package>/config/` folder
 * (REQUIRED per references/SPRING-BOOT-4.md). No-op if the file already exists or no
 * package name is provided.
 */
export function writeStartupInfoListener(projectDir, packageName) {
  if (!packageName) return;
  const templatePath = resolve(ASSETS_DIR, 'StartupInfoListener.java.tmpl');
  if (!existsSync(templatePath)) return;
  const packagePath = packageName.replace(/\./g, '/');
  const destPath = join(
    projectDir,
    'src', 'main', 'java',
    packagePath, 'config', 'StartupInfoListener.java'
  );
  if (existsSync(destPath)) return;
  const template = readFileSync(templatePath, 'utf8');
  const content = template.replace(/__PACKAGE__/g, packageName);
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  writeFileSync(destPath, content, 'utf8');
}

/**
 * Apply additional dotfiles after project extraction.
 * @param {string} projectDir
 * @param {{ database?: boolean, frontend?: boolean, packageName?: string }} [options]
 */
export function applyDotfiles(projectDir, options = {}) {
  const hasDatabase = options.database === true;
  const hasFrontend = options.frontend === true;
  console.log('  📄 Applying dotfiles and Docker assets…');
  mergeGitignore(projectDir);
  copyAssetIfMissing('env.sample', join(projectDir, '.env.sample'));
  copyAssetIfMissing('editorconfig', join(projectDir, '.editorconfig'));
  copyAssetIfMissing('gitattributes', join(projectDir, '.gitattributes'));
  copyAssetIfMissing('dockerignore', join(projectDir, '.dockerignore'));
  // Docker deployment files (Dockerfiles always, compose files only with database)
  copyAssetIfMissing('Dockerfile', join(projectDir, 'Dockerfile'));
  copyAssetIfMissing('Dockerfile-native', join(projectDir, 'Dockerfile-native'));
  if (!hasFrontend) {
    stripFrontendCopyLines(join(projectDir, 'Dockerfile'));
    stripFrontendCopyLines(join(projectDir, 'Dockerfile-native'));
  }
  if (hasDatabase) {
    copyAssetIfMissing('compose.yaml', join(projectDir, 'compose.yaml'));
    copyAssetIfMissing('docker-compose.yml', join(projectDir, 'docker-compose.yml'));
    copyAssetIfMissing('docker-compose-native.yml', join(projectDir, 'docker-compose-native.yml'));
  } else {
    // No-DB projects still benefit from a single-service compose wrapper so
    // `docker compose up --build` works out of the box for both JVM and native.
    copyAssetIfMissing('docker-compose-nodb.yml', join(projectDir, 'docker-compose.yml'));
    copyAssetIfMissing('docker-compose-native-nodb.yml', join(projectDir, 'docker-compose-native.yml'));
  }
  // Optional .vscode recommendations
  copyAssetIfMissing(join('vscode', 'extensions.json'), join(projectDir, '.vscode', 'extensions.json'));
  copyAssetIfMissing(join('vscode', 'settings.json'), join(projectDir, '.vscode', 'settings.json'));
  // DevContainer setup
  copyAssetIfMissing(join('devcontainer', 'devcontainer.json'), join(projectDir, '.devcontainer', 'devcontainer.json'));
  if (hasDatabase) {
    copyAssetIfMissing(join('devcontainer', 'docker-compose.yml'), join(projectDir, '.devcontainer', 'docker-compose.yml'));
  }
  // Fallback index.html so the app shows a helpful page before the frontend is built
  if (hasFrontend) {
    copyAssetIfMissing('index.html', join(projectDir, 'src', 'main', 'resources', 'static', 'index.html'));
  }
  // CI workflow
  copyAssetIfMissing(join('ci', 'github-actions.yml'), join(projectDir, '.github', 'workflows', 'ci.yml'));
  // Copilot CLI LSP config (wires JDTLS for Java)
  copyAssetIfMissing('lsp.json', join(projectDir, '.github', 'lsp.json'));
  // StartupInfoListener (REQUIRED per SPRING-BOOT-4.md) — prints access URLs at boot.
  writeStartupInfoListener(projectDir, options.packageName);
  // Optional Node version pinning if front-end present
  try {
    const nodeVersion = getNodeVersion();
    if (nodeVersion) {
      writeTextFileIfMissing(join(projectDir, '.nvmrc'), `${nodeVersion}\n`);
      writeTextFileIfMissing(join(projectDir, '.node-version'), `${nodeVersion}\n`);
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Parse CLI arguments into an object with flags and positional args.
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positional = [];
  let i = 0;
  while (i < args.length) {
    if (args[i] === '--boot-version') {
      flags.bootVersion = args[i + 1];
      i += 2;
    } else if (args[i] === '--project-type') {
      flags.projectType = args[i + 1];
      i += 2;
    } else if (args[i] === '--frontend') {
      flags.frontend = args[i + 1];
      i += 2;
    } else if (args[i] === '-h' || args[i] === '--help') {
      flags.help = true;
      i += 1;
    } else if (args[i] === '--') {
      positional.push(...args.slice(i + 1));
      break;
    } else if (args[i].startsWith('-')) {
      console.error(`Unknown option: ${args[i]}`);
      flags.help = true;
      i += 1;
    } else {
      positional.push(args[i]);
      i += 1;
    }
  }
  return { flags, positional };
}

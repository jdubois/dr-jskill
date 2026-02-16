#!/usr/bin/env node
// Shared version utilities for dr-jskill scripts

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, copyFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.ROOT_DIR || resolve(__dirname, '..', '..');
const VERSIONS_FILE = process.env.VERSIONS_FILE || resolve(ROOT_DIR, 'versions.json');
const ASSETS_DIR = resolve(ROOT_DIR, 'assets');
const DOTFILES_MARKER = '# === dr-jskill additions ===';

/** Read a value from versions.json */
function getVersionValue(key, defaultValue = '') {
  if (!existsSync(VERSIONS_FILE)) return defaultValue;
  const data = JSON.parse(readFileSync(VERSIONS_FILE, 'utf8'));
  const value = data[key];
  return value != null && String(value).trim() !== '' ? String(value) : defaultValue;
}

export function getJavaVersion() { return getVersionValue('javaVersion', '21'); }
export function getBootPreferredMajor() { return getVersionValue('springBootPreferredMajor', '4'); }
export function getBootFallback() { return getVersionValue('springBootFallback', '4.0.2'); }
export function getPostgresVersion() { return getVersionValue('postgresVersion', '16'); }
export function getTemurinVersion() { return getVersionValue('temurinVersion', '21'); }
export function getMavenMinVersion() { return getVersionValue('mavenMinVersion', '3.8.0'); }
export function getGraalvmVersion() { return getVersionValue('graalvmVersion', '25'); }
export function getNodeVersion() { return getVersionValue('nodeVersion', '22.14.0'); }
export function getNpmVersion() { return getVersionValue('npmVersion', '10.10.0'); }
export function getViteVersion() { return getVersionValue('viteVersion', '5'); }
export function getMavenFrontendPluginVersion() { return getVersionValue('mavenFrontendPluginVersion', '1.15.1'); }
export function getVueVersion() { return getVersionValue('vueVersion', '3'); }
export function getReactVersion() { return getVersionValue('reactVersion', '18'); }
export function getAngularVersion() { return getVersionValue('angularVersion', '19'); }
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
    const res = await fetch(url, { method: 'HEAD' });
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
    });
    if (!response.ok) {
      console.error(`Warning: start.spring.io returned HTTP ${response.status}. Using fallback ${fallback}.`);
      return fallback;
    }
    const metadata = await response.json();

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
 * Download a file from a URL and save it to disk.
 * Uses Node.js built-in fetch API.
 */
export async function downloadFile(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(dest, buffer);
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
  extractZip(zipFile);
  unlinkSync(zipFile);
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
 * Apply additional dotfiles after project extraction.
 */
export function applyDotfiles(projectDir) {
  mergeGitignore(projectDir);
  copyAssetIfMissing('env.sample', join(projectDir, '.env.sample'));
  copyAssetIfMissing('editorconfig', join(projectDir, '.editorconfig'));
  copyAssetIfMissing('gitattributes', join(projectDir, '.gitattributes'));
  copyAssetIfMissing('dockerignore', join(projectDir, '.dockerignore'));
  // Optional .vscode recommendations
  copyAssetIfMissing(join('vscode', 'extensions.json'), join(projectDir, '.vscode', 'extensions.json'));
  copyAssetIfMissing(join('vscode', 'settings.json'), join(projectDir, '.vscode', 'settings.json'));
  // DevContainer setup (Java 21, Node 22, PostgreSQL)
  copyAssetIfMissing(join('devcontainer', 'devcontainer.json'), join(projectDir, '.devcontainer', 'devcontainer.json'));
  copyAssetIfMissing(join('devcontainer', 'docker-compose.yml'), join(projectDir, '.devcontainer', 'docker-compose.yml'));
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
    } else if (args[i] === '--flyway') {
      flags.flyway = true;
      i += 1;
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

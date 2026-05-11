#!/usr/bin/env node
// Regenerates version tables in reference docs from versions.json.
// Tables must be wrapped with `<!-- versions:start -->` / `<!-- versions:end -->` markers.
//
// Usage:
//   node scripts/sync-versions-in-docs.mjs           # update files in place
//   node scripts/sync-versions-in-docs.mjs --check   # fail (exit 1) if any file would change

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const versions = JSON.parse(readFileSync(resolve(ROOT, 'versions.json'), 'utf8'));

const START = '<!-- versions:start -->';
const END = '<!-- versions:end -->';

/**
 * Asset files whose hardcoded versions track versions.json.
 * Each entry: [relative-path, [ [regex, replacement], ... ]].
 */
const assetRewrites = [
  ['assets/Dockerfile', [
    [/eclipse-temurin:[^-\s]+-jdk-jammy/g, `eclipse-temurin:${versions.temurinVersion}-jdk-jammy`],
    [/eclipse-temurin:[^-\s]+-jre-alpine/g, `eclipse-temurin:${versions.temurinVersion}-jre-alpine`],
  ]],
  ['assets/Dockerfile-native', [
    [/ghcr\.io\/graalvm\/graalvm-community:\S+/g, `ghcr.io/graalvm/graalvm-community:${versions.graalvmVersion}`],
    [/Requires GraalVM \d+\+/g, `Requires GraalVM ${versions.graalvmVersion}+`],
    [/GraalVM \d+ \(includes native-image toolchain, JDK \d+\)/g, `GraalVM ${versions.graalvmVersion} (includes native-image toolchain, JDK ${versions.javaVersion})`],
    [/GraalVM \d+ = JDK \d+/g, `GraalVM ${versions.graalvmVersion} = JDK ${versions.javaVersion}`],
  ]],
  ['assets/compose.yaml', [
    [/postgres:\d+-alpine/g, `postgres:${versions.postgresVersion}-alpine`],
  ]],
  ['assets/docker-compose.yml', [
    [/postgres:\d+-alpine/g, `postgres:${versions.postgresVersion}-alpine`],
  ]],
  ['assets/docker-compose-native.yml', [
    [/postgres:\d+-alpine/g, `postgres:${versions.postgresVersion}-alpine`],
  ]],
  ['assets/devcontainer/docker-compose.yml', [
    [/postgres:\d+-alpine/g, `postgres:${versions.postgresVersion}-alpine`],
  ]],
  ['assets/devcontainer/devcontainer.json', [
    [/("ghcr\.io\/devcontainers\/features\/java:1"\s*:\s*\{\s*"version"\s*:\s*")\d+(")/g, `$1${versions.javaVersion}$2`],
    [/("ghcr\.io\/devcontainers\/features\/node:1"\s*:\s*\{\s*"version"\s*:\s*")\d+(")/g, `$1${String(versions.nodeVersion).split('.')[0]}$2`],
    [/(JDK )\d+( \+ Node )\d+/g, `$1${versions.javaVersion}$2${String(versions.nodeVersion).split('.')[0]}`],
  ]],
  ['assets/ci/github-actions.yml', [
    [/Set up JDK \d+/g, `Set up JDK ${versions.javaVersion}`],
    [/java-version:\s*'\d+'/g, `java-version: '${versions.javaVersion}'`],
  ]],
];

// Per-file version-table manifests. All rows must come from versions.json so
// the manifest stays the single source of truth — no hardcoded versions here.
const docs = {
  'references/VUE.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['Vue.js', `${versions.vueVersion}.x`],
    ['Vite', `${versions.viteVersion}.x`],
    ['Pinia', `${versions.piniaVersion}.x`],
    ['Vue Router', `${versions.vueRouterVersion}.x`],
  ],
  'references/REACT.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['React', `${versions.reactVersion}.x`],
    ['Vite', `${versions.viteVersion}.x`],
    ['React Router', `${versions.reactRouterVersion}.x`],
  ],
  'references/ANGULAR.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['Angular', `${versions.angularVersion}.x`],
    ['Angular Router', `${versions.angularVersion}.x`],
  ],
  'references/VANILLA-JS.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['Vite', `${versions.viteVersion}.x`],
    ['Bootstrap', versions.bootstrapVersion],
  ],
  'references/AZURE.md': [
    ['PostgreSQL', versions.postgresVersion],
    ['Java (Temurin)', versions.temurinVersion],
  ],
  'references/GRAALVM.md': [
    ['GraalVM', versions.graalvmVersion],
    ['Java (Temurin)', versions.temurinVersion],
    ['PostgreSQL', versions.postgresVersion],
  ],
};

function renderTable(rows) {
  const header = '| Tool | Version |\n|------|---------|';
  const body = rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  return `${header}\n${body}`;
}

/**
 * Rewrite version markers inside reference docs that the table-renderer doesn't cover:
 *   - <nodeVersion>vX.Y.Z</nodeVersion> / <npmVersion>X.Y.Z</npmVersion> tags in
 *     maven-frontend-plugin example snippets.
 *   - The plugin's own <version>X.Y.Z</version> in those same snippets.
 * Returns the possibly-modified content.
 */
function rewritePluginVersions(content) {
  return content
    .replace(/<nodeVersion>v[^<]*<\/nodeVersion>/g, `<nodeVersion>v${versions.nodeVersion}</nodeVersion>`)
    .replace(/<npmVersion>[^<]*<\/npmVersion>/g, `<npmVersion>${versions.npmVersion}</npmVersion>`)
    .replace(
      /(<artifactId>frontend-maven-plugin<\/artifactId>\s*)<version>[^<]+<\/version>/g,
      `$1<version>${versions.mavenFrontendPluginVersion}</version>`
    );
}

const checkMode = process.argv.includes('--check');

let changed = 0;
let drift = 0;
for (const [rel, rows] of Object.entries(docs)) {
  const file = resolve(ROOT, rel);
  const content = readFileSync(file, 'utf8');
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (start === -1 || end === -1) {
    console.error(`⚠️  ${rel}: missing ${START} / ${END} markers — skipping`);
    continue;
  }
  if (end < start) {
    console.error(`⚠️  ${rel}: END marker precedes START — skipping`);
    continue;
  }
  const before = content.slice(0, start + START.length);
  const after = content.slice(end);
  const withTable = `${before}\n${renderTable(rows)}\n${after}`;
  const next = rewritePluginVersions(withTable);
  if (next === content) {
    console.log(`  ∙ ${rel} up to date`);
    continue;
  }
  drift++;
  if (checkMode) {
    console.error(`✗ ${rel} is out of sync with versions.json`);
  } else {
    writeFileSync(file, next, 'utf8');
    console.log(`  ✓ Updated ${rel}`);
    changed++;
  }
}

if (checkMode && drift > 0) {
  console.error(`✗ ${drift} reference doc(s) out of sync.`);
}

// ---- Asset files (Dockerfiles, compose, CI workflow) ----
for (const [rel, rules] of assetRewrites) {
  const file = resolve(ROOT, rel);
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    console.error(`⚠️  ${rel}: not found — skipping`);
    continue;
  }
  let next = content;
  for (const [re, repl] of rules) {
    next = next.replace(re, repl);
  }
  if (next === content) {
    console.log(`  ∙ ${rel} up to date`);
    continue;
  }
  drift++;
  if (checkMode) {
    console.error(`✗ ${rel} is out of sync with versions.json`);
  } else {
    writeFileSync(file, next, 'utf8');
    console.log(`  ✓ Updated ${rel}`);
    changed++;
  }
}

if (checkMode && drift > 0) {
  console.error(`\n${drift} file(s) out of sync. Run: node scripts/sync-versions-in-docs.mjs`);
  process.exit(1);
}
console.log(`\nDone (${changed} file(s) changed).`);

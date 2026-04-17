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

// Per-file version-table manifests. Static "known-stable" rows (e.g. Pinia 2.x,
// Vue Router 4.x) can stay hardcoded — they change infrequently and aren't in
// versions.json.
const docs = {
  'references/VUE.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['Vue.js', `${versions.vueVersion}.x`],
    ['Vite', `${versions.viteVersion}.x`],
    ['Pinia', '2.x'],
    ['Vue Router', '4.x'],
  ],
  'references/REACT.md': [
    ['Node.js', versions.nodeVersion],
    ['npm', versions.npmVersion],
    ['React', `${versions.reactVersion}.x`],
    ['Vite', `${versions.viteVersion}.x`],
    ['React Router', '6.x'],
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
    ['Bootstrap', '5.3+'],
  ],
};

function renderTable(rows) {
  const header = '| Tool | Version |\n|------|---------|';
  const body = rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  return `${header}\n${body}`;
}

/**
 * Rewrite <nodeVersion>vX.Y.Z</nodeVersion> and <npmVersion>X.Y.Z</npmVersion>
 * tags inside maven-frontend-plugin example snippets so they track versions.json.
 * Returns the possibly-modified content.
 */
function rewritePluginVersions(content) {
  return content
    .replace(/<nodeVersion>v[^<]*<\/nodeVersion>/g, `<nodeVersion>v${versions.nodeVersion}</nodeVersion>`)
    .replace(/<npmVersion>[^<]*<\/npmVersion>/g, `<npmVersion>${versions.npmVersion}</npmVersion>`);
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
  console.error(`\n${drift} file(s) out of sync. Run: node scripts/sync-versions-in-docs.mjs`);
  process.exit(1);
}
console.log(`\nDone (${changed} file(s) changed).`);

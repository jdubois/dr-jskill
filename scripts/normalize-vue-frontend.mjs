#!/usr/bin/env node
/**
 * Normalize a freshly scaffolded Vue front-end so `npm install` resolves.
 *
 * `create-vue` scaffolds both `oxlint` and `eslint-plugin-oxlint`, and pins them
 * to minors that drift apart (e.g. `oxlint@~1.74` with `eslint-plugin-oxlint@~1.73`,
 * whose peer requires `oxlint@~1.73`). npm then fails the install with an
 * ERESOLVE peer conflict, which also fails the `frontend-maven-plugin`
 * `npm install` execution and therefore the whole Maven build.
 *
 * Dr JSkill standardizes on a single ESLint pipeline, so the drift-proof fix is
 * to drop the oxlint dual-linter entirely. This script does that, idempotently.
 *
 * Usage:
 *   node scripts/normalize-vue-frontend.mjs                 # ./frontend
 *   node scripts/normalize-vue-frontend.mjs path/to/frontend
 *   node scripts/normalize-vue-frontend.mjs --check         # report only, exit 1 if dirty
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Only the two packages that actually conflict. `npm-run-all2` must NOT be
// listed here: it is a general-purpose task runner, not part of the oxlint
// conflict, and the TypeScript flavour of create-vue uses it in `build`
// ("run-p type-check ..."). Removing it left that script calling a missing
// binary -> `sh: run-p: command not found` -> the whole Maven build failed.
const OXLINT_PACKAGES = ['oxlint', 'eslint-plugin-oxlint'];

// Scripts that shell out to npm-run-all2.
const RUN_ALL_BIN = /\brun-[sp]\b/;

// The canonical single-pipeline scripts (references/VUE.md step 4).
const CANONICAL_SCRIPTS = {
  lint: 'eslint . --fix',
  'lint:check': 'eslint .',
};

function normalizePackageJson(frontendDir, changes, warnings, check) {
  const path = join(frontendDir, 'package.json');
  if (!existsSync(path)) return;

  const raw = readFileSync(path, 'utf8');
  const pkg = JSON.parse(raw);

  for (const dep of OXLINT_PACKAGES) {
    if (pkg.devDependencies?.[dep]) {
      delete pkg.devDependencies[dep];
      changes.push(`package.json: removed devDependency ${dep}`);
    }
    if (pkg.dependencies?.[dep]) {
      delete pkg.dependencies[dep];
      changes.push(`package.json: removed dependency ${dep}`);
    }
  }

  if (pkg.scripts) {
    // create-vue splits linting into lint:eslint + lint:oxlint and chains them
    // through npm-run-all2; collapse that back to a single ESLint pipeline.
    for (const name of ['lint:oxlint', 'lint:eslint']) {
      if (pkg.scripts[name]) {
        delete pkg.scripts[name];
        changes.push(`package.json: removed script ${name}`);
      }
    }
    for (const [name, command] of Object.entries(CANONICAL_SCRIPTS)) {
      const current = pkg.scripts[name];
      if (current !== command && (current === undefined ? name === 'lint' : /oxlint|run-s|run-p/.test(current))) {
        pkg.scripts[name] = command;
        changes.push(`package.json: set script ${name} to "${command}"`);
      }
    }
  }

  // Earlier versions of this script wrongly deleted `npm-run-all2`, which left
  // any `run-p` / `run-s` script calling a binary that is no longer installed.
  // Detect that here so the failure is explained instead of surfacing later as
  // an opaque `sh: run-p: command not found` during the Maven build.
  const needsRunAll = Object.values(pkg.scripts ?? {}).some((cmd) => RUN_ALL_BIN.test(cmd));
  const hasRunAll = pkg.devDependencies?.['npm-run-all2'] ?? pkg.dependencies?.['npm-run-all2'];
  if (needsRunAll && !hasRunAll) {
    warnings.push(
      'package.json uses "run-p"/"run-s" but npm-run-all2 is not installed. ' +
        'Run: npm install -D npm-run-all2',
    );
  }

  const next = `${JSON.stringify(pkg, null, 2)}\n`;
  if (next !== raw && !check) writeFileSync(path, next, 'utf8');
}

function removeOxlintConfig(frontendDir, changes, check) {
  const path = join(frontendDir, '.oxlintrc.json');
  if (!existsSync(path)) return;
  changes.push('removed .oxlintrc.json');
  if (!check) rmSync(path);
}

function normalizeEslintConfig(frontendDir, changes, check) {
  // create-vue emits `eslint.config.ts` for the TypeScript flavour and
  // `eslint.config.js` otherwise; handle every flavour, or a dangling
  // `eslint-plugin-oxlint` import survives and breaks `vue-tsc` type-check.
  for (const name of ['eslint.config.js', 'eslint.config.ts', 'eslint.config.mjs']) {
    normalizeEslintConfigFile(join(frontendDir, name), name, changes, check);
  }
}

function normalizeEslintConfigFile(path, name, changes, check) {
  if (!existsSync(path)) return;

  const raw = readFileSync(path, 'utf8');
  const next = raw
    // `import pluginOxlint from 'eslint-plugin-oxlint'`
    .replace(/^\s*import\s+\w+\s+from\s+['"]eslint-plugin-oxlint['"];?\s*$\n?/gm, '')
    // `...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),`
    .replace(/^\s*\.\.\.\w*[Oo]xlint\w*\.buildFromOxlintConfigFile\([^)]*\),?\s*$\n?/gm, '')
    // A bare `oxlintConfigs,` style spread, if the scaffold shape changes.
    .replace(/^\s*\.\.\.\w*[Oo]xlint\w*,\s*$\n?/gm, '');

  if (next === raw) return;
  changes.push(`${name}: removed oxlint import and config entry`);
  if (!check) writeFileSync(path, next, 'utf8');
}

export function normalizeVueFrontend(frontendDir, { check = false } = {}) {
  if (!existsSync(frontendDir)) return { changes: [], warnings: [] };
  const changes = [];
  const warnings = [];
  normalizePackageJson(frontendDir, changes, warnings, check);
  removeOxlintConfig(frontendDir, changes, check);
  normalizeEslintConfig(frontendDir, changes, check);
  return { changes, warnings };
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const frontendDir = args.find((a) => !a.startsWith('--')) ?? 'frontend';

  if (!existsSync(frontendDir)) {
    console.error(`No front-end directory at "${frontendDir}".`);
    process.exit(1);
  }

  const { changes, warnings } = normalizeVueFrontend(frontendDir, { check });

  const printWarnings = () => {
    for (const warning of warnings) console.error(`  warning: ${warning}`);
  };

  if (changes.length === 0) {
    console.log(`${frontendDir}: already normalized (no oxlint dual-linter present).`);
    printWarnings();
    if (warnings.length > 0 && check) process.exit(1);
    return;
  }

  if (check) {
    console.error(`${frontendDir}: oxlint dual-linter still present:\n`);
    for (const change of changes) console.error(`  would fix: ${change}`);
    printWarnings();
    console.error('\nRun: node scripts/normalize-vue-frontend.mjs');
    process.exit(1);
  }

  console.log(`${frontendDir}: normalized for a single ESLint pipeline.`);
  for (const change of changes) console.log(`  ${change}`);
  printWarnings();
}

if (import.meta.url === `file://${process.argv[1]}`) main();

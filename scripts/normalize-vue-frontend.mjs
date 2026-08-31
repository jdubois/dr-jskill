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

const OXLINT_PACKAGES = ['oxlint', 'eslint-plugin-oxlint', 'npm-run-all2'];

// The canonical single-pipeline scripts (references/VUE.md step 4).
const CANONICAL_SCRIPTS = {
  lint: 'eslint . --fix',
  'lint:check': 'eslint .',
};

function normalizePackageJson(frontendDir, changes, check) {
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
  const path = join(frontendDir, 'eslint.config.js');
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
  changes.push('eslint.config.js: removed oxlint import and config entry');
  if (!check) writeFileSync(path, next, 'utf8');
}

export function normalizeVueFrontend(frontendDir, { check = false } = {}) {
  if (!existsSync(frontendDir)) return [];
  const changes = [];
  normalizePackageJson(frontendDir, changes, check);
  removeOxlintConfig(frontendDir, changes, check);
  normalizeEslintConfig(frontendDir, changes, check);
  return changes;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const frontendDir = args.find((a) => !a.startsWith('--')) ?? 'frontend';

  if (!existsSync(frontendDir)) {
    console.error(`No front-end directory at "${frontendDir}".`);
    process.exit(1);
  }

  const changes = normalizeVueFrontend(frontendDir, { check });

  if (changes.length === 0) {
    console.log(`${frontendDir}: already normalized (no oxlint dual-linter present).`);
    return;
  }

  if (check) {
    console.error(`${frontendDir}: oxlint dual-linter still present:\n`);
    for (const change of changes) console.error(`  would fix: ${change}`);
    console.error('\nRun: node scripts/normalize-vue-frontend.mjs');
    process.exit(1);
  }

  console.log(`${frontendDir}: normalized for a single ESLint pipeline.`);
  for (const change of changes) console.log(`  ${change}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

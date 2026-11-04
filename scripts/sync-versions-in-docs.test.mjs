import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dr-jskill-sync-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const name of ['assets', 'references', 'workshop', '.github/workflows']) {
    cpSync(join(root, name), join(dir, name), { recursive: true });
  }
  mkdirSync(join(dir, 'scripts'));
  for (const name of ['scripts/sync-versions-in-docs.mjs', 'versions.json']) {
    cpSync(join(root, name), join(dir, name));
  }
  return dir;
}

function run(dir, ...args) {
  return spawnSync(process.execPath, [join(dir, 'scripts/sync-versions-in-docs.mjs'), ...args], { encoding: 'utf8' });
}

test('version synchronization is idempotent and processes each file once', (t) => {
  const dir = fixture(t);
  assert.equal(run(dir).status, 0);
  const result = run(dir, '--check');
  assert.equal(result.status, 0, result.stderr);
  const paths = [...result.stdout.matchAll(/^\s+∙ (.+) up to date$/gm)].map(match => match[1]);
  assert.equal(paths.length, new Set(paths).size);
  assert.ok(paths.includes('references/PROJECT-SETUP.md'));
});

test('check mode reports manifest drift without writing, then synchronization updates workshop and all snippets', (t) => {
  const dir = fixture(t);
  const path = join(dir, 'versions.json');
  const versions = JSON.parse(readFileSync(path, 'utf8'));
  Object.assign(versions, { nodeVersion: '24.99.0', vitestVersion: '5.99.0', mavenEnforcerPluginVersion: '3.99.0', bucket4jVersion: '8.99.0' });
  writeFileSync(path, JSON.stringify(versions));
  const workshopPath = join(dir, 'workshop/01-setup.md');
  const before = readFileSync(workshopPath, 'utf8');
  const check = run(dir, '--check');
  assert.equal(check.status, 1);
  assert.equal(readFileSync(workshopPath, 'utf8'), before);
  const paths = [...check.stderr.matchAll(/^✗ (.+) is out of sync/gm)].map(match => match[1]);
  assert.equal(paths.length, new Set(paths).size);
  assert.equal(run(dir).status, 0);
  assert.equal(run(dir, '--check').status, 0);
  for (const name of ['workshop/01-setup.md', 'references/VUE.md', '.github/workflows/ci.yml', '.github/workflows/pages.yml']) {
    assert.ok(readFileSync(join(dir, name), 'utf8').includes('24.99.0'), name);
  }
  assert.ok(readFileSync(workshopPath, 'utf8').includes('5.99.0'));
  assert.ok(readFileSync(join(dir, 'references/SPRING-BOOT-4.md'), 'utf8').includes('<version>3.99.0</version>'));
  assert.ok(readFileSync(join(dir, 'references/SECURITY.md'), 'utf8').includes('<version>8.99.0</version>'));
});

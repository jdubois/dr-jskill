import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { configureMaven, resolveBootVersion, getVueFrontendVersions } from './lib/versions.mjs';
import { normalizeVueFrontend } from './normalize-vue-frontend.mjs';

const versions = JSON.parse(readFileSync(new URL('../versions.json', import.meta.url), 'utf8'));

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dr-jskill-versions-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Boot resolver selects the highest published stable preferred-major release, not the default RC', async (t) => {
  const checked = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === 'https://start.spring.io') {
      return Response.json({
        bootVersion: {
          default: '4.2.0.RC1',
          values: [{ id: '4.2.0.BUILD-SNAPSHOT' }, { id: '4.1.1.RELEASE' }, { id: '4.1.2.RELEASE' }],
        },
      });
    }
    checked.push(url);
    return new Response(null, { status: 200 });
  });
  assert.equal(await resolveBootVersion('4', '4.0.0'), '4.1.2');
  assert.equal(checked.length, 1);
  assert.match(checked[0], /4\.1\.2/);
});

test('Boot resolver tries an older stable release when the highest is not published', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === 'https://start.spring.io') {
      return Response.json({
        bootVersion: { default: '4.1.2.RELEASE', values: [{ id: '4.1.1.RELEASE' }] },
      });
    }
    return new Response(null, { status: url.includes('4.1.2') ? 404 : 200 });
  });
  assert.equal(await resolveBootVersion('4', '4.0.0'), '4.1.1');
});

test('Boot resolver reports an unavailable upstream and uses the configured fallback', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  const warnings = [];
  t.mock.method(console, 'error', (message) => warnings.push(message));
  assert.equal(await resolveBootVersion('4', versions.springBootFallback), versions.springBootFallback);
  assert.ok(warnings.some(message => message.includes('offline')));
});

test('Maven wrapper and Lombok guardrail use the manifest and are idempotent', (t) => {
  const dir = fixture(t);
  mkdirSync(join(dir, '.mvn', 'wrapper'), { recursive: true });
  const wrapper = join(dir, '.mvn', 'wrapper', 'maven-wrapper.properties');
  writeFileSync(wrapper, 'wrapperVersion=3.3.4\ndistributionUrl=https://example.com/old.zip\n');
  const pom = join(dir, 'pom.xml');
  writeFileSync(pom, '<project><build><plugins></plugins></build></project>');
  configureMaven(dir);
  const firstPom = readFileSync(pom, 'utf8');
  const firstWrapper = readFileSync(wrapper, 'utf8');
  assert.ok(firstPom.includes(`<version>${versions.mavenEnforcerPluginVersion}</version>`));
  assert.match(firstPom, /org\.projectlombok:lombok/);
  assert.match(firstPom, /<searchTransitive>true<\/searchTransitive>/);
  assert.ok(firstWrapper.includes(`/${versions.mavenVersion}/apache-maven-${versions.mavenVersion}-bin.zip`));
  configureMaven(dir);
  assert.equal(readFileSync(pom, 'utf8'), firstPom);
  assert.equal(readFileSync(wrapper, 'utf8'), firstWrapper);
});

test('Vue normalizer pins stable versions, removes conflicting linters and preserves TypeScript build tooling', (t) => {
  const dir = fixture(t);
  const pkg = {
    scripts: { build: 'run-p type-check build-only', lint: 'run-s lint:oxlint lint:eslint', 'lint:oxlint': 'oxlint .', format: 'prettier --write --experimental-cli src/' },
    dependencies: { vue: '^3.0.0', pinia: '^4.0.0', 'vue-router': '^5.0.0' },
    devDependencies: { vitest: '5.1.0-beta.1', vite: '^8.0.0', oxlint: '~1.74.0', 'eslint-plugin-oxlint': '~1.73.0', 'npm-run-all2': '^9.0.0' },
  };
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
  writeFileSync(join(dir, '.oxlintrc.json'), '{}');
  writeFileSync(join(dir, 'eslint.config.ts'), "import pluginOxlint from 'eslint-plugin-oxlint'\nexport default [\n...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),\n]\n");
  const before = readFileSync(join(dir, 'package.json'), 'utf8');
  assert.ok(normalizeVueFrontend(dir, { check: true }).changes.length > 0);
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), before);
  normalizeVueFrontend(dir);
  const actual = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.equal(actual.dependencies.vue, versions.vueVersion);
  assert.equal(actual.devDependencies.vitest, versions.vitestVersion);
  assert.equal(actual.scripts['lint:check'], 'eslint .');
  assert.equal(actual.scripts.format, 'prettier --write src/');
  assert.equal(actual.devDependencies.oxlint, undefined);
  assert.equal(actual.devDependencies['npm-run-all2'], '^9.0.0');
  assert.ok(!readFileSync(join(dir, 'eslint.config.ts'), 'utf8').includes('Oxlint'));
  assert.deepEqual(normalizeVueFrontend(dir, { check: true }), { changes: [], warnings: [] });
});

test('all fallback getters and Vue frontend defaults match the manifest', (t) => {
  const dir = fixture(t);
  const moduleUrl = new URL('./lib/versions.mjs', import.meta.url).href;
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
    const m = await import(${JSON.stringify(moduleUrl)});
    const values = Object.fromEntries(Object.entries(m)
      .filter(([name]) => name.startsWith('get'))
      .map(([name, fn]) => [name, fn()]));
    console.log(JSON.stringify(values));
  `], { encoding: 'utf8', env: { ...process.env, VERSIONS_FILE: join(dir, 'missing.json') } });
  const fallback = JSON.parse(result);
  const mappings = { getBootPreferredMajor: 'springBootPreferredMajor', getBootFallback: 'springBootFallback', getNpmVersion: 'npmVersion' };
  for (const [name, value] of Object.entries(fallback)) {
    if (name === 'getVueFrontendVersions') continue;
    const key = mappings[name] ?? `${name[3].toLowerCase()}${name.slice(4)}`;
    assert.equal(value, versions[key], `${name} fallback differs from versions.json`);
  }
  assert.deepEqual(fallback.getVueFrontendVersions, getVueFrontendVersions());
});

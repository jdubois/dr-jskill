#!/usr/bin/env node
/**
 * Sync workshop/*.md into docs/workshop/*.md for the VuePress site.
 *
 * The workshop is authored once in `workshop/` and published from `docs/`.
 * Without this script the two copies drift, and the published site keeps
 * serving instructions that were already fixed in `workshop/`.
 *
 * The only transformation is link rewriting: `workshop/` sits next to
 * `references/`, `SKILL.md` and `versions.json` in the repository, but the
 * docs site only publishes `README.md`, `WORKS-WITH.md` and `workshop/`.
 * Relative links that escape the site are therefore rewritten to absolute
 * GitHub URLs; links that resolve to a real site page are left alone.
 *
 * Usage:
 *   node scripts/sync-workshop-docs.mjs           # write docs/workshop/
 *   node scripts/sync-workshop-docs.mjs --check   # fail if out of sync (CI)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(repoRoot, 'workshop');
const targetDir = join(repoRoot, 'docs', 'workshop');

const GITHUB_BLOB = 'https://github.com/jdubois/dr-jskill/blob/main';

// Paths that exist as pages in the published docs site keep working relatively.
//
// `README.md` is deliberately NOT in this list. `docs/README.md` exists, but it is the
// docs-site landing page — a different document from the repository root `README.md`.
// Every `../README.md` link in workshop/ means the skill's root README ("the root
// README.md", "the skill's own README"), and some target anchors that only exist there,
// so those links must become absolute or they break on the published site.
const PUBLISHED_IN_DOCS = ['WORKS-WITH.md', 'workshop'];

function isPublishedInDocs(target) {
  const firstSegment = target.split(/[/#]/)[0];
  return PUBLISHED_IN_DOCS.includes(firstSegment);
}

/**
 * Rewrite `](../<target>)` links that point outside the published docs site.
 * Anchors are preserved: `../references/VUE.md#6-performance` keeps its `#6-performance`.
 */
function rewriteLinks(markdown) {
  return markdown.replace(/\]\(\.\.\/([^)]*)\)/g, (match, target) =>
    isPublishedInDocs(target) ? match : `](${GITHUB_BLOB}/${target})`,
  );
}

/**
 * Validate every relative Markdown link in a directory: the target file must exist, and
 * if the link carries an anchor, the target must contain a matching heading.
 *
 * This exists because `docs/workshop/` resolves `../` against `docs/`, not the repo root,
 * so a link that is valid in `workshop/` can silently break once published.
 */
function findBrokenLinks(dir) {
  const broken = [];

  for (const name of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const filePath = join(dir, name);
    const markdown = readFileSync(filePath, 'utf8');

    for (const [, link] of markdown.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)) {
      const [target, anchor] = link.split('#');
      const resolved = resolve(dir, target);

      if (!existsSync(resolved)) {
        broken.push(`${filePath} -> ${link} (file not found)`);
        continue;
      }
      if (!anchor || !resolved.endsWith('.md')) continue;

      const headings = [...readFileSync(resolved, 'utf8').matchAll(/^#{1,6}\s+(.*)$/gm)]
        .map(([, text]) =>
          text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'),
        );

      if (!headings.includes(anchor)) {
        broken.push(`${filePath} -> ${link} (no such heading)`);
      }
    }
  }

  return broken;
}

function main() {
  const check = process.argv.includes('--check');

  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

  const chapters = readdirSync(sourceDir)
    .filter((name) => name.endsWith('.md'))
    .sort();

  const drifted = [];
  let written = 0;

  for (const name of chapters) {
    const expected = rewriteLinks(readFileSync(join(sourceDir, name), 'utf8'));
    const targetPath = join(targetDir, name);
    const actual = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;

    if (actual === expected) continue;

    if (check) {
      drifted.push(`${name}${actual === null ? ' (missing in docs/workshop/)' : ''}`);
    } else {
      writeFileSync(targetPath, expected, 'utf8');
      written += 1;
    }
  }

  // A chapter deleted from workshop/ must not linger on the published site.
  const orphans = readdirSync(targetDir)
    .filter((name) => name.endsWith('.md') && !chapters.includes(name));

  if (check) {
    const brokenLinks = [...findBrokenLinks(sourceDir), ...findBrokenLinks(targetDir)];

    if (drifted.length === 0 && orphans.length === 0 && brokenLinks.length === 0) {
      console.log(`docs/workshop/ is in sync with workshop/ (${chapters.length} chapters).`);
      console.log('All relative links and anchors resolve.');
      return;
    }
    if (drifted.length > 0 || orphans.length > 0) {
      console.error('docs/workshop/ is out of sync with workshop/.\n');
      for (const name of drifted) console.error(`  drifted: ${name}`);
      for (const name of orphans) console.error(`  orphan:  ${name} (no longer in workshop/)`);
      console.error('\nRun: node scripts/sync-workshop-docs.mjs');
    }
    if (brokenLinks.length > 0) {
      console.error('\nBroken relative links:\n');
      for (const entry of brokenLinks) console.error(`  ${entry}`);
    }
    process.exit(1);
  }

  console.log(`Synced ${written} of ${chapters.length} chapter(s) into docs/workshop/.`);
  for (const name of orphans) {
    console.log(`  note: ${name} exists in docs/workshop/ but not in workshop/ — delete it manually.`);
  }
}

main();

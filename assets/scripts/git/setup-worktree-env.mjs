#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
}

let repoRoot;
try {
  repoRoot = run('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd() }).trim();
} catch {
  console.error('Cannot set up worktree-local .env files because this directory is not a Git repository.');
  console.error('Run `git init -b main` first, then run `node scripts/git/setup-worktree-env.mjs` again.');
  process.exit(1);
}

const hookPath = resolve(repoRoot, '.githooks', 'post-checkout');
const updaterPath = resolve(repoRoot, 'scripts', 'git', 'update-worktree-env.mjs');

if (!existsSync(hookPath) || !existsSync(updaterPath)) {
  console.error('Cannot set up worktree-local .env files because the Dr JSkill hook files are missing.');
  console.error('Expected .githooks/post-checkout and scripts/git/update-worktree-env.mjs in the repository root.');
  process.exit(1);
}

run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: repoRoot, stdio: 'ignore' });
execFileSync('node', ['scripts/git/update-worktree-env.mjs'], { cwd: repoRoot, stdio: 'inherit' });
console.log('Activated .githooks/post-checkout for future git worktree add operations.');

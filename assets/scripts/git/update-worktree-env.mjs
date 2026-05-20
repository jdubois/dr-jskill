#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomInt } from 'node:crypto';

const envPath = resolve(process.cwd(), '.env');
const managedStart = '# === dr-jskill worktree ports:start ===';
const managedEnd = '# === dr-jskill worktree ports:end ===';

function sanitize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'worktree';
}

function readExistingEnv() {
  if (!existsSync(envPath)) {
    return '';
  }
  return readFileSync(envPath, 'utf8');
}

function getExistingValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim();
}

function isPortAvailable(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();
    server.once('error', () => resolveAvailable(false));
    server.once('listening', () => {
      server.close(() => resolveAvailable(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function randomAvailablePort(usedPorts) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const port = randomInt(10000, 49152);
    if (!usedPorts.has(port) && await isPortAvailable(port)) {
      usedPorts.add(port);
      return port;
    }
  }
  throw new Error('Could not find an available local port');
}

function replaceManagedBlock(content, block) {
  const pattern = new RegExp(`${managedStart}[\\s\\S]*?${managedEnd}\\n?`, 'm');
  const trimmed = content.trimEnd();
  if (pattern.test(content)) {
    return content.replace(pattern, `${block}\n`);
  }
  return `${trimmed}${trimmed ? '\n\n' : ''}${block}\n`;
}

const existing = readExistingEnv();
const usedPorts = new Set();

for (const key of ['SPRING_BOOT_PORT', 'VITE_PORT', 'POSTGRES_PORT']) {
  const value = Number(getExistingValue(existing, key));
  if (Number.isInteger(value)) {
    usedPorts.add(value);
  }
}

const springBootPort = getExistingValue(existing, 'SPRING_BOOT_PORT') ?? String(await randomAvailablePort(usedPorts));
const vitePort = getExistingValue(existing, 'VITE_PORT') ?? String(await randomAvailablePort(usedPorts));
const postgresPort = getExistingValue(existing, 'POSTGRES_PORT') ?? String(await randomAvailablePort(usedPorts));
const datasourceUrl = `jdbc:postgresql://localhost:${postgresPort}/mydb`;
const composeProjectName = getExistingValue(existing, 'COMPOSE_PROJECT_NAME') ??
  `${sanitize(basename(process.cwd()))}-${randomInt(0x100000, 0xffffff).toString(16)}`;

const block = `${managedStart}
SPRING_BOOT_PORT=${springBootPort}
VITE_PORT=${vitePort}
POSTGRES_PORT=${postgresPort}
SPRING_DATASOURCE_URL=${datasourceUrl}
COMPOSE_PROJECT_NAME=${composeProjectName}
${managedEnd}`;

writeFileSync(envPath, replaceManagedBlock(existing, block), { mode: 0o600 });
console.log('Updated worktree-local .env port assignments');

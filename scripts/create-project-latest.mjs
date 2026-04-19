#!/usr/bin/env node
// Script to create a Spring Boot project using the LATEST available Spring Boot version
// Automatically fetches latest from start.spring.io; falls back per versions.json when preferred major unavailable

import {
  getJavaVersion, getBootPreferredMajor, getBootFallback,
  resolveBootVersion, downloadAndExtractProject, parseArgs,
  applyDotfiles,
} from './lib/versions.mjs';

const PREFERRED_BOOT_MAJOR = getBootPreferredMajor();
const DEFAULT_BOOT_FALLBACK = getBootFallback();
const JAVA_VERSION_DEFAULT = getJavaVersion();

function usage() {
  console.log(`Usage: node create-project-latest.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION] [PROJECT_TYPE]

Environment / Flags:
  --boot-version <version>   Override Spring Boot version (otherwise resolves preferred major with fallback)
  --project-type <type>      basic | web | fullstack (default: web)
  --frontend <type>          none | react | angular | vue | vanilla (default: none for web/basic, vue for fullstack)
                             When set to a framework, keeps the COPY frontend ./frontend line in Dockerfile(s)
                             so you can manually scaffold a frontend/ directory after generation.
  -h|--help                  Show this help

Examples:
  node scripts/create-project-latest.mjs myapp com.acme myapp com.acme.myapp 21 fullstack
  node scripts/create-project-latest.mjs --boot-version 4.0.0-M1 myapp
  node scripts/create-project-latest.mjs --frontend react myapp com.acme myapp com.acme.myapp 25 web`);
}

const { flags, positional } = parseArgs(process.argv);

if (flags.help) {
  usage();
  process.exit(0);
}

const projectName = positional[0] || 'my-spring-boot-app';
const groupId = positional[1] || 'com.example';
const artifactId = positional[2] || projectName;
const packageName = positional[3] || `${groupId}.app`;
const javaVersion = positional[4] || JAVA_VERSION_DEFAULT;
const projectType = positional[5] || flags.projectType || 'web';

const bootVersion = flags.bootVersion
  ? flags.bootVersion
  : await resolveBootVersion(PREFERRED_BOOT_MAJOR, DEFAULT_BOOT_FALLBACK);

console.log(`Resolved Spring Boot version: ${bootVersion} (preferred major: ${PREFERRED_BOOT_MAJOR}, fallback: ${DEFAULT_BOOT_FALLBACK})`);

let dependencies;
let description;
switch (projectType) {
  case 'basic':
    dependencies = 'web,actuator,devtools,native';
    description = 'Basic+Spring+Boot+application';
    break;
  case 'web':
    dependencies = 'web,actuator,validation,devtools,native';
    description = 'Spring+Boot+web+application';
    break;
  case 'fullstack':
    dependencies = 'web,data-jpa,actuator,validation,devtools,postgresql,docker-compose,testcontainers,native';
    description = 'Full-stack+Spring+Boot+application';
    break;
  default:
    console.error(`Unknown project type: ${projectType}`);
    console.error('Valid options: basic, web, fullstack');
    process.exit(1);
}

try {
  await downloadAndExtractProject({
    type: 'maven-project',
    language: 'java',
    bootVersion,
    baseDir: projectName,
    groupId,
    artifactId,
    name: artifactId,
    description,
    packageName,
    packaging: 'jar',
    javaVersion,
    dependencies,
  });

  // Apply dotfiles and editor-recommended settings
  const hasDatabase = projectType === 'fullstack';
  // A frontend is present if the project is fullstack, OR if the user
  // explicitly asks for one via `--frontend <framework>` (anything except "none").
  const explicitFrontend = flags.frontend && flags.frontend !== 'none';
  const hasFrontend = projectType === 'fullstack' || Boolean(explicitFrontend);
  applyDotfiles(projectName, { database: hasDatabase, frontend: hasFrontend, packageName });
} catch (err) {
  console.error(`✗ Failed to create project: ${err?.message || String(err)}`);
  process.exit(1);
}

console.log('');
console.log(`✓ Spring Boot project created successfully in ./${projectName}`);
console.log('');
console.log('To get started:');
console.log(`  cd ${projectName}`);
console.log('  ./mvnw spring-boot:run');
console.log('');
console.log('The application will be available at http://localhost:8080');

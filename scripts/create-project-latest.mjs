#!/usr/bin/env node
// Script to create a Spring Boot project using the LATEST available Spring Boot version
// Automatically fetches latest from start.spring.io; falls back per versions.json when preferred major unavailable

import {
  getJavaVersion, getBootPreferredMajor, getBootFallback,
  resolveBootVersion, joinDependencies, downloadAndExtractProject, parseArgs,
} from './lib/versions.mjs';

const PREFERRED_BOOT_MAJOR = getBootPreferredMajor();
const DEFAULT_BOOT_FALLBACK = getBootFallback();
const JAVA_VERSION_DEFAULT = getJavaVersion();

function usage() {
  console.log(`Usage: node create-project-latest.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION] [PROJECT_TYPE]

Environment / Flags:
  --boot-version <version>   Override Spring Boot version (otherwise resolves preferred major with fallback)
  --project-type <type>      basic | web | fullstack (default: web)
  --flyway                   Include Flyway migration support (no Liquibase)
  -h|--help                  Show this help

Examples:
  node scripts/create-project-latest.mjs myapp com.acme myapp com.acme.myapp 21 fullstack --flyway
  node scripts/create-project-latest.mjs --boot-version 4.0.0-M1 myapp`);
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

console.error(`Resolved Spring Boot version: ${bootVersion} (preferred major: ${PREFERRED_BOOT_MAJOR}, fallback: ${DEFAULT_BOOT_FALLBACK})`);

let dependencies;
let description;
switch (projectType) {
  case 'basic':
    dependencies = 'web,actuator,devtools';
    description = 'Basic+Spring+Boot+application';
    break;
  case 'web':
    dependencies = 'web,actuator,validation,devtools';
    description = 'Spring+Boot+web+application';
    break;
  case 'fullstack':
    dependencies = 'web,data-jpa,actuator,validation,devtools,postgresql,docker-compose,testcontainers';
    description = 'Full-stack+Spring+Boot+application';
    break;
  default:
    console.error(`Unknown project type: ${projectType}`);
    console.error('Valid options: basic, web, fullstack');
    process.exit(1);
}

if (flags.flyway) {
  dependencies = joinDependencies(dependencies, 'flyway');
}

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

console.log('');
console.log(`✓ Spring Boot project created successfully in ./${projectName}`);
console.log('');
console.log('To get started:');
console.log(`  cd ${projectName}`);
console.log('  ./mvnw spring-boot:run');
console.log('');
console.log('The application will be available at http://localhost:8080');

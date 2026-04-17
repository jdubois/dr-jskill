#!/usr/bin/env node
// Script to create a full-stack Spring Boot application from start.spring.io

import {
  getJavaVersion, resolveBootVersion, joinDependencies,
  downloadAndExtractProject, parseArgs, applyDotfiles,
} from './lib/versions.mjs';

function usage() {
  console.log(`Usage: node create-fullstack-project.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
Options:
  --boot-version <version>   Override Spring Boot version
  -h|--help                  Show this help`);
}

const { flags, positional } = parseArgs(process.argv);

if (flags.help) {
  usage();
  process.exit(0);
}

const projectName = positional[0] || 'my-fullstack-app';
const groupId = positional[1] || 'com.example';
const artifactId = positional[2] || projectName;
const packageName = positional[3] || `${groupId}.fullstack`;
const javaVersion = positional[4] || getJavaVersion();
const bootVersion = flags.bootVersion || await resolveBootVersion();

let dependencies = 'web,data-jpa,actuator,validation,devtools,postgresql,docker-compose,testcontainers,native';

console.error(`Creating full-stack Spring Boot application with Boot=${bootVersion}, Java=${javaVersion}`);

try {
  await downloadAndExtractProject({
    type: 'maven-project',
    language: 'java',
    bootVersion,
    baseDir: projectName,
    groupId,
    artifactId,
    name: artifactId,
    description: 'Full-stack+Spring+Boot+application',
    packageName,
    packaging: 'jar',
    javaVersion,
    dependencies,
  });
  applyDotfiles(projectName, { database: true, frontend: true, packageName });
} catch (err) {
  console.error(`✗ Failed to create project: ${err?.message || String(err)}`);
  process.exit(1);
}

console.log(`✓ Full-stack Spring Boot application created successfully in ./${projectName}`);
console.log('Includes:');
console.log('  - Spring Web (REST APIs)');
console.log('  - Spring Data JPA (Database access)');
console.log('  - Spring Boot Actuator (Monitoring)');
console.log('  - PostgreSQL Driver (Database)');
console.log('  - Validation (Bean validation)');
console.log('  - DevTools (Hot reload)');
console.log('  - Docker Compose (Automatic database startup)');
console.log('  - Testcontainers (Integration testing with PostgreSQL)');
console.log('');
console.log('Next steps:');
console.log(`  cd ${projectName}`);
console.log('  ./mvnw spring-boot:run');

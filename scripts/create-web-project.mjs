#!/usr/bin/env node
// Script to create a Spring Boot web application from start.spring.io

import {
  getJavaVersion, resolveBootVersion, joinDependencies,
  downloadAndExtractProject, parseArgs,
} from './lib/versions.mjs';

function usage() {
  console.log(`Usage: node create-web-project.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
Options:
  --boot-version <version>   Override Spring Boot version
  --flyway                   Include Flyway migration support
  -h|--help                  Show this help`);
}

const { flags, positional } = parseArgs(process.argv);

if (flags.help) {
  usage();
  process.exit(0);
}

const projectName = positional[0] || 'my-web-app';
const groupId = positional[1] || 'com.example';
const artifactId = positional[2] || projectName;
const packageName = positional[3] || `${groupId}.webapp`;
const javaVersion = positional[4] || getJavaVersion();
const bootVersion = flags.bootVersion || await resolveBootVersion();

let dependencies = 'web,actuator,validation,devtools';
if (flags.flyway) {
  dependencies = joinDependencies(dependencies, 'flyway');
}

console.error(`Creating Spring Boot web application with Boot=${bootVersion}, Java=${javaVersion}`);

await downloadAndExtractProject({
  type: 'maven-project',
  language: 'java',
  bootVersion,
  baseDir: projectName,
  groupId,
  artifactId,
  name: artifactId,
  description: 'Spring+Boot+web+application',
  packageName,
  packaging: 'jar',
  javaVersion,
  dependencies,
});

console.log(`✓ Spring Boot web application created successfully in ./${projectName}`);
console.log(`  cd ${projectName}`);
console.log('  ./mvnw spring-boot:run');
console.log('  http://localhost:8080');

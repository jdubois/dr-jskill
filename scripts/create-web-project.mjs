#!/usr/bin/env node
// Script to create a Spring Boot web application from start.spring.io

import {
  getJavaVersion, resolveBootVersion,
  downloadAndExtractProject, parseArgs, applyDotfiles, resolveOutputDir,
} from './lib/versions.mjs';

function usage() {
  console.log(`Usage: node create-web-project.mjs [PROJECT_NAME] [GROUP_ID] [ARTIFACT_ID] [PACKAGE_NAME] [JAVA_VERSION]
Options:
  --boot-version <version>   Override Spring Boot version
  --output-dir <path>        Directory where the project folder is created (default: current directory)
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
const outputDir = resolveOutputDir(flags);
let projectDir;

let dependencies = 'web,actuator,validation,devtools,native';

console.log(`Creating Spring Boot web application with Boot=${bootVersion}, Java=${javaVersion}`);

try {
  projectDir = await downloadAndExtractProject({
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
    outputDir,
  });
  applyDotfiles(projectDir, { database: false, frontend: false, packageName });
} catch (err) {
  console.error(`✗ Failed to create project: ${err?.message || String(err)}`);
  process.exit(1);
}

console.log(`✓ Spring Boot web application created successfully in ${projectDir}`);
console.log(`  cd ${projectDir}`);
console.log('  ./mvnw spring-boot:run');
console.log('  http://localhost:8080 (or SPRING_BOOT_PORT if overridden)');

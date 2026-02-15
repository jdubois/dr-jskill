#!/usr/bin/env pwsh
<#!
.SYNOPSIS
  Create a Spring Boot project using the latest available version (with preferred major fallback).
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/lib/versions.ps1"

param(
  [string]$ProjectName = 'my-spring-boot-app',
  [string]$GroupId = 'com.example',
  [string]$ArtifactId,
  [string]$PackageName,
  [string]$JavaVersion,
  [ValidateSet('basic','web','fullstack')][string]$ProjectType = 'web',
  [string]$BootVersion,
  [switch]$Flyway
)

if (-not $ArtifactId) { $ArtifactId = $ProjectName }
if (-not $PackageName) { $PackageName = "$GroupId.app" }
if (-not $JavaVersion) { $JavaVersion = Get-JavaVersion }
if (-not $BootVersion) { $BootVersion = Resolve-BootVersion }

$deps = @('web','actuator','devtools')
if ($ProjectType -eq 'web') { $deps += 'validation' }
if ($ProjectType -eq 'fullstack') { $deps += @('validation','data-jpa','postgresql','docker-compose','testcontainers') }
if ($Flyway.IsPresent) { $deps += 'flyway' }
$deps = Join-Dependencies -Dependencies $deps

Write-Host "Resolved Spring Boot version: $BootVersion" -ForegroundColor Green
Write-Host "Creating project $ProjectName ($ProjectType) with dependencies: $deps"

$tempZip = "$ProjectName.zip"
$baseUri = 'https://start.spring.io/starter.zip'
$params = @{
  type='maven-project'; language='java'; bootVersion=$BootVersion; baseDir=$ProjectName;
  groupId=$GroupId; artifactId=$ArtifactId; name=$ArtifactId;
  description='Spring+Boot+project'; packageName=$PackageName; packaging='jar';
  javaVersion=$JavaVersion; dependencies=$deps
}
$query = ($params.GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key, [Uri]::EscapeDataString($_.Value) }) -join '&'
$uri = "$baseUri?$query"
Invoke-WebRequest -Uri $uri -OutFile $tempZip -UseBasicParsing | Out-Null

if (-not (Test-Path $tempZip)) {
  throw "Failed to download project zip."
}

Expand-Archive -Path $tempZip -DestinationPath . -Force
Remove-Item $tempZip -Force
Write-Host "✓ Project created in ./$ProjectName" -ForegroundColor Green
Write-Host "Next steps:"; Write-Host "  cd $ProjectName"; Write-Host "  ./mvnw spring-boot:run"

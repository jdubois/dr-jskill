#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/lib/versions.ps1"

param(
  [string]$ProjectName = 'my-web-app',
  [string]$GroupId = 'com.example',
  [string]$ArtifactId,
  [string]$PackageName,
  [string]$JavaVersion,
  [string]$BootVersion,
  [switch]$Flyway
)

if (-not $ArtifactId) { $ArtifactId = $ProjectName }
if (-not $PackageName) { $PackageName = "$GroupId.webapp" }
if (-not $JavaVersion) { $JavaVersion = Get-JavaVersion }
if (-not $BootVersion) { $BootVersion = Resolve-BootVersion }

$deps = @('web','actuator','validation','devtools')
if ($Flyway.IsPresent) { $deps += 'flyway' }
$deps = Join-Dependencies -Dependencies $deps

Write-Host "Creating web Spring Boot project with Boot=$BootVersion, Java=$JavaVersion" -ForegroundColor Cyan

$baseUri = 'https://start.spring.io/starter.zip'
$params = @{
  type='maven-project'; language='java'; bootVersion=$BootVersion; baseDir=$ProjectName;
  groupId=$GroupId; artifactId=$ArtifactId; name=$ArtifactId; description='Spring+Boot+web+application';
  packageName=$PackageName; packaging='jar'; javaVersion=$JavaVersion; dependencies=$deps
}
$query = ($params.GetEnumerator() | ForEach-Object { "{0}={1}" -f $_.Key, [Uri]::EscapeDataString($_.Value) }) -join '&'
$uri = "$baseUri?$query"
$tempZip = "$ProjectName.zip"
Invoke-WebRequest -Uri $uri -OutFile $tempZip -UseBasicParsing | Out-Null

Expand-Archive -Path $tempZip -DestinationPath . -Force
Remove-Item $tempZip -Force
Write-Host "✓ Web Spring Boot project created in ./$ProjectName" -ForegroundColor Green
Write-Host "Next: cd $ProjectName; ./mvnw spring-boot:run"
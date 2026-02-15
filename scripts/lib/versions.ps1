param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Global:RootDir = if ($env:ROOT_DIR) { $env:ROOT_DIR } else { (Resolve-Path "$PSScriptRoot/.." ) }
$Global:VersionsFile = if ($env:VERSIONS_FILE) { $env:VERSIONS_FILE } else { Join-Path $Global:RootDir 'versions.json' }

function Get-VersionValue {
  param(
    [Parameter(Mandatory=$true)][string]$Key,
    [string]$Default = ''
  )
  if (-not (Test-Path $Global:VersionsFile)) { return $Default }
  $json = Get-Content $Global:VersionsFile -Raw | ConvertFrom-Json
  $value = $json.$Key
  if ($null -eq $value -or [string]::IsNullOrWhiteSpace($value)) { return $Default }
  return "$value"
}

function Get-JavaVersion { Get-VersionValue -Key 'javaVersion' -Default '21' }
function Get-BootPreferredMajor { Get-VersionValue -Key 'springBootPreferredMajor' -Default '4' }
function Get-BootFallback { Get-VersionValue -Key 'springBootFallback' -Default '3.4.0' }
function Get-PostgresVersion { Get-VersionValue -Key 'postgresVersion' -Default '16' }
function Get-TemurinVersion { Get-VersionValue -Key 'temurinVersion' -Default '21' }
function Get-MavenMinVersion { Get-VersionValue -Key 'mavenMinVersion' -Default '3.8.0' }
function Get-GraalvmVersion { Get-VersionValue -Key 'graalvmVersion' -Default '25' }
function Get-NodeVersion { Get-VersionValue -Key 'nodeVersion' -Default '22.14.0' }
function Get-NpmVersion { Get-VersionValue -Key 'npmVersion' -Default '10.10.0' }
function Get-ViteVersion { Get-VersionValue -Key 'viteVersion' -Default '5' }
function Get-MavenFrontendPluginVersion { Get-VersionValue -Key 'mavenFrontendPluginVersion' -Default '1.15.1' }
function Get-VueVersion { Get-VersionValue -Key 'vueVersion' -Default '3' }
function Get-ReactVersion { Get-VersionValue -Key 'reactVersion' -Default '18' }
function Get-AngularVersion { Get-VersionValue -Key 'angularVersion' -Default '19' }
function Get-TestcontainersVersion { Get-VersionValue -Key 'testcontainersVersion' -Default '2.0.0' }
function Get-SpringFrameworkVersion { Get-VersionValue -Key 'springFrameworkVersion' -Default '7.0' }
function Get-HibernateVersion { Get-VersionValue -Key 'hibernateVersion' -Default '7.1' }

function Resolve-BootVersion {
  param(
    [string]$PreferredMajor = $(Get-BootPreferredMajor),
    [string]$Fallback = $(Get-BootFallback)
  )
  try {
    $metadata = Invoke-RestMethod -Uri 'https://start.spring.io' -Headers @{ Accept = 'application/json' }
    $fetched = $metadata?.bootVersion?.default
    if (-not $fetched) { return $Fallback }
    if ($fetched -like "$PreferredMajor.*") { return $fetched }
    Write-Warning "start.spring.io default bootVersion ($fetched) does not match preferred major $PreferredMajor. Using fallback $Fallback. Override with --BootVersion if needed."
    return $Fallback
  } catch {
    Write-Warning "Failed to fetch bootVersion from start.spring.io: $_. Using fallback $Fallback."
    return $Fallback
  }
}

function Join-Dependencies {
  param([Parameter(Mandatory=$true)][string[]]$Dependencies)
  $seen = @{}
  $result = @()
  foreach ($dep in $Dependencies) {
    if ([string]::IsNullOrWhiteSpace($dep)) { continue }
    if (-not $seen.ContainsKey($dep)) {
      $seen[$dep] = $true
      $result += $dep
    }
  }
  return ($result -join ',')
}

Export-ModuleMember -Function *

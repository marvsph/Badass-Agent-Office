$ErrorActionPreference = 'Stop'
$officeFolder = $PSScriptRoot
$officeUrl = 'http://127.0.0.1:4317'
$requiredNodeMajor = 24

function Stop-Office([string]$message) {
    Write-Host ''
    Write-Host $message -ForegroundColor Yellow
    Write-Host ''
    Read-Host 'Press Enter to close'
    exit 1
}

function Find-Node {
    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Update-SessionPath {
    # winget updates the saved PATH, but not this window's copy of it.
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}

try {
    $officeHealth = Invoke-RestMethod -Uri "$officeUrl/health" -TimeoutSec 2
    if ($officeHealth.ok) { Start-Process $officeUrl; exit }
} catch { }

$officeNode = Find-Node
if (-not $officeNode) {
    Write-Host "Agent Office needs Node.js $requiredNodeMajor or later, and Node.js is not installed." -ForegroundColor Yellow
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
        $answer = Read-Host 'Install Node.js LTS now with winget? (Y/N)'
        if ($answer -match '^[Yy]') {
            winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements
            Update-SessionPath
            $officeNode = Find-Node
        }
    }
    if (-not $officeNode) {
        Stop-Office "Install Node.js $requiredNodeMajor or later from https://nodejs.org/ and run this launcher again."
    }
}

$nodeVersion = (& $officeNode -p 'process.versions.node').Trim()
if ([int]($nodeVersion.Split('.')[0]) -lt $requiredNodeMajor) {
    Stop-Office "Agent Office needs Node.js $requiredNodeMajor or later. This computer has Node.js $nodeVersion. Install the current LTS from https://nodejs.org/ or run: winget upgrade OpenJS.NodeJS.LTS"
}

Start-Process -FilePath $officeNode -ArgumentList 'server.mjs' -WorkingDirectory $officeFolder -WindowStyle Hidden -RedirectStandardOutput (Join-Path $officeFolder 'office.log') -RedirectStandardError (Join-Path $officeFolder 'office-error.log')
for ($officeAttempt=0; $officeAttempt -lt 30; $officeAttempt++) {
    Start-Sleep -Milliseconds 300
    try {
        $officeHealth = Invoke-RestMethod -Uri "$officeUrl/health" -TimeoutSec 1
        if ($officeHealth.ok) { Start-Process $officeUrl; exit }
    } catch { }
}
Stop-Office 'Agent Office did not start. See office-error.log in the Agent-Office folder.'

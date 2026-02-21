param(
    [string]$Version   = "",
    [string]$Changelog = ""
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "`n  FAIL: $msg" -ForegroundColor Red; exit 1 }

# ── Locate repo root (works from any subfolder) ────────────────────────────
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { Write-Fail "Not inside a git repository" }
Set-Location $repoRoot

$pkgJson    = Join-Path $repoRoot "app\package.json"
$versionJson = Join-Path $repoRoot "app\version.json"
$indexHtml  = Join-Path $repoRoot "app\src\index.html"

# ── Header ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =================================" -ForegroundColor Cyan
Write-Host "        Ren3D  Release  Tool      " -ForegroundColor Cyan
Write-Host "  =================================" -ForegroundColor Cyan
Write-Host ""

# ── Read current version from package.json ─────────────────────────────────
Write-Step "Current version"
$pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
$currentVersion = $pkg.version
Write-Host "    Now: v$currentVersion" -ForegroundColor Gray

# ── Ask for new version ────────────────────────────────────────────────────
if (-not $Version) {
    $parts = $currentVersion -split '\.'
    $suggested = "$($parts[0]).$($parts[1]).$([int]$parts[2] + 1)"
    Write-Host ""
    $Version = Read-Host "  New version (Enter = $suggested)"
    if (-not $Version) { $Version = $suggested }
}

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Fail "Wrong format. Use X.Y.Z  e.g. 2.1.0"
}

if ($Version -eq $currentVersion) {
    Write-Fail "New version is the same as current ($currentVersion). Bump it."
}

$tag = "v$Version"
Write-Ok "New version: $tag"

# ── Ask for changelog ──────────────────────────────────────────────────────
if (-not $Changelog) {
    Write-Host ""
    $Changelog = Read-Host "  What changed in $tag"
    if (-not $Changelog) { Write-Fail "Changelog cannot be empty" }
}

# ── Confirm before doing anything ─────────────────────────────────────────
Write-Host ""
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Version  : $tag"           -ForegroundColor White
Write-Host "  Changelog: $Changelog"     -ForegroundColor White
Write-Host "  Files    : app/package.json, app/version.json, app/src/index.html" -ForegroundColor DarkGray
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
$confirm = Read-Host "  Proceed? (y/n)"
if ($confirm -ne "y") { Write-Host "  Cancelled." -ForegroundColor Yellow; exit 0 }

# ── Check for uncommitted changes ──────────────────────────────────────────
Write-Step "Git status"
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warn "Uncommitted changes:"
    Write-Host $gitStatus -ForegroundColor DarkGray
    $answer = Read-Host "`n  Commit all changes now? (y/n)"
    if ($answer -eq "y") {
        git add -A
        git commit -m "chore: pre-release cleanup before $tag"
        Write-Ok "Changes committed"
    } else {
        Write-Fail "Please commit or stash changes manually, then run again"
    }
}

# ── Check tag does not already exist ──────────────────────────────────────
$existing = git tag -l $tag
if ($existing) { Write-Fail "Tag $tag already exists. Delete it first: git tag -d $tag" }

# ── Bump versions in all three files ──────────────────────────────────────
Write-Step "Bumping version in all files"

# 1. app/package.json
$pkgRaw = Get-Content $pkgJson -Raw
$pkgRaw = $pkgRaw -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`""
Set-Content $pkgJson $pkgRaw -NoNewline
Write-Ok "app/package.json  ->  $Version"

# 2. app/version.json
$verRaw = Get-Content $versionJson -Raw
$verRaw = $verRaw -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$Version`""
# Update notes too
$verRaw = $verRaw -replace '"notes"\s*:\s*"[^"]+"', "`"notes`": `"$Changelog`""
Set-Content $versionJson $verRaw -NoNewline
Write-Ok "app/version.json  ->  $Version"

# 3. app/src/index.html  (const APP_VERSION = '...')
$htmlRaw = Get-Content $indexHtml -Raw
$htmlRaw = $htmlRaw -replace "const APP_VERSION\s*=\s*'[^']+'", "const APP_VERSION = '$Version'"
Set-Content $indexHtml $htmlRaw -NoNewline
Write-Ok "app/src/index.html  ->  $Version"

# ── Commit the version bump ────────────────────────────────────────────────
Write-Step "Committing version bump"
git add app/package.json app/version.json app/src/index.html
git commit -m "release: bump to $tag — $Changelog"
Write-Ok "Committed"

# ── Create annotated tag ───────────────────────────────────────────────────
Write-Step "Creating tag $tag"
git tag -a $tag -m $Changelog
Write-Ok "Tag $tag created"

# ── Push to GitHub ─────────────────────────────────────────────────────────
Write-Step "Pushing to GitHub"
git push origin master
git push origin $tag
Write-Ok "Pushed master + $tag"

# ── Done ────────────────────────────────────────────────────────────────────
$remote  = git remote get-url origin
$repoUrl = $remote -replace '\.git$', ''

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Green
Write-Host "     Release $tag started!                       " -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Actions : $repoUrl/actions" -ForegroundColor Cyan
Write-Host "  Releases: $repoUrl/releases" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Build takes ~8 min. Artifacts: .exe  .AppImage  .deb" -ForegroundColor DarkGray
Write-Host ""

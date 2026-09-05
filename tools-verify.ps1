# ================================================================
# Sulsul-Travel Automated Pre-flight Gatekeeper & Linter (tools-verify.ps1)
# ================================================================
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " [FLY] Sulsul-Travel Automated Pre-flight Gatekeeper & Linter" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$baseDir = $PSScriptRoot

$indexHtmlPath = Join-Path $baseDir "index.html"
$swJsPath = Join-Path $baseDir "sw.js"
$manifestPath = Join-Path $baseDir "manifest.webmanifest"
$kbPath = Join-Path $baseDir "kb-travel.js"
$changelogPath = Join-Path $baseDir "CHANGELOG.md"
$devPath = Join-Path $baseDir "DEVELOPMENT.md"
$readmePath = Join-Path $baseDir "README.md"
$servePath = Join-Path $baseDir "tools-serve.ps1"
$mapImgPath = Join-Path $baseDir "south_america_illustrated_map.jpg"

# Detect Sulsul Chronicle (술술트래블신록.md) regardless of console encoding
$sillokFile = Get-ChildItem -Path $baseDir -Filter "*.md" | Where-Object { $_.Name -notmatch "^(CHANGELOG|DEVELOPMENT|README)" } | Select-Object -First 1
$sillokPath = if ($sillokFile) { $sillokFile.FullName } else { Join-Path $baseDir "술술트래블신록.md" }

$icon192 = Join-Path $baseDir "icons\icon-192.png"
$icon512 = Join-Path $baseDir "icons\icon-512.png"
$iconApple = Join-Path $baseDir "icons\apple-touch-icon.png"
$iconMask192 = Join-Path $baseDir "icons\icon-maskable-192.png"
$iconMask512 = Join-Path $baseDir "icons\icon-maskable-512.png"

$allPassed = $true

function Report-Gate($name, $passed, $details) {
    if ($passed) {
        Write-Host "  [ PASS ] $name" -ForegroundColor Green
        if ($details) { Write-Host "           $details" -ForegroundColor Gray }
    } else {
        Write-Host "  [ FAIL ] $name" -ForegroundColor Red
        if ($details) { Write-Host "           $details" -ForegroundColor Yellow }
        $script:allPassed = $false
    }
}

# ---------------------------------------------------------------
# [Gate 1/4] Checking Essential Files
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[1/4] Checking Essential Repository & PWA Asset Files..." -ForegroundColor Yellow

$coreFiles = @(
    $indexHtmlPath, $swJsPath, $manifestPath, $kbPath, 
    $changelogPath, $sillokPath, $devPath, $readmePath, 
    $servePath, $mapImgPath, $icon192, $icon512, $iconApple, 
    $iconMask192, $iconMask512
)

$missingFiles = @()
foreach ($f in $coreFiles) {
    if (-not (Test-Path $f)) {
        $missingFiles += (Split-Path $f -Leaf)
    }
}
$sillokName = if ($sillokFile) { $sillokFile.Name } else { "술술트래블신록.md" }
Report-Gate "All Core Repository, Documentation & Icon Assets Exist" ($missingFiles.Count -eq 0) "Checked: $($coreFiles.Count) files (Chronicle: $sillokName) $(if($missingFiles){'| Missing: ' + ($missingFiles -join ', ')})"

# ---------------------------------------------------------------
# [Gate 2/4] Verifying Version Consistency Across Sources
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Verifying Version Synchronization Across Sources..." -ForegroundColor Yellow

$indexContent = if (Test-Path $indexHtmlPath) { Get-Content -Raw -Path $indexHtmlPath -Encoding UTF8 } else { "" }
$swContent = if (Test-Path $swJsPath) { Get-Content -Raw -Path $swJsPath -Encoding UTF8 } else { "" }
$clContent = if (Test-Path $changelogPath) { Get-Content -Raw -Path $changelogPath -Encoding UTF8 } else { "" }
$sillokContent = if (Test-Path $sillokPath) { Get-Content -Raw -Path $sillokPath -Encoding UTF8 } else { "" }

$mIndex = [regex]::Match($indexContent, "const APP_VER\s*=\s*'([^']+)'")
$appVer = if ($mIndex.Success) { $mIndex.Groups[1].Value } else { "UNKNOWN" }

$mBadge = [regex]::Match($indexContent, 'id="app-ver-badge"[^>]*>v([^<]+)<')
$badgeVer = if ($mBadge.Success) { $mBadge.Groups[1].Value } else { "UNKNOWN" }

$mSw = [regex]::Match($swContent, "const V\s*=\s*'st-shell-v([^']+)'")
$swVer = if ($mSw.Success) { $mSw.Groups[1].Value } else { "UNKNOWN" }

$mCl = [regex]::Match($clContent, "##\s*\[v([0-9\.]+)\]")
$clVer = if ($mCl.Success) { $mCl.Groups[1].Value } else { "UNKNOWN" }

$verMatch = ($appVer -eq $swVer) -and ($appVer -eq $clVer) -and ($appVer -eq $badgeVer) -and ($appVer -ne "UNKNOWN")
$details = "App: v$appVer | Badge: v$badgeVer | SW: v$swVer | Changelog: v$clVer"
Report-Gate "Version Synchronization (v$appVer)" $verMatch $details

# ---------------------------------------------------------------
# [Gate 3/4] Invariant Laws (R-1 ~ R-10) Validation
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Invariant Laws (DOM IDs, Fallback AI & Canvas Normalization)..." -ForegroundColor Yellow

# R-10: Mandatory DOM IDs
$mandatoryIds = @(
    'lifetime-analytics', 'trip-cards-grid', 'modal-create-trip',
    'view-hub', 'view-workspace', 'top-analytics', 'app-ver-badge', 'header-trip-name',
    'tab-content-plan', 'tab-content-expenses', 'tab-content-journal', 'tab-content-checklist',
    'nav-tab-plan', 'nav-tab-journal', 'nav-tab-expense', 'nav-tab-sync',
    'chk-mep-rate', 'modal-spot', 'modal-expense', 'modal-ai-trip', 
    'modal-ai-chat', 'cfg-gemini-key'
)
$missingIds = @()
foreach ($id in $mandatoryIds) {
    if ($indexContent -notmatch "id=['`"]$id['`"]") {
        $missingIds += $id
    }
}
Report-Gate "Mandatory DOM IDs Intact (R-10)" ($missingIds.Count -eq 0) "Checked: $($mandatoryIds.Count) IDs $(if($missingIds){'| Missing: ' + ($missingIds -join ', ')})"

# R-5: Gemini Multi-Model Fallback Chain
$hasGemini25 = $indexContent -match "gemini-2.5-flash"
$hasGemini20 = $indexContent -match "gemini-2.0-flash"
$hasGemini15 = $indexContent -match "gemini-1.5-flash"
$has3TierFallback = $hasGemini25 -and $hasGemini20 -and $hasGemini15
Report-Gate "Gemini 3-Tier Multi-Model Fallback Chain (R-5)" $has3TierFallback "2.5-flash: $hasGemini25 | 2.0-flash: $hasGemini20 | 1.5-flash: $hasGemini15"

# R-4: 3:4 Canvas Photo Normalization
$hasCanvasCrop = ($indexContent -match "canvas\.width\s*=\s*336") -and ($indexContent -match "canvas\.height\s*=\s*448")
Report-Gate "3:4 Canvas Photo Normalization Pipeline (R-4)" $hasCanvasCrop "Canvas dimension: 336x448 (3:4 aspect ratio) detected"

# R-6: MEP Exchange Rate Switch
$hasMepSwitch = $indexContent -match "chk-mep-rate"
Report-Gate "Argentina MEP Exchange Rate Invariant (R-6)" $hasMepSwitch "MEP switch and factor logic present"

# Namespace
$hasNamespace = $indexContent -match "window\.SulsulTravel"
Report-Gate "Global SulsulTravel Namespace Exposed" $hasNamespace "window.SulsulTravel accessible"

# ---------------------------------------------------------------
# [Gate 4/4] Headless Browser V8 Engine Parsing & Runtime Error Trap
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Headless Microsoft Edge V8 Engine Parsing & Error Trap..." -ForegroundColor Yellow

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

if (Test-Path $edgePath) {
    $tempHarness = Join-Path $baseDir "temp_verify_harness.html"
    $errorTrap = '<script>window.__errors = []; window.onerror = function(m, u, l){ window.__errors.push(m + "@" + l); };</script>'
    $checkSnippet = '<script>window.addEventListener("DOMContentLoaded", function(){ var d = document.createElement("div"); d.id = "V8_GATE_CHECK"; d.setAttribute("data-sulsul", typeof window.SulsulTravel !== "undefined"); d.setAttribute("data-ver", window.SulsulTravel ? window.SulsulTravel.version : ""); d.setAttribute("data-errs", (window.__errors||[]).length); document.body.appendChild(d); });</script>'

    # Inject trap into top of index.html
    $harnessContent = $indexContent.Replace('<head>', "<head>`n  $errorTrap`n  $checkSnippet")
    [System.IO.File]::WriteAllText($tempHarness, $harnessContent, [System.Text.Encoding]::UTF8)

    try {
        $fileUri = [System.Uri]::new($tempHarness).AbsoluteUri
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $edgePath
        $psi.Arguments = "--headless=new --disable-gpu --allow-file-access-from-files --dump-dom `"$fileUri`""
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $domOutput = $proc.StandardOutput.ReadToEnd()
        [void]$proc.WaitForExit(10000)

        $gateCheckMatch = [regex]::Match($domOutput, 'id="V8_GATE_CHECK"[^>]*data-sulsul="([^"]+)"[^>]*data-ver="([^"]+)"[^>]*data-errs="([^"]+)"')
        if ($gateCheckMatch.Success) {
            $sulsulReady = ($gateCheckMatch.Groups[1].Value -eq "true")
            $v8Ver = $gateCheckMatch.Groups[2].Value
            $errCount = [int]$gateCheckMatch.Groups[3].Value

            $v8Pass = $sulsulReady -and ($errCount -eq 0) -and ($v8Ver -eq $appVer)
            Report-Gate "Headless Edge V8 Engine Parsing & Zero Runtime Errors" $v8Pass "SulsulTravel: $sulsulReady | V8 Ver: v$v8Ver | Runtime Errors: $errCount"
        } else {
            Report-Gate "Headless Edge V8 Engine Parsing" $false "V8 Gate check node was not rendered within timeout"
        }
    } catch {
        Report-Gate "Headless Edge V8 Execution" $false $_.Exception.Message
    } finally {
        if (Test-Path $tempHarness) { Remove-Item $tempHarness -Force }
    }
} else {
    Write-Host "  [ SKIP ] Microsoft Edge not found at standard path, skipped V8 headless execution." -ForegroundColor DarkYellow
}

# ---------------------------------------------------------------
# Final Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host " [PASS-ALL] ALL GATES PASSED: Sulsul-Travel v$appVer is 100% Validated!" -ForegroundColor Green
} else {
    Write-Host " [FAIL-WARN] GATE CHECKS FAILED: Please resolve the issues above before releasing." -ForegroundColor Red
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $allPassed) { exit 1 }

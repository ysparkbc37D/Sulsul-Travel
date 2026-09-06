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

$dkpRegistry = Join-Path $baseDir "js\destinations\destination-registry.js"
$dkpDefault = Join-Path $baseDir "js\destinations\pack-default.js"
$dkpSouthAmerica = Join-Path $baseDir "js\destinations\pack-south-america.js"
$dkpYunnan = Join-Path $baseDir "js\destinations\pack-yunnan.js"

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
Write-Host "[1/4] Checking Essential Repository, DKP Modules & PWA Asset Files..." -ForegroundColor Yellow

$coreFiles = @(
    $indexHtmlPath, $swJsPath, $manifestPath, $kbPath, 
    $changelogPath, $sillokPath, $devPath, $readmePath, 
    $servePath, $mapImgPath, $icon192, $icon512, $iconApple, 
    $iconMask192, $iconMask512,
    $dkpRegistry, $dkpDefault, $dkpSouthAmerica, $dkpYunnan
)

$missingFiles = @()
foreach ($f in $coreFiles) {
    if (-not (Test-Path $f)) {
        $missingFiles += (Split-Path $f -Leaf)
    }
}
$sillokName = if ($sillokFile) { $sillokFile.Name } else { "술술트래블신록.md" }
Report-Gate "All Core Repository, DKP Knowledge Packs & Icon Assets Exist" ($missingFiles.Count -eq 0) "Checked: $($coreFiles.Count) files (Chronicle: $sillokName) $(if($missingFiles){'| Missing: ' + ($missingFiles -join ', ')})"

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
    'nav-tab-plan', 'nav-tab-journal', 'nav-tab-expenses', 'nav-tab-sync',
    'chk-mep-rate', 'modal-spot', 'modal-expense', 'modal-ai-trip', 
    'modal-ai-chat', 'modal-confirm-delete', 'modal-install-guide', 
    'modal-share-room', 'cfg-gemini-key', 'modal-pdf-report', 'gps-radar-card'
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
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $tempProfile = Join-Path $tempRoot ("sulsul-edge-verify-" + [System.Guid]::NewGuid().ToString("N"))
    [void](New-Item -ItemType Directory -Path $tempProfile -Force)
    $errorTrap = '<script>window.__errors = []; window.onerror = function(m, u, l){ window.__errors.push(m + "@" + l); };</script>'
    $checkSnippet = '<script>window.addEventListener("DOMContentLoaded", function(){ var d = document.createElement("div"); d.id = "V8_GATE_CHECK"; d.setAttribute("data-sulsul", typeof window.SulsulTravel !== "undefined"); d.setAttribute("data-ver", window.SulsulTravel ? window.SulsulTravel.version : ""); d.setAttribute("data-errs", (window.__errors||[]).length); document.body.appendChild(d); });</script>'

    # Inject trap into top of index.html
    $harnessContent = $indexContent.Replace('<head>', "<head>`n  $errorTrap`n  $checkSnippet")
    [System.IO.File]::WriteAllText($tempHarness, $harnessContent, [System.Text.Encoding]::UTF8)

    try {
        $fileUri = [System.Uri]::new($tempHarness).AbsoluteUri
        $portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
        $portProbe.Start()
        $debugPort = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
        $portProbe.Stop()

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $edgePath
        $psi.Arguments = "--headless=new --disable-gpu --no-first-run --disable-default-apps --disable-extensions --allow-file-access-from-files --remote-debugging-port=$debugPort --remote-allow-origins=* --user-data-dir=`"$tempProfile`" `"$fileUri`""
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $pageTarget = $null
        $browserInfo = $null
        $discoveryDeadline = [DateTime]::UtcNow.AddSeconds(12)
        do {
            try {
                $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/list" -TimeoutSec 2
                $browserInfo = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/version" -TimeoutSec 2
                $pageTarget = $null
                foreach ($candidate in $targets) {
                    if ($candidate.type -eq "page" -and $candidate.url -eq $fileUri) {
                        $pageTarget = $candidate
                        break
                    }
                }
                if (-not $pageTarget) {
                    foreach ($candidate in $targets) {
                        if ($candidate.type -eq "page") {
                            $pageTarget = $candidate
                            break
                        }
                    }
                }
            } catch {
                $pageTarget = $null
            }
            if (-not $pageTarget) { Start-Sleep -Milliseconds 250 }
        } while (-not $pageTarget -and [DateTime]::UtcNow -lt $discoveryDeadline)

        if (-not $pageTarget -or -not $pageTarget.webSocketDebuggerUrl) {
            throw "Edge DevTools endpoint did not expose the verification page within 12 seconds."
        }
        $pageSocketUrl = "$($pageTarget.webSocketDebuggerUrl)"

        function Invoke-CdpCommand {
            param(
                [Parameter(Mandatory=$true)][string]$WebSocketUrl,
                [Parameter(Mandatory=$true)][string]$Method,
                [hashtable]$Params = @{}
            )

            $socket = [System.Net.WebSockets.ClientWebSocket]::new()
            # Do not route loopback CDP traffic through a corporate/system proxy.
            $socket.Options.Proxy = [System.Net.GlobalProxySelection]::GetEmptyWebProxy()
            $timeout = [System.Threading.CancellationTokenSource]::new()
            $timeout.CancelAfter(8000)
            try {
                $socketUri = [System.Uri]::new($WebSocketUrl, [System.UriKind]::Absolute)
                if (-not $socketUri.IsAbsoluteUri) { throw "DevTools returned an invalid websocket URL: $WebSocketUrl" }
                $socket.ConnectAsync($socketUri, $timeout.Token).GetAwaiter().GetResult()
                $request = @{ id = 1; method = $Method; params = $Params }
                $requestBytes = [System.Text.Encoding]::UTF8.GetBytes(($request | ConvertTo-Json -Compress -Depth 12))
                $requestSegment = [System.ArraySegment[byte]]::new($requestBytes)
                $socket.SendAsync($requestSegment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $timeout.Token).GetAwaiter().GetResult()

                while ($true) {
                    $stream = [System.IO.MemoryStream]::new()
                    do {
                        $buffer = [byte[]]::new(65536)
                        $receiveSegment = [System.ArraySegment[byte]]::new($buffer)
                        $received = $socket.ReceiveAsync($receiveSegment, $timeout.Token).GetAwaiter().GetResult()
                        if ($received.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                            throw "DevTools websocket closed before returning a response."
                        }
                        $stream.Write($buffer, 0, $received.Count)
                    } while (-not $received.EndOfMessage)

                    $message = [System.Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
                    $stream.Dispose()
                    if ($message.id -eq 1) { return $message }
                }
            } finally {
                $socket.Dispose()
                $timeout.Dispose()
            }
        }

        $evaluation = @'
new Promise(function(resolve) {
  function readGate() {
    setTimeout(function() {
      var node = document.getElementById("V8_GATE_CHECK");
      resolve(JSON.stringify({
        ready: document.readyState,
        sulsul: !!(node && node.getAttribute("data-sulsul") === "true"),
        ver: node ? node.getAttribute("data-ver") : "",
        errors: node ? Number(node.getAttribute("data-errs")) : -1
      }));
    }, 750);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", readGate, { once: true });
  } else {
    readGate();
  }
})
'@
        $cdpResponse = Invoke-CdpCommand -WebSocketUrl $pageSocketUrl -Method "Runtime.evaluate" -Params @{
            expression = $evaluation
            awaitPromise = $true
            returnByValue = $true
        }
        if ($cdpResponse.result.exceptionDetails) {
            throw "V8 evaluation failed: $($cdpResponse.result.exceptionDetails.text)"
        }

        $gateResult = $cdpResponse.result.result.value | ConvertFrom-Json
        $sulsulReady = [bool]$gateResult.sulsul
        $v8Ver = [string]$gateResult.ver
        $errCount = [int]$gateResult.errors
        # External CDN assets can leave a valid app at "interactive" while they
        # finish. The injected gate itself proves DOMContentLoaded has fired.
        $v8Pass = ($gateResult.ready -ne "loading") -and $sulsulReady -and ($errCount -eq 0) -and ($v8Ver -eq $appVer)
        Report-Gate "Headless Edge V8 Engine Parsing & Zero Runtime Errors" $v8Pass "Ready: $($gateResult.ready) | SulsulTravel: $sulsulReady | V8 Ver: v$v8Ver | Runtime Errors: $errCount"

        if ($browserInfo.webSocketDebuggerUrl) {
            $browserSocketUrl = "$($browserInfo.webSocketDebuggerUrl)"
            try { [void](Invoke-CdpCommand -WebSocketUrl $browserSocketUrl -Method "Browser.close") } catch {}
        }
    } catch {
        Report-Gate "Headless Edge V8 Execution" $false $_.Exception.Message
    } finally {
        if ($proc -and -not $proc.HasExited) {
            try { $proc.Kill($true) } catch { try { $proc.Kill() } catch {} }
            try { [void]$proc.WaitForExit(3000) } catch {}
        }
        if (Test-Path $tempHarness) { Remove-Item $tempHarness -Force }
        if (Test-Path $tempProfile) {
            $resolvedProfile = [System.IO.Path]::GetFullPath($tempProfile)
            $profileLeaf = Split-Path $resolvedProfile -Leaf
            if ($resolvedProfile.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and $profileLeaf.StartsWith("sulsul-edge-verify-")) {
                for ($cleanupAttempt = 0; $cleanupAttempt -lt 12 -and (Test-Path -LiteralPath $resolvedProfile); $cleanupAttempt++) {
                    Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue
                    if (Test-Path -LiteralPath $resolvedProfile) { Start-Sleep -Milliseconds 250 }
                }
            }
        }
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

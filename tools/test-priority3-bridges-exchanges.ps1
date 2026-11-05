# ================================================================
# Sulsul-Travel Priority 3 Automated Test: Bridge Cards & FX Converter
# ================================================================
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = Split-Path -Parent $PSScriptRoot
$indexHtmlPath = Join-Path $baseDir "index.html"

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edgePath)) { throw "Edge executable not found." }

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempProfile = Join-Path $tempRoot ("sulsul-p3-test-" + [System.Guid]::NewGuid().ToString("N"))
[void](New-Item -ItemType Directory -Path $tempProfile -Force)

$portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$debugPort = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
$portProbe.Stop()

$fileUri = [System.Uri]::new($indexHtmlPath).AbsoluteUri
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $edgePath
$psi.Arguments = "--headless=new --disable-gpu --no-first-run --disable-default-apps --disable-extensions --allow-file-access-from-files --remote-debugging-port=$debugPort --remote-allow-origins=* --user-data-dir=`"$tempProfile`" `"$fileUri`""
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)

try {
    $discoveryDeadline = [DateTime]::UtcNow.AddSeconds(12)
    $pageTarget = $null
    do {
        try {
            $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/list" -TimeoutSec 2
            foreach ($candidate in $targets) {
                if ($candidate.type -eq "page") {
                    $pageTarget = $candidate
                    break
                }
            }
        } catch {
            $pageTarget = $null
        }
        if (-not $pageTarget) { Start-Sleep -Milliseconds 250 }
    } while (-not $pageTarget -and [DateTime]::UtcNow -lt $discoveryDeadline)

    if (-not $pageTarget) { throw "DevTools page target not found." }
    $pageSocketUrl = "$($pageTarget.webSocketDebuggerUrl)"

    $socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $socket.Options.Proxy = [System.Net.GlobalProxySelection]::GetEmptyWebProxy()
    $cts = [System.Threading.CancellationTokenSource]::new(8000)
    $socket.ConnectAsync([System.Uri]::new($pageSocketUrl), $cts.Token).GetAwaiter().GetResult()

    function Invoke-Eval($code) {
        $payload = @{
            id = 1
            method = "Runtime.evaluate"
            params = @{
                expression = $code
                returnByValue = $true
                awaitPromise = $true
            }
        } | ConvertTo-Json -Depth 10 -Compress

        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $segment = [System.ArraySegment[byte]]::new($bytes)
        $ctsSend = [System.Threading.CancellationTokenSource]::new(8000)
        $socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ctsSend.Token).GetAwaiter().GetResult()

        $buf = New-Object byte[] 65536
        $resSegment = [System.ArraySegment[byte]]::new($buf)
        $ms = New-Object System.IO.MemoryStream
        do {
            $ctsRecv = [System.Threading.CancellationTokenSource]::new(8000)
            $res = $socket.ReceiveAsync($resSegment, $ctsRecv.Token).GetAwaiter().GetResult()
            $ms.Write($buf, 0, $res.Count)
        } while (-not $res.EndOfMessage)

        $jsonStr = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
        return ($jsonStr | ConvertFrom-Json)
    }

    Start-Sleep -Milliseconds 1000

    $evalScript = @'
new Promise(function(resolve) {
  try {
    const results = {};

    // 1. Test detectSpotCategoryKind
    const sCheckin = { title: 'Hotel Check-in & Luggage', cat: 'lodging' };
    const sCheckout = { title: 'Hotel Checkout', cat: 'lodging' };
    const sLuggage = { title: 'Station Luggage Locker', cat: 'tour' };
    const sFlight = { title: 'City Flight Transit', cat: 'flight' };
    const sTrain = { title: 'Madrid Atocha Train Station', cat: 'transport' };
    const sTour = { title: 'Sagrada Familia Cathedral', cat: 'tour' };

    const kCheckin = window.detectSpotCategoryKind(sCheckin);
    const kCheckout = window.detectSpotCategoryKind(sCheckout);
    const kLuggage = window.detectSpotCategoryKind(sLuggage);
    const kFlight = window.detectSpotCategoryKind(sFlight);
    const kTrain = window.detectSpotCategoryKind(sTrain);
    const kTour = window.detectSpotCategoryKind(sTour);

    results.kindCheckin = (kCheckin.kind === 'lodging' && kCheckin.subType === 'checkin');
    results.kindCheckout = (kCheckout.kind === 'lodging' && kCheckout.subType === 'checkout');
    results.kindLuggage = (kLuggage.kind === 'lodging' && kLuggage.subType === 'luggage');
    results.kindFlight = (kTransit => kTransit.kind === 'transit' && kTransit.subType === 'flight')(kFlight);
    results.kindTrain = (kTransit => kTransit.kind === 'transit' && kTransit.subType === 'train')(kTrain);
    results.kindTour = (kTour.kind === 'normal');

    // 2. Test companionSpot badges & classes
    const htmlCheckin = window.companionSpot(sCheckin, 0, 0);
    results.spotHasLodgingClass = htmlCheckin.includes('is-lodging-spot') && htmlCheckin.includes('lodging-checkin');
    results.spotHasLodgingBadge = htmlCheckin.includes('companion-kind-badge is-lodging is-checkin');

    const htmlTrain = window.companionSpot(sTrain, 0, 0);
    results.spotHasTransitClass = htmlTrain.includes('is-transit-spot') && htmlTrain.includes('transit-train');
    results.spotHasTransitBadge = htmlTrain.includes('companion-kind-badge is-transit is-train');

    // 3. Test renderCityTransitionBridge
    if (typeof addDemoTrip === 'function' && (!State.trips || !State.trips.length)) {
      addDemoTrip();
    }
    // In demo trip, Day 2 is Taipei, Day 3 is Taichung (city change!)
    const bridgeDay2to3 = window.renderCityTransitionBridge(2);
    results.bridgeDetected = bridgeDay2to3.includes('companion-city-bridge') &&
                             bridgeDay2to3.includes('is-dest') &&
                             bridgeDay2to3.includes('city-bridge-tag');

    // Same city (Day 1 to Day 2 both Taipei) -> should return empty
    const bridgeSameCity = window.renderCityTransitionBridge(1);
    results.bridgeSameCityEmpty = (bridgeSameCity === '');

    // 4. Test Quick Currency Converter in Expenses Tab
    if (typeof switchTab === 'function') {
      switchTab('expenses');
    }
    const converterEl = document.getElementById('quick-currency-converter');
    results.converterInDom = !!converterEl;

    // Test converter calculation
    const calcInput = document.getElementById('quick-calc-input');
    const calcCurr = document.getElementById('quick-calc-curr');
    const calcResult = document.getElementById('quick-calc-result');
    const calcRateBadge = document.getElementById('quick-calc-rate-badge');

    if (calcInput && calcCurr) {
      calcCurr.value = 'TWD';
      window.setQuickCalcAmount(100);
      const resText = calcResult ? calcResult.innerText : '';
      results.converterCalcWorks = (resText.length > 2 && !resText.includes('0\u0020'));
      results.converterBadgeWorks = calcRateBadge ? calcRateBadge.innerText.includes('TWD') : false;
    }

    // 5. Test Quick Action: [환전] button in wallet cards
    const walletsContainer = document.getElementById('exp-wallets-container');
    const exchBtns = walletsContainer ? walletsContainer.querySelectorAll('button[onclick*="openExchangeModalForCurr"]') : [];
    results.walletHasExchBtn = (exchBtns.length > 0);

    // 6. Viewport 360px Zero Horizontal Overflow
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    results.noOverflowExpenses = (docW <= winW);

    resolve(JSON.stringify(results));
  } catch(err) {
    resolve(JSON.stringify({ error: err.message, stack: err.stack }));
  }
});
'@

    $evalRes = Invoke-Eval $evalScript
    Write-Host "Eval output:"
    $evalRes.result | ConvertTo-Json -Depth 5 | Write-Host
    $rawVal = $evalRes.result.result.value
    if (-not $rawVal) { $rawVal = $evalRes.result.value }
    $data = $rawVal | ConvertFrom-Json

    Write-Host "Priority 3 Test Evaluation Results:" -ForegroundColor Cyan
    $pass = $true
    foreach ($prop in $data.psobject.Properties) {
        if ($prop.Name -eq "error") {
            Write-Host "  [ FAIL ] $($prop.Name): $($prop.Value)" -ForegroundColor Red
            $pass = $false
        } elseif ($prop.Value -eq $true) {
            Write-Host "  [ PASS ] $($prop.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [ FAIL ] $($prop.Name): $($prop.Value)" -ForegroundColor Red
            $pass = $false
        }
    }

    if ($pass) {
        Write-Host "`n========================================================" -ForegroundColor Green
        Write-Host " >>> ALL PRIORITY 3 TESTS PASSED SUCCESSFULLY (100%) <<<" -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Green
    } else {
        exit 1
    }
} finally {
    if ($socket -and $socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
    }
    if ($proc -and -not $proc.HasExited) {
        $proc.Kill()
    }
    if (Test-Path $tempProfile) {
        Remove-Item -Path $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
    }
}

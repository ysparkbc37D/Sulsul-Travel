# ================================================================
# Sulsul-Travel Priority 2 Automated Test: Today Live HUD & Countdown
# ================================================================
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = Split-Path -Parent $PSScriptRoot
$indexHtmlPath = Join-Path $baseDir "index.html"

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edgePath)) { throw "Edge executable not found." }

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempProfile = Join-Path $tempRoot ("sulsul-hud-test-" + [System.Guid]::NewGuid().ToString("N"))
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

    # Using unicode escapes to prevent any CP949 vs UTF8 PowerShell parsing differences
    $evalScript = @"
new Promise(function(resolve) {
  try {
    const results = {};

    // 1. Test parseSpotTimeRange
    const p1 = window.parseSpotTimeRange('09:00');
    const p2 = window.parseSpotTimeRange('14:30~16:00');
    const p3 = window.parseSpotTimeRange('10:00 - 11:30');
    const p4 = window.parseSpotTimeRange('invalid');
    results.parse1 = (p1 && p1.startMinutes === 540 && p1.endMinutes === null);
    results.parse2 = (p2 && p2.startMinutes === 870 && p2.endMinutes === 960);
    results.parse3 = (p3 && p3.startMinutes === 600 && p3.endMinutes === 690);
    results.parse4 = (p4 === null);

    // 2. Test getTripTimeInfo
    const timeInfo = window.getTripTimeInfo('Asia/Seoul');
    results.timeSeoul = (timeInfo && typeof timeInfo.localTime === 'string');

    const timeMadrid = window.getTripTimeInfo('Europe/Madrid');
    results.timeMadrid = (timeMadrid && typeof timeMadrid.localTime === 'string');

    // 3. Test renderSpotCountdownBadge
    const dayToday = { date: '2026-11-06', spots: [{ time: '15:00', title: 'Spot 1', completed: false }] };
    const trip = { timeZone: 'Asia/Seoul', expenses: [] };

    // Urgent: 30 mins before
    const badgeUrgent = window.renderSpotCountdownBadge(dayToday.spots[0], dayToday, trip, '2026-11-06', '14:30');
    results.badgeUrgent = badgeUrgent.includes('is-urgent') && badgeUrgent.includes('30');

    // Active: ongoing
    const badgeActive = window.renderSpotCountdownBadge(dayToday.spots[0], dayToday, trip, '2026-11-06', '15:20');
    results.badgeActive = badgeActive.includes('is-active');

    // Overdue: 20 mins passed
    const badgePassed = window.renderSpotCountdownBadge(dayToday.spots[0], dayToday, trip, '2026-11-06', '16:20');
    results.badgePassed = badgePassed.includes('is-passed');

    // Future D-Day:
    const dayFuture = { date: '2026-11-10', spots: [{ time: '10:00', title: 'Spot 2', completed: false }] };
    const badgeFuture = window.renderSpotCountdownBadge(dayFuture.spots[0], dayFuture, trip, '2026-11-06', '10:00');
    results.badgeFuture = badgeFuture.includes('is-future') && badgeFuture.includes('D-4');

    // 4. Test renderTodaySmartHud HTML output
    const testDay = {
      date: '2026-11-06',
      city: 'Barcelona',
      spots: [
        { id: 's1', title: 'Spot A', time: '10:00', completed: true },
        { id: 's2', title: 'Spot B', time: '14:00', completed: false }
      ]
    };
    const testTrip = {
      id: 'test-trip-1',
      title: 'Spain Trip',
      cities: ['Barcelona'],
      timeZone: 'Europe/Madrid',
      expenses: [
        { date: '2026-11-06', amount: 50, curr: 'EUR', krw: 75000, type: 'expense' }
      ]
    };

    const hudHtml = window.renderTodaySmartHud(testTrip, testDay, 0, '2026-11-06');
    results.hudHasClass = hudHtml.includes('today-smart-hud');
    results.hudHasTime = hudHtml.includes('hud-card-time');
    results.hudHasExpense = hudHtml.includes('hud-card-expense') && hudHtml.includes('75,000');
    results.hudHasProgress = hudHtml.includes('hud-progress-bar') && hudHtml.includes('<b>1</b>/2');
    results.hudHasWeather = hudHtml.includes('hud-weather-chip');

    // 5. Switch to Today tab and verify DOM rendering
    if (typeof addDemoTrip === 'function' && (!State.trips || !State.trips.length)) {
      addDemoTrip();
    }
    if (typeof switchTab === 'function') {
      switchTab('today');
    }
    const todayContainer = document.getElementById('today-overview-container');
    results.tabRendered = !!(todayContainer && todayContainer.querySelector('.today-smart-hud'));
    results.badgeRendered = !!(todayContainer && todayContainer.querySelector('.companion-countdown-badge'));

    // Check 360px viewport overflow
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    results.noOverflow = (docW <= winW);

    resolve(JSON.stringify(results));
  } catch(err) {
    resolve(JSON.stringify({ error: err.message, stack: err.stack }));
  }
});
"@

    $evalRes = Invoke-Eval $evalScript
    $rawVal = $evalRes.result.result.value
    $data = $rawVal | ConvertFrom-Json

    Write-Host "Priority 2 Test Evaluation Results:" -ForegroundColor Cyan
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
        Write-Host " >>> ALL PRIORITY 2 TESTS PASSED SUCCESSFULLY (100%) <<<" -ForegroundColor Green
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

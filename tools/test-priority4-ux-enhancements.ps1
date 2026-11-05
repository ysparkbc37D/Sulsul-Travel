# ================================================================
# Sulsul-Travel Priority 4 Automated Test: 5 UX Enhancements
# ================================================================
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = Split-Path -Parent $PSScriptRoot
$indexHtmlPath = Join-Path $baseDir "index.html"

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edgePath)) { throw "Edge executable not found." }

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempProfile = Join-Path $tempRoot ("sulsul-p4-test-" + [System.Guid]::NewGuid().ToString("N"))
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

    function Invoke-CDP($method, $params) {
        $msgId = Get-Random -Minimum 10000 -Maximum 99999
        $payload = @{
            id = $msgId
            method = $method
            params = $params
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
    [void](Invoke-CDP "Emulation.setDeviceMetricsOverride" @{ width = 360; height = 780; deviceScaleFactor = 2; mobile = $true })
    Start-Sleep -Milliseconds 1500

    $evalScript = @'
new Promise(function(resolve) {
  try {
    if (typeof addDemoTrip === 'function' && (typeof State === 'undefined' || !State.trips || !State.trips.length)) {
      addDemoTrip();
    }
    const currentTrip = (typeof getActiveTrip === 'function' && getActiveTrip()) || {
      id: 'test-trip-p4',
      title: 'Spain Madrid Toledo Journey',
      countries: ['Spain'],
      cities: ['Madrid', 'Toledo'],
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      days: [
        {
          dayNum: 1,
          city: 'Madrid',
          date: '2026-10-15',
          spots: [
            { id: 'sp-1', title: 'Palacio Real', time: '10:00', cat: 'tour' },
            { id: 'sp-2', title: 'Mercado de San Miguel', time: '12:30', cat: 'meal' },
            { id: 'sp-3', title: 'Museo del Prado', time: '15:00', cat: 'tour' }
          ]
        }
      ],
      expenses: [
        { id: 'exp-1', dayIndex: 0, date: '2026-10-15', amount: 50, currency: 'EUR', category: 'Food' }
      ]
    };

    // Feature 1: SOS Modal & Phrases
    const sosModal = document.getElementById('modal-sos-emergency');
    const sosBtn = document.getElementById('ws-btn-sos');
    const emergencyInfo = typeof detectEmergencyCountryInfo === 'function' ? detectEmergencyCountryInfo(currentTrip) : null;
    const phrases = typeof getSosMedicalPhrases === 'function' ? getSosMedicalPhrases() : [];
    if (typeof renderSosEmergencyContent === 'function') {
      renderSosEmergencyContent('auto', 'all', null);
    }
    const sosContent = document.getElementById('sos-emergency-content');
    const hasDialCards = sosContent ? sosContent.querySelectorAll('.sos-dial-card').length >= 3 : false;
    const hasPhraseCards = sosContent ? sosContent.querySelectorAll('.sos-phrase-card').length >= 8 : false;

    // Feature 2: Quick Capsule
    const capsuleModal = document.getElementById('modal-quick-capsule');
    if (typeof renderQuickCapsuleContent === 'function') {
      renderQuickCapsuleContent();
    }
    const capsuleContent = document.getElementById('quick-capsule-content');
    const hasMicBtn = capsuleContent ? !!capsuleContent.querySelector('#capsule-mic-btn') : false;
    const hasMoodChips = capsuleContent ? capsuleContent.querySelectorAll('.capsule-mood-chip').length >= 5 : false;

    // Feature 3: Budget Burn-Rate HUD
    const pacingContainer = document.getElementById('budget-pacing-hud');
    const fakeWallet = {
      totalBudgetKrw: 3000000,
      totalSpentKrw: 70000,
      activeCurrencies: ['KRW', 'EUR'],
      wallets: { KRW: { balance: 2000000 }, EUR: { balance: 700 } }
    };
    const pacingCalc = typeof calculateBudgetPacing === 'function' ? calculateBudgetPacing(currentTrip, fakeWallet) : null;
    if (typeof updateBudgetPacingHud === 'function') {
      updateBudgetPacingHud(currentTrip, fakeWallet);
    }
    const hasProgressBar = pacingContainer ? !!pacingContainer.querySelector('.pacing-progress-bar') : false;

    // Feature 4: Spot Reorder & Rescheduling
    const daySpots = (currentTrip.days && currentTrip.days[0] && currentTrip.days[0].spots) || [];
    let swapped = false;
    let timesAligned = false;
    if (daySpots.length >= 2) {
      const origFirstTitle = daySpots[0].title;
      if (typeof moveCompanionSpotOrder === 'function') {
        moveCompanionSpotOrder(0, 0, 1, null);
      }
      swapped = (daySpots[0].title !== origFirstTitle && daySpots[1].title === origFirstTitle);
      if (typeof realignSpotSchedule === 'function') {
        const origConfirm = window.confirm;
        window.confirm = () => true;
        realignSpotSchedule(0, 30);
        window.confirm = origConfirm;
      }
      const time0 = daySpots[0]?.time;
      const time1 = daySpots[1]?.time;
      timesAligned = (time0 && time1 && time0 !== time1);
    }

    // Feature 5: Story Magazine
    const magazineModal = document.getElementById('modal-story-magazine');
    if (typeof renderStoryMagazineContent === 'function') {
      renderStoryMagazineContent();
    }
    const magazineContainer = document.getElementById('story-magazine-container');
    const hasMasthead = magazineContainer ? !!magazineContainer.querySelector('.magazine-masthead-title') : false;
    const hasDaySpread = magazineContainer ? magazineContainer.querySelectorAll('.magazine-day-spread').length >= 1 : false;
    const hasEpilogue = magazineContainer ? !!magazineContainer.querySelector('.magazine-epilogue-card') : false;

    // Viewport width check (360px)
    const winW = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const noOverflow = docW <= (winW + 1);

    resolve(JSON.stringify({
      sosModalInDom: !!sosModal,
      sosBtnInDom: !!sosBtn,
      emergencyInfoOk: !!(emergencyInfo && emergencyInfo.police && emergencyInfo.ambulance),
      phrasesOk: phrases.length === 8,
      hasDialCards: !!hasDialCards,
      hasPhraseCards: !!hasPhraseCards,
      capsuleModalInDom: !!capsuleModal,
      hasMicBtn: !!hasMicBtn,
      hasMoodChips: !!hasMoodChips,
      pacingContainerInDom: !!pacingContainer,
      pacingCalcOk: !!(pacingCalc && pacingCalc.dailyRecommendedBudget > 0),
      hasProgressBar: !!hasProgressBar,
      swapped: !!swapped,
      timesAligned: !!timesAligned,
      magazineModalInDom: !!magazineModal,
      hasMasthead: !!hasMasthead,
      hasDaySpread: !!hasDaySpread,
      hasEpilogue: !!hasEpilogue,
      noOverflow: !!noOverflow
    }));
  } catch(e) {
    resolve(JSON.stringify({ error: e.message || String(e) }));
  }
});
'@

    $evalRes = Invoke-CDP "Runtime.evaluate" @{ expression = $evalScript; returnByValue = $true; awaitPromise = $true }
    $rawVal = $evalRes.result.result.value
    if (-not $rawVal) {
        $rawVal = $evalRes.result.value
    }
    if (-not $rawVal) {
        Write-Host "CDP Eval Error or Empty:" -ForegroundColor Red
        Write-Host ($evalRes | ConvertTo-Json -Depth 5) -ForegroundColor Yellow
        throw "Evaluation failed"
    }
    $val = $rawVal | ConvertFrom-Json
    if ($val.error) {
        throw "Script evaluation error in browser: $($val.error)"
    }

    Write-Host "Priority 4 Features Evaluation Results:" -ForegroundColor Cyan
    $allPass = $true
    foreach ($prop in $val.PSObject.Properties) {
        $passed = ($prop.Value -eq $true)
        if ($passed) {
            Write-Host ("  [ PASS ] {0}" -f $prop.Name) -ForegroundColor Green
        } else {
            Write-Host ("  [ FAIL ] {0} (Got: {1})" -f $prop.Name, $prop.Value) -ForegroundColor Red
            $allPass = $false
        }
    }

    if (-not $allPass) {
        throw "One or more Priority 4 tests failed."
    }

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " >>> ALL 5 UX ENHANCEMENT TESTS PASSED (100%) <<<" -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green

} finally {
    if ($socket -and $socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
    }
    if ($proc -and -not $proc.HasExited) {
        $proc.Kill()
    }
    Start-Sleep -Milliseconds 500
    if (Test-Path $tempProfile) {
        Remove-Item -Recurse -Force $tempProfile -ErrorAction SilentlyContinue
    }
}

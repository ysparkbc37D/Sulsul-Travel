# PowerShell version of update-asset-integrity
$root = $PSScriptRoot | Split-Path -Parent
$indexPath = Join-Path $root "index.html"
$content = [System.IO.File]::ReadAllText($indexPath, [System.Text.Encoding]::UTF8)
$sha384 = [System.Security.Cryptography.SHA384]::Create()

$evaluator = [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $tag = $m.Value
    $srcMatch = [regex]::Match($tag, '\b(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"')
    if (-not $srcMatch.Success) { return $tag }
    $rel = $srcMatch.Groups[1].Value
    if ($rel -match '^(?:https?:|//|data:)' -or $rel -notmatch '\.(?:js|css)$') { return $tag }
    $assetPath = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not (Test-Path $assetPath)) { return $tag }
    $bytes = [System.IO.File]::ReadAllBytes($assetPath)
    $hash = "sha384-" + [System.Convert]::ToBase64String($sha384.ComputeHash($bytes))
    $cleanTag = [regex]::Replace($tag, '\s+integrity="[^"]*"', '')
    return [regex]::Replace($cleanTag, '>$', " integrity=`"$hash`">")
}

$newContent = [regex]::Replace($content, '<(?:script|link)\b[^>]*>', $evaluator)
[System.IO.File]::WriteAllText($indexPath, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Integrity updated successfully in index.html"

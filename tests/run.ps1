# Runs the browser tests in headless Edge (or Chrome) and prints the results.
#   powershell -File tests/run.ps1                         smoke tests
#   powershell -File tests/run.ps1 -Suite balance -Games 20
#   powershell -File tests/run.ps1 -Suite balance -Scenario classic -Diff 6,12
param(
  [string]$Suite = "smoke",
  [int]$Games = 10,
  [string]$Diff = "6,9,12",
  [string]$Scenario = "classic,coastal,desert,mining,island"
)

$browser = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $browser) { Write-Error "Could not find Edge or Chrome."; exit 2 }

$runner = ([System.Uri](Resolve-Path (Join-Path $PSScriptRoot "runner.html")).Path).AbsoluteUri
$url = $runner + "?suite=$Suite&games=$Games&diff=$Diff&scenario=$Scenario"
$userDir = Join-Path $env:TEMP ("cd-test-" + [guid]::NewGuid())
$outFile = Join-Path $env:TEMP ("cd-test-" + [guid]::NewGuid() + ".html")

# A huge virtual time budget: the page finishes as soon as the tests are done.
$argList = @("--headless=new", "--disable-gpu", "--no-first-run", "--allow-file-access-from-files",
  "--user-data-dir=$userDir", "--virtual-time-budget=100000000", "--dump-dom", $url)

$p = Start-Process -FilePath $browser -ArgumentList $argList -RedirectStandardOutput $outFile -RedirectStandardError "$outFile.err" -Wait -PassThru -NoNewWindow
$html = Get-Content $outFile -Raw -Encoding UTF8
Remove-Item $outFile, "$outFile.err" -ErrorAction SilentlyContinue
Remove-Item $userDir -Recurse -Force -ErrorAction SilentlyContinue

if ($html -match "(?s)===RESULTS===(.*?)===END===") {
  $text = [System.Net.WebUtility]::HtmlDecode($Matches[1].Trim())
  Write-Output $text
  if ($text -match "ALL PASSED") { exit 0 } else { exit 1 }
}

Write-Output "The test page did not finish. Raw output:"
Write-Output ($html | Select-Object -First 1)
exit 1

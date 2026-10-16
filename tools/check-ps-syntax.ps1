# Перевірка синтаксису всіх .ps1 з правильним кодуванням (UTF-8)
$root = Join-Path $PSScriptRoot '..\src\core\scripts'
$errs = 0; $n = 0
foreach ($f in (Get-ChildItem -Recurse $root -Filter *.ps1)) {
  $n++
  $content = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
  $tokens = $null; $perr = $null
  [void][System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$tokens, [ref]$perr)
  if ($perr.Count -gt 0) {
    $errs++
    Write-Output "ERROR  $($f.Name): $($perr[0].Message) @ line $($perr[0].Extent.StartLineNumber)"
  }
}
Write-Output "Перевірено скриптів: $n, помилок: $errs"

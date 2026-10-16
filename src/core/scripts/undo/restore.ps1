# Універсальне повернення змін за записами undo (payload у файлі)
$file = $env:OPTIMAX_PAYLOAD_FILE
$items = @()
try {
  $json = Get-Content -LiteralPath $file -Raw -Encoding UTF8
  $parsed = $json | ConvertFrom-Json
  $items = @($parsed | Where-Object { $null -ne $_ })
} catch {
  Emit-Result @{ ok = $false; message = 'Не вдалося прочитати payload undo'; restoredIds = @(); failedIds = @() }
  exit 0
}

$restored = New-Object System.Collections.ArrayList
$failed = New-Object System.Collections.ArrayList

foreach ($it in $items) {
  try {
    switch ([string]$it.kind) {
      'reg' {
        $root = if ([string]$it.hive -eq 'HKLM') { [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }
        $k = $root.OpenSubKey([string]$it.path, $true)
        if ($null -eq $k) { $k = $root.CreateSubKey([string]$it.path) }
        if ($it.exists) {
          switch ([string]$it.type) {
            'DWord'       { $k.SetValue([string]$it.name, [int]$it.value, [Microsoft.Win32.RegistryValueKind]::DWord) }
            'QWord'       { $k.SetValue([string]$it.name, [long]$it.value, [Microsoft.Win32.RegistryValueKind]::QWord) }
            'Binary'      { $k.SetValue([string]$it.name, [byte[]]$it.value, [Microsoft.Win32.RegistryValueKind]::Binary) }
            'MultiString' { $k.SetValue([string]$it.name, [string[]]$it.value, [Microsoft.Win32.RegistryValueKind]::MultiString) }
            'ExpandString'{ $k.SetValue([string]$it.name, [string]$it.value, [Microsoft.Win32.RegistryValueKind]::ExpandString) }
            default       { $k.SetValue([string]$it.name, [string]$it.value, [Microsoft.Win32.RegistryValueKind]::String) }
          }
        } else {
          $k.DeleteValue([string]$it.name, $false)
        }
        $k.Close()
        [void]$restored.Add($it.id)
      }
      'service' {
        Set-Service -Name ([string]$it.name) -StartupType ([string]$it.startType) -ErrorAction Stop
        if ($it.wasRunning) { Start-Service -Name ([string]$it.name) -ErrorAction SilentlyContinue }
        else { Stop-Service -Name ([string]$it.name) -Force -ErrorAction SilentlyContinue }
        [void]$restored.Add($it.id)
      }
      'powerplan' {
        & powercfg /setactive ([string]$it.guid) | Out-Null
        [void]$restored.Add($it.id)
      }
      'dns' {
        if ($it.servers) {
          Set-DnsClientServerAddress -InterfaceAlias ([string]$it.iface) -ServerAddresses ([string[]]$it.servers) -ErrorAction Stop
        } else {
          Set-DnsClientServerAddress -InterfaceAlias ([string]$it.iface) -ResetServerAddresses -ErrorAction Stop
        }
        [void]$restored.Add($it.id)
      }
      'task' {
        if ($it.enable) { Enable-ScheduledTask -TaskPath ([string]$it.path) -TaskName ([string]$it.name) -ErrorAction Stop | Out-Null }
        else { Disable-ScheduledTask -TaskPath ([string]$it.path) -TaskName ([string]$it.name) -ErrorAction Stop | Out-Null }
        [void]$restored.Add($it.id)
      }
      'hibernate' {
        if ($it.enable) { & powercfg /h on | Out-Null } else { & powercfg /h off | Out-Null }
        [void]$restored.Add($it.id)
      }
      'netsh-tcp' {
        & netsh int tcp set global "autotuninglevel=$([string]$it.autotuning)" 2>&1 | Out-Null
        & netsh int tcp set heuristics ([string]$it.heuristics) 2>&1 | Out-Null
        [void]$restored.Add($it.id)
      }
      'filemove' {
        $from = [string]$it.from
        $to = [string]$it.to
        if (Test-Path -LiteralPath $to) {
          $dir = Split-Path -Parent $from
          if ($dir -and -not (Test-Path -LiteralPath $dir)) { $null = New-Item -ItemType Directory -Path $dir -Force }
          $target = $from
          if (Test-Path -LiteralPath $target) {
            $base = [IO.Path]::GetFileNameWithoutExtension($from)
            $ext = [IO.Path]::GetExtension($from)
            for ($i = 2; $i -lt 1000; $i++) {
              $cand = Join-Path $dir (('{0} ({1}){2}') -f $base, $i, $ext)
              if (-not (Test-Path -LiteralPath $cand)) { $target = $cand; break }
            }
          }
          Move-Item -LiteralPath $to -Destination $target -ErrorAction Stop
          [void]$restored.Add($it.id)
        } else {
          [void]$failed.Add($it.id)
        }
      }
      default {
        [void]$failed.Add($it.id)
      }
    }
  } catch {
    [void]$failed.Add($it.id)
  }
}

Emit-Result @{
  ok = $true
  message = "Повернено змін: $($restored.Count), не вдалося: $($failed.Count)"
  restoredIds = @($restored)
  failedIds = @($failed)
}

# Системна статистика: диски, фізичні накопичувачі (SMART), ОС
$vols = @()
foreach ($v in (Get-Volume -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' -and $_.Size -gt 0 })) {
  $vols += @{
    letter = "$($v.DriveLetter):"
    label  = [string]$v.FileSystemLabel
    fs     = [string]$v.FileSystem
    size   = [long]$v.Size
    free   = [long]$v.SizeRemaining
  }
}

$pdisks = @()
foreach ($d in (Get-PhysicalDisk -ErrorAction SilentlyContinue)) {
  $pdisks += @{
    model  = [string]$d.FriendlyName
    media  = [string]$d.MediaType
    health = [string]$d.HealthStatus
    op     = [string]$d.OperationalStatus
    bus    = [string]$d.BusType
    size   = [long]$d.Size
  }
}

$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name

Emit-Result @{
  ok = $true
  details = @{
    volumes    = $vols
    physical   = $pdisks
    os         = [string]$os.Caption
    osVersion  = [string]$os.Version
    bootTime   = $os.LastBootUpTime.ToString('o')
    cpu        = [string]$cpu
    model      = [string]$cs.Model
    ramTotal   = [long]$cs.TotalPhysicalMemory
  }
}

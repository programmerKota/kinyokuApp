$ErrorActionPreference = 'Stop'

function Get-WifiIPv4 {
  $cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4Address -and $_.InterfaceAlias -match 'Wi-?Fi|Wireless' }
  if ($cfg) { return $cfg.IPv4Address.IPAddress }
  return $null
}

function Get-FreePort([int]$start=8081) {
  $p = $start
  while (Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue) { $p++ }
  return $p
}

$ip = Get-WifiIPv4
if (-not $ip) {
  Write-Warning 'WiFi IPv4 was not found. Check SSID and adapter name.'
  exit 1
}

$port = Get-FreePort 8081
$msg = "Starting Metro on $($ip):$port (LAN)"
Write-Host $msg -ForegroundColor Cyan

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
$env:EXPO_PACKAGER_HOSTNAME = $ip

npx expo start --dev-client --lan --port $port -c
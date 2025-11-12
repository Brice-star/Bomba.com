<#
PowerShell quick checks for BOMBA endpoints.
Usage:
  .\scripts\check_endpoints.ps1 -BaseUrl 'https://your-domain.com'
#>

param(
  [string]$BaseUrl = 'http://localhost:3000'
)

function Check-Endpoint($path) {
  $url = $BaseUrl.TrimEnd('/') + $path
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 15
    Write-Host "$path -> $($resp.StatusCode)" -ForegroundColor Green
  } catch {
    if ($_.Exception.Response) {
      $code = $_.Exception.Response.StatusCode.value__
      Write-Host "$path -> $code" -ForegroundColor Yellow
    } else {
      Write-Host "$path -> ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

$paths = @(
  '/api/produits',
  '/api/admin/statistiques',
  '/api/admin/commandes/non-vues/count',
  '/admin/connexion'
)

Write-Host "Running endpoint checks against $BaseUrl`n"
foreach ($p in $paths) { Check-Endpoint $p }

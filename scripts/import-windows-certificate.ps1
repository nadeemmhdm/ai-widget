$ErrorActionPreference = 'Stop'
if (-not $env:WINDOWS_CERTIFICATE -or -not $env:WINDOWS_CERTIFICATE_PASSWORD) {
  Write-Host 'No Authenticode certificate secrets supplied; skipping certificate import.'
  exit 0
}
$dir = Join-Path $env:RUNNER_TEMP 'nook-cert'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$pfx = Join-Path $dir 'nook-signing.pfx'
[IO.File]::WriteAllBytes($pfx, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE))
$password = ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PASSWORD -Force -AsPlainText
$cert = Import-PfxCertificate -FilePath $pfx -CertStoreLocation Cert:\CurrentUser\My -Password $password
if (-not $cert) { throw 'Certificate import failed.' }
Write-Host "Imported Windows code-signing certificate: $($cert.Thumbprint)"
"NOOK_WINDOWS_CERT_THUMBPRINT=$($cert.Thumbprint)" | Out-File -FilePath $env:GITHUB_ENV -Append

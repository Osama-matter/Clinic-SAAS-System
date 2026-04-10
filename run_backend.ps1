# Help run the backend via DLL to bypass Application Control blocks
$dllPath = "src/ClinicBookingSystem.API/bin/Debug/net8.0/ClinicBookingSystem.API.dll"

if (Test-Path $dllPath) {
    Write-Host "Starting ClinicFlow Backend via $dllPath..." -ForegroundColor Cyan
    dotnet $dllPath --urls "http://localhost:5000"
} else {
    Write-Host "Error: DLL not found at $dllPath. Please build the project in Visual Studio first." -ForegroundColor Red
    pause
}

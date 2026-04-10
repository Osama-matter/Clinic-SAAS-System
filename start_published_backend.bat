@echo off
set "PUB_PATH=%~dp0src\ClinicBookingSystem.API\publish\ClinicBookingSystem.API.exe"
if exist "%PUB_PATH%" (
    echo Starting ClinicFlow Backend (Published Version)...
    "%PUB_PATH%" --urls "http://localhost:5000"
) else (
    echo Error: Published file not found. Please build the project or wait for seeding.
    pause
)

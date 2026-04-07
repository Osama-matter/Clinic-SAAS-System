# Clinic Booking System

A full-stack clinic booking and medical workflow system built with ASP.NET Core 8 and React.

## Overview

This project manages the main clinic operations in one system:

- Authentication and JWT-based access control
- Multi-tenant clinic management
- Doctors, schedules, and available booking slots
- Patient appointments and booking management
- Patient records and visit workflows
- Notifications and background jobs
- Reports and file uploads
- React web frontend and Capacitor Android project

## Tech Stack

### Backend

- ASP.NET Core 8 Web API
- Entity Framework Core 8
- Clean Architecture
- Serilog
- Hangfire
- JWT Authentication

### Frontend

- React 18
- React Router
- Axios
- Material UI
- Framer Motion
- Capacitor Android

## Project Structure

```text
event-appointment-management/
|- src/
|  |- ClinicBookingSystem.API
|  |- ClinicBookingSystem.Application
|  |- ClinicBookingSystem.Domain
|  |- ClinicBookingSystem.Infrastructure
|  `- ClinicBookingSystem.Shared
|- Front_End/
|  `- clinicflow/
|- docs/
|- ClinicBookingSystem.sln
`- README.md
```

## Main API Areas

The API currently includes controllers for:

- `Auth`
- `Doctors`
- `Notifications`
- `PatientAppointments`
- `Patients`
- `Reports`
- `Schedules`
- `Tenants`
- `Uploads`
- `Visits`

Swagger is enabled in development to explore and test endpoints.

## Backend Setup

### Requirements

- .NET 8 SDK
- SQL Server or SQL Server-compatible connection

### Configure

Update the backend configuration before running the API:

- `src/ClinicBookingSystem.API/appsettings.json`
- or `src/ClinicBookingSystem.API/appsettings.Development.json`

You should configure:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Secret`
- `Jwt:Issuer`
- `Jwt:Audience`
- `EmailSettings`

Important:
Do not commit real passwords, SMTP credentials, or production secrets to Git.

### Run the API

```bash
cd src/ClinicBookingSystem.API
dotnet restore
dotnet run
```

### Backend Features Enabled at Startup

When `RunStartupTasks` is enabled, the API will:

- Apply EF Core migrations
- Seed initial data
- Register Hangfire recurring jobs

### Useful URLs

After the API starts, you can usually access:

- `https://localhost:7xxx/swagger`
- `https://localhost:7xxx/hangfire`

The exact port depends on your local launch settings.

## Frontend Setup

### Requirements

- Node.js 18+
- npm

### Run the web app

```bash
cd Front_End/clinicflow
npm install
npm start
```

### Build the frontend

```bash
cd Front_End/clinicflow
npm run build
```

## Android App

The frontend includes a Capacitor Android project inside:

`Front_End/clinicflow/android`

If you need to sync Capacitor after frontend changes:

```bash
cd Front_End/clinicflow
npx cap sync android
```

## Architecture Notes

The backend follows a layered structure:

- `Domain`: entities, enums, and core business rules
- `Application`: DTOs, features, commands, queries, and handlers
- `Infrastructure`: persistence, identity, jobs, and services
- `API`: controllers, middleware, configuration, and hosting
- `Shared`: shared constants and common code

## Documentation

Project documents are available in:

- `docs/EAMS_SRS.docx`
- `docs/EAMS_Tickets.docx`

## Current Status

This repository now reflects the latest cleaned project snapshot on GitHub and is prepared to avoid common Git conflicts caused by generated files such as:

- `node_modules`
- frontend build output
- local logs
- local runtime artifacts

## Author

Osama Matter


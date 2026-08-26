# 🏥 Clinic Flow — Enterprise Multi-Tenant Clinic Management & SaaS Platform

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![EF Core 8](https://img.shields.io/badge/EF%20Core-8.0-512BD4?logo=nuget&logoColor=white)](https://docs.microsoft.com/ef/core/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-2022-CC292B?logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server/)
[![MediatR](https://img.shields.io/badge/CQRS-MediatR-orange)](https://github.com/jbogard/MediatR)
[![Hangfire](https://img.shields.io/badge/Jobs-Hangfire-red)](https://www.hangfire.io/)
[![Tests](https://img.shields.io/badge/Tests-150%20Passed%20(100%25)-brightgreen)](./tests/ClinicBookingSystem.Tests/)
[![Security](https://img.shields.io/badge/Security-Multi--Tenant%20Isolated-success)]()

---

## 📖 Table of Contents
1. [Overview & Vision](#-overview--vision)
2. [Key System Features](#-key-system-features)
3. [Architecture & Design Patterns](#-architecture--design-patterns)
4. [Multi-Tenancy & Security Architecture](#-multi-tenancy--security-architecture)
5. [Clinical & Electronic Medical Records (EMR)](#-clinical--electronic-medical-records-emr)
6. [SaaS Onboarding & Payment Gateway](#-saas-onboarding--payment-gateway)
7. [Automated Background Jobs (Hangfire)](#-automated-background-jobs-hangfire)
8. [Database Schema & Plan Limit Enforcement](#-database-schema--plan-limit-enforcement)
9. [Automated Testing Suite (150 Tests)](#-automated-testing-suite-150-tests)
10. [API Catalog & Endpoint Reference](#-api-catalog--endpoint-reference)
11. [Frontend & Mobile Application](#-frontend--mobile-application)
12. [Installation & Getting Started](#-installation--getting-started)

---

## 🎯 Overview & Vision

**Clinic Flow** is an enterprise-grade, cloud-native **Multi-Tenant SaaS Platform** tailored for clinics, polyclinics, and healthcare medical centers. Built with modern .NET 8, Clean Architecture, and React 18, it empowers clinic administrators, doctors, receptionists, and patients to streamline end-to-end clinical operations—from self-service SaaS clinic onboarding, doctor scheduling, and online patient booking to comprehensive Electronic Medical Records (EMR), prescription tracking, and payment processing.

---

## ✨ Key System Features

### 🏢 1. Multi-Tenant SaaS Management
- **Automated Tenant Isolation:** Complete database and query isolation per clinic.
- **Subscription Tiers & Plan Enforcement:** Automated tracking for Free/Trial, Standard, and Enterprise plans with limits on maximum doctors, patients, and monthly bookings.
- **Subdomain Routing & Branding:** Clinic-specific branding, logo, working hours, and theme colors.

### 🩺 2. Complete Electronic Medical Records (EMR)
- **Patient Registry:** Unified demographic records, medical history, chronic conditions, and emergency contacts.
- **Clinical Visits:** Detailed SOAP-style documentation (Subjective, Objective, Assessment, Plan).
- **Vitals & Triage:** Blood pressure, heart rate, temperature, respiratory rate, oxygen saturation, and BMI calculation.
- **Prescriptions & Pharmacy Integration:** Drug management with dosage, frequency, duration, and instructions.
- **Lab & Imaging Orders:** Order requests, status tracking (Pending, In Progress, Completed), and file attachment uploads.

### 📅 3. Smart Scheduling & Online Booking
- **Doctor Shift Schedules:** Customizable working shifts, shift intervals, break slots, and exceptions per doctor.
- **Real-Time Dynamic Slot Engine:** Generates available slots on-the-fly while preventing overlapping appointments.
- **Public Patient Booking:** Frictionless patient booking with unique tracking references (`REF-XXXXXX`) and secure PIN authorization for self-service cancellation and rescheduling.

### 💳 4. Automated Payments & Fawaterak Gateway
- **SaaS Subscription Billing:** Integrated Fawaterak gateway for online card payments, digital wallets, and Fawry.
- **HMAC Webhook Verification:** SHA-256 HMAC cryptographic signature validation with replay attack prevention and idempotency safeguards.

### 📊 5. Reports & Business Intelligence
- **Filtered PDF & CSV Exports:** Medical and administrative report generation for appointments, financial transactions, and clinic metrics.
- **Tenant-Scoped Security:** Defense-in-depth isolation preventing any cross-tenant PII data leakage in generated files.

### 🔔 6. Background Automation & Notifications
- **Automated Reminders:** SMS and Email appointment reminders sent via Hangfire background workers 24 hours prior to visits.
- **Post-Visit Feedback:** Automated review collection jobs dispatched after completed consultations.
- **Stale Booking Cleanup:** Background cleanup for expired unconfirmed reservations.

---

## 🏛 Architecture & Design Patterns

The system adheres strictly to **Clean Architecture** and **CQRS (Command Query Responsibility Segregation)**:

```text
Clinic-SAAS-System/
├── src/
│   ├── ClinicBookingSystem.Domain/           # Enterprise Domain Entities, Value Objects, Enums, Exceptions
│   ├── ClinicBookingSystem.Application/      # CQRS Commands, Queries, MediatR Handlers, DTOs, FluentValidation
│   ├── ClinicBookingSystem.Infrastructure/   # EF Core DbContext, Interceptors, Repositories, JWT, Hangfire, Fawaterak
│   ├── ClinicBookingSystem.API/              # REST Controllers, Middlewares, Filters, Swagger, Dependency Injection
│   └── ClinicBookingSystem.Shared/           # Cross-cutting constants, AppPolicies, Shared models
│
├── Front_End/
│   └── clinicflow/                           # React 18 + Material UI + Framer Motion + Capacitor (Android App)
│
├── tests/
│   └── ClinicBookingSystem.Tests/            # 150 Automated Security, Integration, and Regression Tests
│
├── ClinicBookingSystem.sln                   # .NET 8 Solution File
└── README.md                                 # Complete System Documentation
```

### Key Architectural Patterns
- **CQRS via MediatR:** Commands (state-altering operations) and Queries (read-only projections) are separated into single-responsibility handlers.
- **Repository & Unit of Work:** Encapsulates data access and coordinates multiple entity changes inside atomic database transactions.
- **Dependency Injection:** Loosely coupled interfaces for third-party services (Email, SMS, Payment, File Storage).
- **Soft Delete Pattern (`ISoftDelete`):** Entities are marked `IsDeleted = true` rather than physically dropped, preserving audit trails and data integrity.

---

## 🛡️ Multi-Tenancy & Security Architecture

The platform implements a **Defense-in-Depth** security model:

```
                  ┌─────────────────────────────────────────┐
                  │           Incoming HTTP Request         │
                  └────────────────────┬────────────────────┘
                                       │
                         [JWT Auth & Tenant Provider]
                                       │  (Extracts authoritative TenantId from JWT)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    CQRS / MediatR Handler Validation    │
                  │   - Fail-closed tenant verification     │
                  │   - Role-Based Access Control (RBAC)    │
                  └────────────────────┬────────────────────┘
                                       │
                         [EF Core Global Query Filter]
                                       │  WHERE IsDeleted = 0 AND TenantId = @CurrentTenantId
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │          SQL Server Multi-Tenant        │
                  │              Isolated Database          │
                  └─────────────────────────────────────────┘
```

### 1. Authoritative Server-Side Tenant Scoping
- Tenant context is extracted exclusively from the cryptographically signed JWT token via `ITenantProvider` / `ICurrentUserService`.
- Normal clinic users **cannot** spoof tenant boundaries using route params, query strings, request bodies, or HTTP headers.

### 2. EF Core Global Query Filter
Every entity implementing `ITenantEntity` (such as `User`, `PatientAppointment`, `Doctor`, `Patient`, `Schedule`, `Visit`, etc.) has an automated query filter applied:
$$\text{Filter: } \neg\text{IsDeleted} \land (\text{Role} == \text{SuperAdmin} \lor (\text{TenantId} \neq \text{null} \land \text{TenantId} == \text{CurrentTenantId}))$$

### 3. Fail-Closed Authentication & Access Control
- **Missing Tenant Context:** Requests without a valid tenant context fail closed immediately and return zero records.
- **Account Lockout:** 5 consecutive failed password attempts trigger an automated 15-minute brute-force lockout.
- **Single-Use Refresh Tokens:** Refresh tokens are hashed using SHA-256 and rotated on each renewal.
- **Anti-IDOR Protection:** Every mutation verifies that the target resource belongs to the caller's tenant before executing.

---

## 🩺 Clinical & Electronic Medical Records (EMR)

```
 [Patient] ──────< [Visits] ─────┬────< [Vitals] (BP, Pulse, Temp, SpO2, BMI)
                                  ├────< [Examinations] (Local & General Clinical Findings)
                                  ├────< [Diagnoses] (ICD/Condition codes + Clinical Notes)
                                  ├────< [Prescriptions] ───< [Prescription Items] (Drugs & Dosages)
                                  ├────< [Lab Orders] ──────< [Lab Results]
                                  └────< [Imaging Orders] ──< [Imaging Results]
```

1. **Patient Registration:** Full profile management with automated deduplication checks per clinic.
2. **Visit Lifecycle:** `Scheduled` $\rightarrow$ `CheckedIn` $\rightarrow$ `InConsultation` $\rightarrow$ `Completed` / `Cancelled`.
3. **Medical Records:** Atomic creation and updates of comprehensive diagnostic details, medication history, and lab reports.

---

## 💳 SaaS Onboarding & Payment Gateway

```
[Clinic Admin] ──> [Selects Plan & Fills Form] ──> [SaaS Onboard Endpoint]
                                                           │
   [Redirect to Fawaterak Hosted Gateway] <────────────────┤ (Generates Invoice & PendingOnboarding)
               │
   [Patient/Admin Pays]
               │
   [Fawaterak Webhook Callback] ──> [ProcessFawaterakWebhookHandler]
                                               │
                                 (Validates HMAC-SHA256 Signature)
                                               │
                                 [Idempotency & Replay Check]
                                               │
                                 ├── Creates Tenant
                                 ├── Creates Admin User
                                 ├── Creates Active ClinicSubscription
                                 └── Marks Transaction Paid
```

---

## ⚡ Automated Background Jobs (Hangfire)

| Job Name | Frequency | Description |
| :--- | :---: | :--- |
| **ReminderJob** | Every Hour (`0 * * * *`) | Queries confirmed appointments 24h in advance, sends SMS and Email reminders, and tracks notification state. |
| **FeedbackJob** | Daily (`0 18 * * *`) | Dispatches patient review and satisfaction survey links for appointments completed that day. |
| **AppointmentCleanupJob** | Daily (`0 2 * * *`) | Identifies and purges abandoned/unconfirmed public bookings. |

---

## 📊 Database Schema & Plan Limit Enforcement

### EF Core Interceptor: `EnforcePlanLimitsAsync`
Before saving new entities (`Doctor`, `Patient`, `PatientAppointment`), the database context interceptor dynamically checks the clinic's active subscription limits:
- **Max Doctors Limit:** Prevents creating doctors beyond plan quota.
- **Max Patients Limit:** Enforces patient registry cap.
- **Max Bookings Limit:** Enforces monthly reservation quota.

---

## 🧪 Automated Testing Suite (150 Tests)

The system is validated by **150 automated tests** covering security, multi-tenancy, and domain workflows:

```bash
dotnet test
```

```text
Passed! - Failed: 0, Passed: 150, Skipped: 0, Total: 150, Duration: 1.2s
```

### Key Test Suites:
- `UserGlobalQueryFilterSecurityTests` (8 tests): Global query filter verification, cross-tenant isolation, fail-closed handling, and login flow.
- `ClinicSubscriptionSecurityTests` (5 tests): Non-empty GUID generation, PK uniqueness, multi-clinic subscriptions, and webhook concurrency.
- `DoctorDeletionSecurityTests` (8 tests): Cross-tenant doctor deletion denial, IDOR protection, and scoped user cleanup.
- `AppointmentSearchSecurityTests` (6 tests): Public appointment search tenant isolation and parameter spoofing prevention.
- `ReportExportSecurityTests` (5 tests): Multi-tenant PDF/CSV export scoping and PII protection.
- `PaymentWebhookSecurityTests` (3 tests): HMAC signature verification, replay attack prevention, and idempotency.
- `MultiTenantSecurityPenetrationTests` (15 tests): Active attack simulation against schedules, patients, visits, and protected endpoints.
- `SecurityMatrixRegressionTests` (10 tests): Full permutation role $\times$ resource $\times$ action matrix validation.

---

## 📑 API Catalog & Endpoint Reference

### 🔐 Authentication & Onboarding
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user with email & password, returns JWT and refresh token |
| `POST` | `/api/auth/refresh` | Public | Rotates single-use refresh token and issues new access token |
| `POST` | `/api/auth/register-clinic` | Public | Initiates SaaS clinic registration and creates payment invoice |
| `POST` | `/api/auth/create-admin` | SuperAdmin | Creates an administrator account for an existing tenant |

### 👨‍⚕️ Doctors & Schedules
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/doctors` | Authenticated | Retrieves doctors belonging to the authenticated clinic |
| `POST` | `/api/doctors` | Admin | Creates a doctor profile (enforces plan doctor limit) |
| `DELETE` | `/api/doctors/{id}` | Admin | Scoped soft-deletion of doctor profile and linked user account |
| `GET` | `/api/schedules/doctor/{id}` | Authenticated | Gets weekly schedule and shift intervals for a doctor |
| `POST` | `/api/schedules` | Admin | Configures or updates weekly working schedule |

### 🎟️ Appointments & Booking
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/patientappointments/public/search` | StaffOnly | Searches appointments strictly within caller's clinic |
| `POST` | `/api/patientappointments/public/book` | Public | Books an appointment slot anonymously |
| `GET` | `/api/patientappointments/public/lookup` | Public | Lookups appointment details by booking reference & phone |
| `POST` | `/api/patientappointments/public/cancel` | Public | Cancels appointment with booking reference & security PIN |
| `POST` | `/api/patientappointments/public/reschedule` | Public | Reschedules appointment with booking reference & security PIN |

### 🩺 Electronic Medical Records (EMR)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/patients` | Staff | Lists patient registry for active clinic |
| `POST` | `/api/patients` | Staff | Creates a new patient record (enforces plan patient limit) |
| `GET` | `/api/visits/patient/{patientId}` | Doctor/Admin | Retrieves full clinical visit history for a patient |
| `POST` | `/api/visits` | Doctor | Records a clinical visit with vitals, diagnoses, and prescriptions |

### 💳 Plans, Subscriptions & Webhooks
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/plans` | Public | Lists available SaaS subscription plans |
| `POST` | `/api/payments/webhook` | Public (HMAC Verified) | Fawaterak payment webhook processor |

### 📊 Reports & Exports
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/reports/appointments/pdf` | Admin | Generates tenant-scoped appointment PDF export |
| `GET` | `/api/reports/appointments/csv` | Admin | Generates tenant-scoped appointment CSV export |

---

## 💻 Frontend & Mobile Application

The frontend is located in `Front_End/clinicflow/`:
- **Framework:** React 18 with modern functional components and hooks.
- **UI Library:** Material UI (MUI) v5 with custom clinical theme tokens.
- **Animations:** Framer Motion for smooth micro-interactions.
- **Data Fetching:** Axios with automated JWT injection and refresh token interceptors.
- **Mobile Support:** **Capacitor (Android)** enabling native mobile app distribution from the same codebase.

---

## 🚀 Installation & Getting Started

### 1. Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) & `npm`
- [SQL Server](https://www.microsoft.com/sql-server/) (or LocalDB)

### 2. Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Osama-matter/Clinic-SAAS-System.git
   cd Clinic-SAAS-System
   ```
2. Copy `src/ClinicBookingSystem.API/appsettings.Example.json` to `src/ClinicBookingSystem.API/appsettings.json` and configure connection strings and secrets:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=ClinicBookingDb;Trusted_Connection=True;TrustServerCertificate=True;"
     },
     "Jwt": {
       "Secret": "YOUR_STRONG_32_CHAR_MINIMUM_SECRET_KEY_HERE",
       "Issuer": "ClinicBookingSystem.API",
       "Audience": "ClinicBookingSystem.Client"
     }
   }
   ```
3. Run migrations and start the backend API:
   ```bash
   dotnet restore
   dotnet run --project src/ClinicBookingSystem.API
   ```
4. Access Swagger documentation at `https://localhost:7xxx/swagger`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Front_End/clinicflow
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Build for production:
   ```bash
   npm run build
   ```

---

## 👨‍💻 Author & License

- **Developer:** [Osama Matter](https://github.com/Osama-matter)
- **Repository:** [Clinic-SAAS-System](https://github.com/Osama-matter/Clinic-SAAS-System)
- **License:** [MIT License](LICENSE)

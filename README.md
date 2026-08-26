# 🏥 Clinic Flow — Multi-Tenant Clinic SaaS Platform

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![EF Core 8](https://img.shields.io/badge/EF%20Core-8.0-512BD4?logo=nuget&logoColor=white)](https://docs.microsoft.com/ef/core/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-2022-CC292B?logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server/)
[![Tests](https://img.shields.io/badge/Tests-150%20Passed%20(100%25)-brightgreen)](./tests/ClinicBookingSystem.Tests/)
[![Architecture](https://img.shields.io/badge/Clean%20Architecture-CQRS%20%2F%20MediatR-blue)]()
[![Security](https://img.shields.io/badge/Security-Multi--Tenant%20Isolated-success)]()

A modern, enterprise-grade **Multi-Tenant Clinic Management & SaaS Platform** built with **ASP.NET Core 8**, **Clean Architecture**, **CQRS with MediatR**, **Entity Framework Core 8**, **React 18**, and **Capacitor (Android)**.

---

## 🌟 Key Highlights

- 🏢 **Multi-Tenancy SaaS Architecture**: Complete database-level and query-level tenant isolation with automated EF Core Global Query Filters.
- 💳 **Automated SaaS Onboarding & Payments**: Full integration with Fawaterak payment gateway, supporting webhooks, HMAC signature verification, idempotency, and automated tier activations.
- 🩺 **Comprehensive Electronic Medical Records (EMR)**: Complete workflow for Patients, Visits, Vitals, Triage, Diagnoses, Prescriptions, Lab Orders, and Imaging.
- 📅 **Smart Scheduling & Slot Engine**: Real-time slot computation, doctor working hours, schedule breaks, and public booking reference tracking.
- 🔒 **Enterprise-Grade Security**: Strict Role-Based Access Control (RBAC), JWT Authentication, single-use refresh token rotation, brute-force account lockout protection, and anti-IDOR validation.
- 📊 **Reporting & Exports**: Filtered multi-tenant PDF and CSV report exports for appointments, patient metrics, and clinic analytics.
- ⚡ **Background Processing**: Asynchronous background jobs powered by Hangfire for automated SMS/email reminders, review requests, and database cleanup.
- 🧪 **Thoroughly Tested**: 150 automated regression and security tests with 100% pass rate.

---

## 🏛 Architecture Overview

The backend is built adhering to **Clean Architecture** and **Domain-Driven Design (DDD)** principles:

```text
Clinic-SAAS-System/
├── src/
│   ├── ClinicBookingSystem.Domain/           # Core domain entities, enums, exceptions, and repository interfaces
│   ├── ClinicBookingSystem.Application/      # CQRS commands/queries, MediatR handlers, DTOs, and validators
│   ├── ClinicBookingSystem.Infrastructure/   # EF Core persistence, Identity/JWT, Hangfire, Fawaterak, Email/SMS
│   ├── ClinicBookingSystem.API/              # ASP.NET Core controllers, middleware, Swagger, and filters
│   └── ClinicBookingSystem.Shared/           # Shared models and cross-cutting constants
│
├── Front_End/
│   └── clinicflow/                           # Frontend: React 18 + Material UI + Framer Motion + Capacitor (Android)
│
├── tests/
│   └── ClinicBookingSystem.Tests/            # Tests: Comprehensive xUnit test suite (150 security & integration tests)
│
├── ClinicBookingSystem.sln                   # .NET Solution File
└── README.md                                 # Project Documentation
```

---

## 🛡️ Security & Tenant Isolation Model

The system enforces multi-layered defense-in-depth security:

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

1. **Authoritative Server-Side Tenant Resolution**: Authenticated tenant context is derived solely from verified cryptographically signed JWT claims via `ITenantProvider` / `ICurrentUserService`. Normal users cannot spoof tenant IDs via route, query params, body, or headers.
2. **EF Core Global Query Filters**: Every entity implementing `ITenantEntity` and `ISoftDelete` (including `User`, `PatientAppointment`, `Doctor`, `Patient`, `Schedule`, `Visit`, etc.) is automatically scoped to the active tenant in every SQL query.
3. **Fail-Closed Protection**: Operations without established tenant context fail closed immediately.
4. **Brute-Force & Account Lockout**: Automatic 15-minute lockout after 5 consecutive failed login attempts.
5. **Single-Use Refresh Token Rotation**: Refresh tokens are cryptographically hashed (SHA-256) and rotated upon every renewal.

---

## 🚀 Getting Started

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/) & `npm`
- [SQL Server](https://www.microsoft.com/sql-server/) (or LocalDB)

### 1. Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Osama-matter/Clinic-SAAS-System.git
   cd Clinic-SAAS-System
   ```

2. **Configure Application Settings:**
   Copy `src/ClinicBookingSystem.API/appsettings.Example.json` to `src/ClinicBookingSystem.API/appsettings.json` (or `appsettings.Development.json`) and configure your connection string and JWT keys:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=ClinicBookingDb;Trusted_Connection=True;TrustServerCertificate=True;"
     },
     "Jwt": {
       "Secret": "YOUR_SECURE_32_CHARACTERS_MINIMUM_KEY_HERE",
       "Issuer": "ClinicBookingSystem.API",
       "Audience": "ClinicBookingSystem.Client"
     }
   }
   ```

3. **Run the API:**
   ```bash
   dotnet restore
   dotnet run --project src/ClinicBookingSystem.API
   ```

4. **Access Endpoints:**
   - **Swagger UI:** `https://localhost:7xxx/swagger`
   - **Hangfire Dashboard:** `https://localhost:7xxx/hangfire`

---

### 2. Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd Front_End/clinicflow
   npm install
   ```

2. **Run development server:**
   ```bash
   npm start
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Capacitor (Android Mobile):**
   ```bash
   npx cap sync android
   npx cap open android
   ```

---

## 🧪 Testing & Verification

The solution includes a comprehensive test suite covering unit tests, integration tests, multi-tenant penetration tests, security matrix authorization tests, and performance audits.

To run all automated tests:

```bash
dotnet test
```

### Test Suite Highlights (150 Tests):
- `UserGlobalQueryFilterSecurityTests`: Verifies EF Core query filters for `User` and fail-closed handling.
- `ClinicSubscriptionSecurityTests`: Validates primary key generation and multi-clinic subscription creation.
- `DoctorDeletionSecurityTests`: Tests cross-tenant doctor deletion denial and IDOR prevention.
- `AppointmentSearchSecurityTests`: Verifies public appointment search tenant isolation.
- `PaymentWebhookSecurityTests`: Validates HMAC signature validation, replay defense, and idempotency.
- `MultiTenantSecurityPenetrationTests`: Simulates malicious cross-tenant attacks and parameter injection.
- `SecurityMatrixRegressionTests`: Automated role & permission execution matrix across all entities.

---

## 📑 API Modules

| Module | Description | Key Endpoints |
| :--- | :--- | :--- |
| **Auth** | Authentication, single-use token rotation, clinic onboarding | `/api/auth/login`, `/api/auth/refresh`, `/api/auth/register-clinic` |
| **Doctors** | Doctor profiles, specialties, and schedule bindings | `/api/doctors`, `/api/doctors/{id}`, `/api/doctors/{id}/photo` |
| **Schedules** | Weekly schedules, working shifts, and blocked slots | `/api/schedules`, `/api/schedules/doctor/{id}` |
| **Appointments** | Patient booking, slot lookups, rescheduling, and status tracking | `/api/patientappointments`, `/api/patientappointments/public/search` |
| **Medical EMR** | Patients, clinical visits, vitals, triage, diagnoses, prescriptions | `/api/patients`, `/api/visits`, `/api/drugs` |
| **Plans & SaaS** | Subscription tiers, feature limitations, Fawaterak webhooks | `/api/plans`, `/api/clinicsubscriptions`, `/api/payments/webhook` |
| **Reports** | PDF and CSV export for clinic analytics and appointments | `/api/reports/appointments/pdf`, `/api/reports/appointments/csv` |
| **Notifications** | Staff notifications and reminder dispatch tracking | `/api/notifications`, `/api/notifications/{id}/read` |

---

## 📄 License & Author

- **Author**: [Osama Matter](https://github.com/Osama-matter)
- **Repository**: [Clinic-SAAS-System](https://github.com/Osama-matter/Clinic-SAAS-System)
- **License**: MIT

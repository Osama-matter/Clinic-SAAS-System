# Clinic SaaS System - AI Developer Guide

This document serves as a comprehensive overview and guideline for AI tools (and human developers) interacting with the **Clinic-SAAS-System** codebase. It provides a deep analysis of the architecture, stack, patterns, and rewriting/refactoring rules to follow when generating or modifying code in this repository.

## 1. System Architecture Overview

The system is a full-stack SaaS application tailored for clinic management, built with a modern stack emphasizing Clean Architecture principles, CQRS, and multi-tenancy.

### 1.1 Backend (`/src`)
The backend is an ASP.NET Core Web API structured using Clean Architecture.

*   **API Layer (`ClinicBookingSystem.API`)**: The entry point. Handles HTTP requests, authentication/authorization, and rate-limiting. Contains Controllers, Middlewares (Exception Handling), and Hangfire dashboard configurations.
*   **Application Layer (`ClinicBookingSystem.Application`)**: Contains business logic using the **CQRS pattern** (Commands, Queries, Handlers) facilitated by MediatR. Features include: Auth, Doctors, Notifications, PatientAppointments, Patients, Payments, Plans, SaaSAdmin, Tenants, Visits, etc.
*   **Domain Layer (`ClinicBookingSystem.Domain`)**: The core entity models and business rules. Includes standard entities (`ClinicEntities`, `MedicalEntities`), Enums, Exceptions, and interfaces for multi-tenancy (`ITenantEntity`) and soft-deletes (`ISoftDelete`).
*   **Infrastructure Layer (`ClinicBookingSystem.Infrastructure`)**: Handles database access (Entity Framework Core), background jobs (Hangfire), external integrations, and persistence concerns.
*   **Shared/Integration**: Includes Faterak integration for payments.

**Key Technologies:**
*   **Framework**: .NET (ASP.NET Core Web API)
*   **ORM**: Entity Framework Core
*   **Logging**: Serilog (rolling files and console)
*   **Background Jobs**: Hangfire (configured with recurring jobs for reminders, feedback, and cleanups)
*   **Pattern**: CQRS (MediatR)
*   **Auth**: JWT-based Authentication

### 1.2 Frontend (`/Front_End/clinicflow`)
The frontend is a React-based application equipped with Capacitor for cross-platform mobile capabilities.

**Key Technologies:**
*   **Core**: React 18, React Router DOM
*   **State Management / Data Fetching**: React Query (`@tanstack/react-query`), Axios
*   **Styling**: Tailwind CSS, Emotion (`@emotion/react`, `@emotion/styled`), Material UI (MUI) Core/Icons, Framer Motion (for animations).
*   **Mobile / Native**: Capacitor (`@capacitor/core`, `@capacitor/android`)
*   **Utilities**: `jspdf`, `html2canvas` for document generation, `browser-image-compression`.

---

## 2. Deep Analysis & Architectural Patterns

When making changes or rewriting code, AI tools must adhere to the existing architectural patterns to maintain consistency.

### 2.1 Multi-Tenancy
*   **Pattern**: The system implements multi-tenancy. Entities belonging to a specific clinic/tenant must implement `ITenantEntity` (and typically have a `TenantId`).
*   **Rule**: When creating new domain entities related to clinic operations, ensure they inherit from `BaseEntity` and implement `ITenantEntity`. Any database query must automatically scope to the current tenant (typically handled via EF Core Global Query Filters).

### 2.2 Soft Deletes
*   **Pattern**: Entities implement the `ISoftDelete` interface.
*   **Rule**: Do not perform hard deletes (`DbSet.Remove()`) unless explicitly requested. Instead, set the `IsDeleted` flag (or similar property defined by the interface) and save changes.

### 2.3 CQRS & MediatR
*   **Pattern**: Operations in the Application layer are divided into Commands (mutations) and Queries (reads).
*   **Rule**: 
    1. Do not inject `ApplicationDbContext` directly into API Controllers.
    2. Controllers should only inject `IMediator` and map HTTP requests to MediatR Queries or Commands.
    3. Place new features inside `ClinicBookingSystem.Application/Features/[FeatureName]/`. Create separate files for `Command`, `CommandHandler`, `Query`, and `QueryHandler`.

### 2.4 Background Jobs (Hangfire)
*   **Pattern**: Long-running or scheduled tasks are offloaded to Hangfire.
*   **Rule**: If a feature requires sending an email, processing a payment asynchronously, or scheduled cleanup, define a Job in `ClinicBookingSystem.Infrastructure/Services/Background/` and enqueue/schedule it using `IBackgroundJobClient` or `IRecurringJobManager`. Do not block HTTP requests with long-running I/O.

### 2.5 Error Handling & Logging
*   **Pattern**: Global Exception Handling Middleware is used in the API. Serilog logs requests and errors.
*   **Rule**: Do not use `try-catch` blocks in controllers to return 500 status codes. Let the global middleware handle unexpected exceptions. Use Domain Exceptions (`ClinicBookingSystem.Domain/Exceptions`) for business rule violations and let the middleware map them to 400/404/403 responses.

---

## 3. Rules for AI Tools

When requested to rewrite, refactor, or add new features, AI tools must strictly follow these directives:

1. **Strict Layer Isolation**:
   *   **Domain** has NO dependencies.
   *   **Application** depends ONLY on Domain.
   *   **Infrastructure** depends on Application and Domain.
   *   **API** depends on Application and Infrastructure.
   *   *Violation of these dependency rules is strictly prohibited.*

2. **Frontend Styling & UI**:
   *   The frontend uses a hybrid of Tailwind CSS and Material UI. When creating new components, prioritize Tailwind CSS for layout and spacing, and MUI for complex interactive components (Selects, Dialogs, Data Grids).
   *   Maintain responsive design. Use Framer Motion for micro-animations to keep the UI modern and dynamic.

3. **API Contracts**:
   *   Keep API requests/responses clean. Use dedicated DTOs (Data Transfer Objects) in the Application layer. Do not expose Domain Entities directly via the API.

4. **Code Quality**:
   *   Provide XML comments for public methods in the API (Swagger documentation).
   *   Ensure proper use of asynchronous programming (`async`/`await`). Always pass `CancellationToken` through the call stack down to EF Core or HTTP clients.

## 4. How to Execute Rewrites

If the user asks an AI to "rewrite" a module:
1. **Analyze Existing CQRS Flow**: Identify the Command/Query, the Handler, and the Entity.
2. **Apply Domain Rules**: Move business logic out of the Handler and into the Domain Entity where possible (Rich Domain Model).
3. **Refactor Infrastructure**: Ensure EF Core queries use `AsNoTracking()` for Queries (Reads) and proper tracking for Commands (Writes).
4. **Update Frontend**: Ensure the React components use React Query (`useQuery`, `useMutation`) with the updated API endpoints. Maintain state cleanly without mutating props.

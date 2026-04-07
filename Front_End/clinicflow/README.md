# EAMS React Frontend

React frontend for the **Event & Appointment Management System** — wired directly to your .NET backend Swagger endpoints.

---

## Pages & Swagger Endpoint Mapping

| Page | Route | Swagger Endpoint(s) |
|---|---|---|
| Login | `/login` | `POST /api/Auth/login` |
| Register | `/register` | `POST /api/Auth/register` |
| Dashboard | `/dashboard` | `GET /api/Events`, `GET /api/Reports/popular-events` |
| Events | `/events` | `GET /api/Events`, `POST /api/Events`, `PUT /api/Events/{id}`, `DELETE /api/Events/{id}` |
| Event Detail | `/events/:id` | `GET /api/Events/{id}`, `GET /api/Events/{id}/report`, `POST /api/Appointments/book` |
| My Appointments | `/appointments` | `GET /api/Appointments/my`, `PUT /api/Appointments/{id}/status`, `DELETE /api/Appointments/{id}` |
| Reports *(Admin)* | `/reports` | `GET /api/Reports/attendance`, `GET /api/Reports/popular-events` |
| Settings | `/settings` | `POST /api/Auth/create-admin` *(Admin only)* |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure backend URL
cp .env.example .env
# Edit REACT_APP_API_URL in .env

# 3. Run
npm start
```

---

## Auth Flow

1. `POST /api/Auth/login` → returns `AuthTokenDto { accessToken, refreshToken, expiresIn, user }`
2. `accessToken` stored in `localStorage` as `eams_token`
3. Every Axios request auto-attaches `Authorization: Bearer <token>`
4. On `401` → auto-redirect to `/login`
5. `ProtectedRoute` wraps all private pages
6. `ProtectedRoute adminOnly` wraps `/reports` — redirects non-Admins to `/dashboard`

---

## Expected API Shapes

### AuthTokenDto (login response)
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "abc...",
  "expiresIn": 3600,
  "user": { "id": 1, "fullName": "Ahmed", "email": "ahmed@eams.com", "role": "Admin" }
}
```

### EventDto
```json
{
  "id": 1, "title": "Tech Summit", "description": "...",
  "location": "Cairo", "startDate": "2026-04-10T09:00",
  "endDate": "2026-04-10T18:00", "maxAttendees": 200,
  "bookedCount": 154, "status": "Published",
  "recurrenceFrequency": "None"
}
```

### AppointmentDto
```json
{
  "id": 1, "eventId": 1, "eventTitle": "Tech Summit",
  "eventDate": "2026-04-10T09:00", "eventLocation": "Cairo",
  "status": "Confirmed", "notes": "", "bookedAt": "2026-03-15"
}
```

### AttendanceReportSummaryDto
```json
{
  "totalEvents": 24, "totalAppointments": 312,
  "totalAttended": 241, "totalCancelled": 38,
  "overallAttendanceRate": 77.2,
  "byEvent": [
    { "eventId": 1, "eventTitle": "...", "totalBooked": 154,
      "totalAttended": 130, "totalCancelled": 8, "attendanceRate": 84.4 }
  ]
}
```

### PopularEventDto
```json
{ "eventId": 1, "eventTitle": "Tech Summit", "totalBookings": 154, "attendanceRate": 84.4 }
```

---

## .NET CORS Setup (Program.cs)

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("EAMSReact", policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

app.UseCors("EAMSReact");
```

---

## Role-Based Access

| Feature | User | Admin |
|---|---|---|
| Browse Events | ✅ | ✅ |
| Book Appointment | ✅ | ✅ |
| My Appointments | ✅ | ✅ |
| Create/Edit Events | ❌ | ✅ |
| Cancel Events | ❌ | ✅ |
| View Event Reports | ❌ | ✅ |
| Reports Page | ❌ | ✅ |
| Create Admin User | ❌ | ✅ |

Role is read from `user.role` in the JWT response.

---

## Mock Data

Every page has built-in mock data — the app works fully in demo mode with no backend. When the backend is connected, real API data replaces mock data automatically (try-catch pattern per page).

---

## Build

```bash
npm run build
# Output: /build — deploy to IIS, Azure Static Web Apps, Nginx, etc.
```

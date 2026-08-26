namespace ClinicBookingSystem.Application.Constants;

public static class AppPolicies
{
    public const string SuperAdminOnly = "SuperAdminOnly";
    public const string AdminOnly = "AdminOnly";
    public const string StaffOnly = "StaffOnly";
    public const string DoctorOnly = "DoctorOnly";
    public const string UserOrAdmin = "UserOrAdmin";
}

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Receptionist = "Receptionist";
    public const string Doctor = "Doctor";
    public const string User = "User";
}

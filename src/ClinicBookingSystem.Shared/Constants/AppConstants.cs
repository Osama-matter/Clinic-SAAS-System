namespace ClinicBookingSystem.Shared.Constants;

public static class Roles
{
    public const string Admin = "Admin";
    public const string User = "User";
    public const string Guest = "Guest";
}

public static class Policies
{
    public const string AdminOnly = "AdminOnly";
    public const string UserOrAdmin = "UserOrAdmin";
}

public static class AppConstants
{
    public const int AccessTokenExpiryMinutes = 15;
    public const int RefreshTokenExpiryDays = 7;
    public const int ReminderHours24 = 24;
    public const int ReminderHours1 = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
}

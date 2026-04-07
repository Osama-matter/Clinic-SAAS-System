namespace ClinicBookingSystem.Domain.Enums;

public enum UserRole
{
    Guest = 0,
    User = 1,
    Admin = 2,
    Receptionist = 3,
    Doctor = 4,
    Patient = 5
}

public enum SessionStatus
{
    Upcoming = 0,
    Active = 1,
    Completed = 2,
    Cancelled = 3
}

public enum DayOfWeek
{
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6
}

public enum AppointmentStatus
{
    Pending = 0,
    Confirmed = 1,
    Cancelled = 2,
    Completed = 3,
    Rescheduled = 4,
    NoShow = 5
}

public enum RecurrenceFrequency
{
    Daily = 0,
    Weekly = 1,
    Monthly = 2
}

public enum NotificationType
{
    Email = 0,
    Sms = 1,
    InApp = 2
}
public enum SubscriptionStatus
{
    Active,
    Inactive,
    Trial,
    Expired
}
public enum FeatureType
{
    Boolean, // Enable / Disable
    Limit    // أرقام زي MaxPatients
}
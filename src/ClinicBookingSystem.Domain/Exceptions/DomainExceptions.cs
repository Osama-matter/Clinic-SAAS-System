namespace ClinicBookingSystem.Domain.Exceptions;

public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}

public class SchedulingConflictException : DomainException
{
    public SchedulingConflictException(string message)
        : base(message) { }
}

public class NotFoundException : DomainException
{
    public NotFoundException(string entityName, object key)
        : base($"{entityName} with id '{key}' was not found.") { }
}

public class UnauthorizedActionException : DomainException
{
    public UnauthorizedActionException(string message = "You are not authorized to perform this action.")
        : base(message) { }
}

public class EventFullException : DomainException
{
    public EventFullException()
        : base("This session has reached its maximum number of attendees.") { }
}

public class InvalidStatusTransitionException : DomainException
{
    public InvalidStatusTransitionException(string from, string to)
        : base($"Cannot transition status from '{from}' to '{to}'.") { }
}

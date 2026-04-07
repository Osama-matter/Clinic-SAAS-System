using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Notifications;

// ── DTOs ──────────────────────────────────────────────
public record NotificationDto(
    Guid Id,
    string Message,
    DateTime CreatedAt,
    NotificationType Type,
    bool IsRead
);

// ── Commands ──────────────────────────────────────────
public record MarkNotificationAsReadCommand(Guid Id) : IRequest<Unit>;
public record DeleteNotificationCommand(Guid Id) : IRequest<Unit>;

// ── Queries ───────────────────────────────────────────
public record GetMyNotificationsQuery() : IRequest<IEnumerable<NotificationDto>>;

// ── Handlers ──────────────────────────────────────────

public class GetMyNotificationsQueryHandler : IRequestHandler<GetMyNotificationsQuery, IEnumerable<NotificationDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyNotificationsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<IEnumerable<NotificationDto>> Handle(GetMyNotificationsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId!.Value;
        var notifications = await _uow.Notifications.GetAllAsync(
            n => n.UserId == userId && !n.IsDeleted,
            cancellationToken);

        return notifications
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDto(n.Id, n.Message, n.CreatedAt, n.Type, n.IsRead));
    }
}

public class MarkNotificationAsReadCommandHandler : IRequestHandler<MarkNotificationAsReadCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public MarkNotificationAsReadCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(MarkNotificationAsReadCommand request, CancellationToken cancellationToken)
    {
        var notification = await _uow.Notifications.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Notification), request.Id);

        if (notification.UserId != _currentUser.UserId)
            throw new UnauthorizedActionException();

        notification.IsRead = true;
        notification.UpdatedAt = DateTime.UtcNow;

        await _uow.Notifications.UpdateAsync(notification, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

public class DeleteNotificationCommandHandler : IRequestHandler<DeleteNotificationCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public DeleteNotificationCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteNotificationCommand request, CancellationToken cancellationToken)
    {
        var notification = await _uow.Notifications.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Notification), request.Id);

        if (notification.UserId != _currentUser.UserId)
            throw new UnauthorizedActionException();

        notification.IsDeleted = true;
        notification.UpdatedAt = DateTime.UtcNow;

        await _uow.Notifications.UpdateAsync(notification, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

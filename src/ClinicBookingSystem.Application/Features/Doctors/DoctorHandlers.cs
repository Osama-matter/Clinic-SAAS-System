using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Doctors;

public class DoctorHandlers : 
    IRequestHandler<CreateDoctorCommand, DoctorDto>,
    IRequestHandler<UpdateDoctorCommand, DoctorDto>,
    IRequestHandler<DeleteDoctorCommand, Unit>,
    IRequestHandler<GetDoctorByIdQuery, DoctorDto>,
    IRequestHandler<GetDoctorsQuery, IEnumerable<DoctorDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ClinicBookingSystem.Application.Interfaces.ICurrentUserService _currentUser;

    public DoctorHandlers(
        IUnitOfWork uow,
        ClinicBookingSystem.Application.Interfaces.ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<DoctorDto> Handle(CreateDoctorCommand request, CancellationToken cancellationToken)
    {
        var effectiveTenantId = request.TenantId ?? _currentUser.TenantId;

        // First check if email already exists
        var existingUser = await _uow.Users.GetAllAsync(u => u.Email == request.Email, cancellationToken);
        if (existingUser.Any())
            throw new DomainException("Email is already in use.");

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = ClinicBookingSystem.Domain.Enums.UserRole.Doctor,
            TenantId = effectiveTenantId
        };

        var doctor = new Doctor
        {
            Name = request.Name,
            Specialty = request.Specialty,
            Bio = request.Bio,
            Photo = request.Photo,
            User = user,
            TenantId = effectiveTenantId
        };

        await _uow.Doctors.AddAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        // Update user's DoctorId
        user.DoctorId = doctor.Id;
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(doctor);
    }

    public async Task<DoctorDto> Handle(UpdateDoctorCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.Id);

        if (_currentUser.Role != "Admin" && _currentUser.Role != "2")
            throw new UnauthorizedActionException("Only admins can update doctors.");

        doctor.Name = request.Name;
        doctor.Specialty = request.Specialty;
        doctor.Bio = request.Bio;
        
        // Only update photo if a new one is provided in the request
        if (!string.IsNullOrEmpty(request.Photo))
        {
            doctor.Photo = request.Photo;
        }
        
        doctor.IsActive = request.IsActive;
        if (request.TenantId.HasValue)
        {
            doctor.TenantId = request.TenantId.Value;
        }

        await _uow.Doctors.UpdateAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(doctor);
    }

    public async Task<Unit> Handle(DeleteDoctorCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.Id);

        if (_currentUser.Role != "Admin" && _currentUser.Role != "2")
            throw new UnauthorizedActionException("Only admins can delete doctors.");

        // Delete associated user if exists
        var user = await _uow.Users.GetByIdAsync(doctor.UserId, cancellationToken);
        if (user != null)
        {
            await _uow.Users.DeleteAsync(user, cancellationToken);
        }

        await _uow.Doctors.DeleteAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<DoctorDto> Handle(GetDoctorByIdQuery request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.Id);

        return MapToDto(doctor);
    }

    public async Task<IEnumerable<DoctorDto>> Handle(GetDoctorsQuery request, CancellationToken cancellationToken)
    {
        // Use IUnitOfWork to get all doctors, ignoring filters for debug
        var doctors = await _uow.Doctors.GetAllAsync(d => true, cancellationToken);
        return doctors.Select(MapToDto);
    }

    private static DoctorDto MapToDto(Doctor doctor) => new(
        doctor.Id,
        doctor.Name,
        doctor.Specialty,
        doctor.Bio,
        doctor.Photo,
        doctor.IsActive,
        doctor.TenantId
    );
}

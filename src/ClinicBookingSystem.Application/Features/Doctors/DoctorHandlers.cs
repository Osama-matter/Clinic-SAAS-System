using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Domain.Entities;
using ClinicBookingSystem.Domain.Enums;
using ClinicBookingSystem.Domain.Exceptions;
using ClinicBookingSystem.Domain.Interfaces;
using MediatR;

namespace ClinicBookingSystem.Application.Features.Doctors;

public class DoctorHandlers : 
    IRequestHandler<CreateDoctorCommand, DoctorDto>,
    IRequestHandler<UpdateDoctorCommand, DoctorDto>,
    IRequestHandler<DeleteDoctorCommand, Unit>,
    IRequestHandler<UploadDoctorPhotoCommand, DoctorDto>,
    IRequestHandler<GetDoctorByIdQuery, DoctorDto>,
    IRequestHandler<GetDoctorsQuery, IEnumerable<DoctorDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;
    private readonly ISaaSEnforcementService _saas;
    private readonly IFileService _fileService;

    public DoctorHandlers(
        IUnitOfWork uow,
        ICurrentUserService currentUser,
        ISaaSEnforcementService saas,
        IFileService fileService)
    {
        _uow = uow;
        _currentUser = currentUser;
        _saas = saas;
        _fileService = fileService;
    }

    public async Task<DoctorDto> Handle(CreateDoctorCommand request, CancellationToken cancellationToken)
    {
        var isSuperAdmin = _currentUser.Role == "SuperAdmin" || _currentUser.Role == "6";
        var effectiveTenantId = isSuperAdmin 
            ? (request.TenantId ?? _currentUser.TenantId) 
            : _currentUser.TenantId;

        if (!effectiveTenantId.HasValue)
            throw new DomainException("Tenant ID is required.");

        // Verify limit
        var existingDoctorsCount = await _uow.Doctors.CountAsync(d => d.TenantId == effectiveTenantId, cancellationToken);
        await _saas.CheckLimitAsync(ClinicBookingSystem.Application.Interfaces.SaaSFeatureCodes.DoctorLimit, existingDoctorsCount, cancellationToken);

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

        // Update user's DoctorId and save
        user.DoctorId = doctor.Id;
        await _uow.Users.UpdateAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(doctor);
    }

    public async Task<DoctorDto> Handle(UpdateDoctorCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.Id);

        // Allow both SuperAdmin (6) and Clinic Admin (2)
        var isSuperAdmin = _currentUser.Role == "6" || _currentUser.Role == "SuperAdmin";
        var isClinicAdmin = (_currentUser.Role == "2" || _currentUser.Role == "Admin") && _currentUser.TenantId == doctor.TenantId;

        if (!isSuperAdmin && !isClinicAdmin)
            throw new UnauthorizedActionException("You don't have permission to update this doctor.");

        doctor.Name = request.Name;
        doctor.Specialty = request.Specialty;
        doctor.Bio = request.Bio;
        
        if (!string.IsNullOrEmpty(request.Photo))
            doctor.Photo = request.Photo;
        
        doctor.IsActive = request.IsActive;
        if (request.TenantId.HasValue && isSuperAdmin) // Only SuperAdmin can change the tenant of a doctor
        {
            doctor.TenantId = request.TenantId.Value;
        }

        await _uow.Doctors.UpdateAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(doctor);
    }

    public async Task<Unit> Handle(DeleteDoctorCommand request, CancellationToken cancellationToken)
    {
        var isSuperAdmin = _currentUser.Role == "6" 
            || _currentUser.Role == "SuperAdmin" 
            || _currentUser.Role == ((int)UserRole.SuperAdmin).ToString();

        if (!isSuperAdmin)
        {
            if (!_currentUser.TenantId.HasValue)
                throw new UnauthorizedActionException("Tenant context is required to delete a doctor.");

            var isClinicAdmin = _currentUser.Role == "2" 
                || _currentUser.Role == "Admin" 
                || _currentUser.Role == ((int)UserRole.Admin).ToString();

            if (!isClinicAdmin)
                throw new UnauthorizedActionException("You don't have permission to delete this doctor.");
        }

        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken);
        if (doctor == null || (!isSuperAdmin && doctor.TenantId != _currentUser.TenantId!.Value))
        {
            throw new NotFoundException(nameof(Doctor), request.Id);
        }

        // Delete associated user if exists, strictly enforcing tenant boundary
        var user = await _uow.Users.GetByIdAsync(doctor.UserId, cancellationToken);
        if (user != null)
        {
            if (!isSuperAdmin && user.TenantId != _currentUser.TenantId!.Value)
            {
                throw new UnauthorizedActionException("Cannot delete user belonging to another tenant.");
            }
            await _uow.Users.DeleteAsync(user, cancellationToken);
        }

        await _uow.Doctors.DeleteAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }

    public async Task<DoctorDto> Handle(UploadDoctorPhotoCommand request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.DoctorId, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.DoctorId);

        var isSuperAdmin = _currentUser.Role == "6" || _currentUser.Role == "SuperAdmin";
        var isClinicAdmin = (_currentUser.Role == "2" || _currentUser.Role == "Admin") && _currentUser.TenantId == doctor.TenantId;

        if (!isSuperAdmin && !isClinicAdmin)
            throw new UnauthorizedActionException("You don't have permission to update this doctor.");

        if (!string.IsNullOrWhiteSpace(doctor.Photo))
        {
            _fileService.DeleteFile(doctor.Photo);
        }

        var photoUrl = await _fileService.SaveFileAsync(request.FileStream, request.FileName, "doctors", cancellationToken);
        doctor.Photo = photoUrl;

        await _uow.Doctors.UpdateAsync(doctor, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return MapToDto(doctor);
    }

    public async Task<DoctorDto> Handle(GetDoctorByIdQuery request, CancellationToken cancellationToken)
    {
        var doctor = await _uow.Doctors.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Doctor), request.Id);

        return MapToDto(doctor);
    }

    public async Task<IEnumerable<DoctorDto>> Handle(GetDoctorsQuery request, CancellationToken cancellationToken)
    {
        var isSuperAdmin = _currentUser.Role == "6" || _currentUser.Role == "SuperAdmin";

        var tenantId = _currentUser.TenantId;
        if (!isSuperAdmin && !tenantId.HasValue)
            throw new DomainException("Tenant ID is required.");

        var doctors = await _uow.Doctors.GetAllAsync(d =>
            (!tenantId.HasValue ? isSuperAdmin : d.TenantId == tenantId.Value)
            && (string.IsNullOrWhiteSpace(request.Specialty) || d.Specialty == request.Specialty)
            && (!request.IsActive.HasValue || d.IsActive == request.IsActive.Value),
            cancellationToken);

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

using System.Threading;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Application.Interfaces;

public interface ISaaSEnforcementService
{
    /// <summary>
    /// Checks if the current tenant exceeds a numerical feature limit. Throws DomainException if they do.
    /// </summary>
    Task CheckLimitAsync(string featureCode, int currentCount, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if a feature is enabled for the current tenant. Throws DomainException if not enabled.
    /// </summary>
    Task CheckFeatureEnabledAsync(string featureCode, CancellationToken cancellationToken = default);
}

using System.ComponentModel.DataAnnotations;

namespace ClinicBookingSystem.Infrastructure.Settings;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required(ErrorMessage = "Jwt:Secret is required.")]
    [MinLength(32, ErrorMessage = "Jwt:Secret must be at least 32 characters (256 bits) long.")]
    public string Secret { get; set; } = string.Empty;

    [Required(ErrorMessage = "Jwt:Issuer is required.")]
    public string Issuer { get; set; } = string.Empty;

    [Required(ErrorMessage = "Jwt:Audience is required.")]
    public string Audience { get; set; } = string.Empty;
}

using ClinicBookingSystem.API.Filters;
using ClinicBookingSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicBookingSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[RequireActiveSubscription]
public class DrugsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DrugsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<object>>> Search([FromQuery] string query = "", [FromQuery] int take = 15)
    {
        take = Math.Clamp(take, 1, 50);
        var normalizedQuery = query.Trim();

        if (!await _context.Drugs.AnyAsync())
        {
            await DbInitializer.SeedDrugsAsync(_context);
        }

        var drugsQuery = _context.Drugs.AsNoTracking().Where(d => !d.IsDeleted);

        if (!string.IsNullOrWhiteSpace(normalizedQuery))
        {
            drugsQuery = drugsQuery.Where(d => d.Name.Contains(normalizedQuery) || d.Form.Contains(normalizedQuery));
        }

        var drugs = await drugsQuery
            .OrderBy(d => d.Name)
            .Take(take)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Form
            })
            .ToListAsync();

        return Ok(drugs);
    }
}

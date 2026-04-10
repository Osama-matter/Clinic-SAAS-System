using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;

namespace ClinicBookingSystem.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, "Resource Not Found"),
            SchedulingConflictException => (HttpStatusCode.Conflict, "Scheduling Conflict"),
            UnauthorizedActionException => (HttpStatusCode.Unauthorized, "Unauthorized"),
            EventFullException => (HttpStatusCode.BadRequest, "Session Full"),
            InvalidStatusTransitionException => (HttpStatusCode.BadRequest, "Invalid Status Transition"),
            DomainException => (HttpStatusCode.BadRequest, "Business Rule Violation"),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        var problem = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;

        return context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

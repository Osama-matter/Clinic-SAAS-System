using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace ClinicBookingSystem.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;

        if (exception is FluentValidation.ValidationException valEx)
        {
            _logger.LogInformation("Validation failed on {Path} [TraceId: {TraceId}]", context.Request.Path, traceId);

            var validationProblem = new ValidationProblemDetails(
                valEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()))
            {
                Status = (int)HttpStatusCode.BadRequest,
                Title = "Validation Failed",
                Detail = "One or more validation errors occurred.",
                Instance = context.Request.Path
            };
            validationProblem.Extensions["traceId"] = traceId;

            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            return context.Response.WriteAsync(JsonSerializer.Serialize(validationProblem));
        }

        var (statusCode, title) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, "Resource Not Found"),
            SchedulingConflictException => (HttpStatusCode.Conflict, "Scheduling Conflict"),
            UnauthorizedActionException => (HttpStatusCode.Forbidden, "Forbidden Action"),
            EventFullException => (HttpStatusCode.BadRequest, "Session Full"),
            InvalidStatusTransitionException => (HttpStatusCode.BadRequest, "Invalid Status Transition"),
            DomainException => (HttpStatusCode.BadRequest, "Business Rule Violation"),
            _ => (HttpStatusCode.InternalServerError, "Internal Server Error")
        };

        if (exception is UnauthorizedActionException)
        {
            _logger.LogWarning("Security Event: Unauthorized/Forbidden access on {Method} {Path} [TraceId: {TraceId}] - {Reason}",
                context.Request.Method, context.Request.Path, traceId, exception.Message);
        }
        else if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled 500 error on {Method} {Path} [TraceId: {TraceId}]: {Message}",
                context.Request.Method, context.Request.Path, traceId, exception.Message);
        }
        else
        {
            _logger.LogInformation("Business error {StatusCode} on {Method} {Path} [TraceId: {TraceId}]: {Message}",
                (int)statusCode, context.Request.Method, context.Request.Path, traceId, exception.Message);
        }

        var isKnownBusinessException = exception is DomainException || 
                                       exception is NotFoundException || 
                                       exception is SchedulingConflictException || 
                                       exception is UnauthorizedActionException || 
                                       exception is EventFullException || 
                                       exception is InvalidStatusTransitionException;

        var detail = (isKnownBusinessException || _environment.IsDevelopment())
            ? exception.Message
            : "An unexpected error occurred while processing your request. Please contact support.";

        var problem = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["traceId"] = traceId;

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;

        return context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

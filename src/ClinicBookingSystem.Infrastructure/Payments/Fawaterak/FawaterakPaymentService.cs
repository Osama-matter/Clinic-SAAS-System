using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Infrastructure.Payments.Fawaterak;

public class FawaterakPaymentService : IFawaterakPaymentService
{
    private const decimal MinimumInvoiceAmount = 5m;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<FawaterakPaymentService> _logger;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly string _providerKey;

    public FawaterakPaymentService(
        IHttpClientFactory httpClientFactory,
        ILogger<FawaterakPaymentService> logger,
        IOptions<FawaterakOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        var cfg = options.Value;
        _apiKey = cfg.ApiKey ?? string.Empty;
        _baseUrl = cfg.BaseUrl ?? string.Empty;
        _providerKey = cfg.ProviderKey ?? string.Empty;
    }

    public async Task<EInvoiceResponseModel.EInvoiceResponseDataModel?> CreateEInvoiceAsync(EInvoiceRequestModel eInvoice)
    {
        if (eInvoice.CartTotal < MinimumInvoiceAmount)
        {
            var message = $"Fawaterak invoice creation skipped because cart total {eInvoice.CartTotal:0.##} EGP is below the minimum allowed amount of {MinimumInvoiceAmount:0.##} EGP.";
            _logger.LogWarning(message);
            throw new DomainException(message);
        }

        using var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/createInvoiceLink");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(JsonConvert.SerializeObject(eInvoice), Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        if (response.IsSuccessStatusCode)
        {
            var result = JsonConvert.DeserializeObject<EInvoiceResponseModel>(responseContent);
            return result?.Data;
        }

        _logger.LogError("Fawaterak createInvoiceLink failed with {StatusCode}: {Body}", response.StatusCode, responseContent);
        throw new InvalidOperationException($"Fawaterak createInvoiceLink failed with {(int)response.StatusCode}: {responseContent}");
    }

    public bool VerifyWebhook(WebHookModel webHook)
    {
        if (webHook == null || string.IsNullOrWhiteSpace(webHook.HashKey) || string.IsNullOrWhiteSpace(_apiKey))
            return false;

        var generatedHashKey = GenerateHashKeyForWebhookVerification(webHook.InvoiceId, webHook.InvoiceKey, webHook.PaymentMethod);
        
        var generatedBytes = Encoding.UTF8.GetBytes(generatedHashKey);
        var providedBytes = Encoding.UTF8.GetBytes(webHook.HashKey.Trim().ToLowerInvariant());

        if (generatedBytes.Length != providedBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(generatedBytes, providedBytes);
    }

    public bool VerifyCancelTransaction(CancelTransactionModel cancelTransaction)
    {
        if (cancelTransaction == null || string.IsNullOrWhiteSpace(cancelTransaction.HashKey) || string.IsNullOrWhiteSpace(_apiKey))
            return false;

        var generatedHashKey = GenerateHashKeyForCancelTransaction(cancelTransaction.ReferenceId, cancelTransaction.PaymentMethod);
        
        var generatedBytes = Encoding.UTF8.GetBytes(generatedHashKey);
        var providedBytes = Encoding.UTF8.GetBytes(cancelTransaction.HashKey.Trim().ToLowerInvariant());

        if (generatedBytes.Length != providedBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(generatedBytes, providedBytes);
    }

    public bool VerifyApiKeyTransaction(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(_apiKey))
            return false;

        var providedBytes = Encoding.UTF8.GetBytes(apiKey);
        var expectedBytes = Encoding.UTF8.GetBytes(_apiKey);

        if (providedBytes.Length != expectedBytes.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }

    private string GenerateHashKeyForWebhookVerification(long invoiceId, string invoiceKey, string paymentMethod)
    {
        var queryParam = $"InvoiceId={invoiceId}&InvoiceKey={invoiceKey}&PaymentMethod={paymentMethod}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_apiKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryParam));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    private string GenerateHashKeyForCancelTransaction(string referenceId, string paymentMethod)
    {
        var queryParam = $"referenceId={referenceId}&PaymentMethod={paymentMethod}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_apiKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryParam));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }
}

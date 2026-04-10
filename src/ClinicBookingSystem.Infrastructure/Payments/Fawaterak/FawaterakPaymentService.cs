using ClinicBookingSystem.Application.Interfaces;
using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using ClinicBookingSystem.Domain.Exceptions;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
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
        _apiKey = cfg.ApiKey;
        _baseUrl = cfg.BaseUrl;
        _providerKey = cfg.ProviderKey;
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

        // Log the error for debugging
        System.Console.WriteLine($"[Fawaterak ERROR] Status: {response.StatusCode}, Body: {responseContent}");
        throw new InvalidOperationException($"Fawaterak createInvoiceLink failed with {(int)response.StatusCode}: {responseContent}");
    }

    public bool VerifyWebhook(WebHookModel webHook)
    {
        var generatedHashKey = GenerateHashKeyForWebhookVerification(webHook.InvoiceId, webHook.InvoiceKey, webHook.PaymentMethod);
        return generatedHashKey == webHook.HashKey;
    }

    public bool VerifyCancelTransaction(CancelTransactionModel cancelTransaction)
    {
        var generatedHashKey = GenerateHashKeyForCancelTransaction(cancelTransaction.ReferenceId, cancelTransaction.PaymentMethod);
        return generatedHashKey == cancelTransaction.HashKey;
    }

    public bool VerifyApiKeyTransaction(string apiKey)
    {
        return apiKey == _apiKey;
    }

    private string GenerateHashKeyForWebhookVerification(long invoiceId, string invoiceKey, string paymentMethod)
    {
        var queryParam = $"InvoiceId={invoiceId}&InvoiceKey={invoiceKey}&PaymentMethod={paymentMethod}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_apiKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryParam));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }

    private string GenerateHashKeyForCancelTransaction(string referenceId, string paymentMethod)
    {
        var queryParam = $"referenceId={referenceId}&PaymentMethod={paymentMethod}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_apiKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(queryParam));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }
}

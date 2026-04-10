using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Newtonsoft.Json;

namespace ClinicBookingSystem.Application.Models.Payments.Fawaterak;

public class EInvoiceRequestModel
{
    [JsonProperty("payment_method_id")]
    public int? PaymentMethodId { get; set; }

    [JsonProperty("customer")]
    [Required]
    public required CustomerModel Customer { get; set; }

    [JsonProperty("cartItems")]
    [MinLength(1)]
    [Required]
    public List<CartItemModel> CartItems { get; set; }

    [JsonProperty("cartTotal")]
    public decimal CartTotal => CartItems.Sum(item => item.Price * item.Quantity);

    [JsonProperty("currency")]
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "EGP";

    [JsonProperty("payLoad")]
    public InvoicePayload? PayLoad { get; set; }

    [JsonProperty("redirectionUrls")]
    public RedirectionUrlsModel? RedirectionUrls { get; set; }

    public class InvoicePayload
    {
        public string OrderId { get; set; }
    }

    public class CustomerModel
    {
        [JsonProperty("customer_unique_id")]
        public string? CustomerId { get; set; }

        [JsonProperty("first_name")]
        [Required]
        public required string FirstName { get; set; }

        [JsonProperty("last_name")]
        [Required]
        public required string LastName { get; set; }

        [JsonProperty("email")]
        [EmailAddress]
        public string? Email { get; set; }

        [JsonProperty("phone")]
        [Phone]
        public string? Phone { get; set; }
    }

    public class CartItemModel
    {
        [JsonProperty("name")]
        [Required]
        public string Name { get; set; }

        [JsonProperty("price")]
        [Range(0.01, double.MaxValue)]
        public decimal Price { get; set; }

        [JsonProperty("quantity")]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class RedirectionUrlsModel
    {
        [JsonProperty("successUrl")]
        [Url]
        public string? OnSuccess { get; set; }

        [JsonProperty("failUrl")]
        [Url]
        public string? OnFailure { get; set; }

        [JsonProperty("pendingUrl")]
        [Url]
        public string? OnPending { get; set; }
    }
}

public class EInvoiceResponseModel
{
    [JsonProperty("status")]
    public string Status { get; set; }

    [JsonProperty("data")]
    public EInvoiceResponseDataModel Data { get; set; }

    public class EInvoiceResponseDataModel
    {
        [JsonProperty("url")]
        public string Url { get; set; }

        [JsonProperty("invoiceId")]
        public string InvoiceId { get; set; }

        [JsonProperty("invoiceKey")]
        public string InvoiceKey { get; set; }
    }
}

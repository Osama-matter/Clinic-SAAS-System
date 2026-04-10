using ClinicBookingSystem.Application.Models.Payments.Fawaterak;
using System.Threading.Tasks;

namespace ClinicBookingSystem.Application.Interfaces;

public interface IFawaterakPaymentService
{
    Task<EInvoiceResponseModel.EInvoiceResponseDataModel?> CreateEInvoiceAsync(EInvoiceRequestModel eInvoice);
    bool VerifyWebhook(WebHookModel webHook);
    bool VerifyCancelTransaction(CancelTransactionModel cancelTransaction);
    bool VerifyApiKeyTransaction(string apiKey);
}

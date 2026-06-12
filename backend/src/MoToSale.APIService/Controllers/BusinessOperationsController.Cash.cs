using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common.Auth;
using MoToSale.DTO.Operations;

namespace MoToSale.APIService.Controllers;

public partial class BusinessOperationsController : ControllerBase
{
    [HttpGet("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> Cash()
    {
        var result = await _service.GetCashTransactionsAsync();
        return Ok(result);
    }

    [HttpPost("cash")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> CreateCash(CashTransactionRequest request)
    {
        return await CreateAsync(
            () => _service.CreateCashTransactionAsync(request, UserId),
            id =>
            {
                string auditValue = $"Type={request.TransactionType};Amount={request.Amount};Category={request.Category}";
                return AddAuditAsync("CashTransaction", id.ToString(), "Create", auditValue);
            });
    }

    [HttpPost("cash/{id:int}/reverse")]
    [Authorize(Roles = RoleConstant.Admin)]
    public async Task<IActionResult> ReverseCash(int id)
    {
        var result = await CreateAsync(() => _service.ReverseCashTransactionAsync(id, UserId));

        if (result is OkObjectResult)
        {
            await AddAuditAsync("CashTransaction", id.ToString(), "Reverse");
        }

        return result;
    }
}

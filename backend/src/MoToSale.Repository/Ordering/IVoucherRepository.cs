using MoToSale.DTO.Common;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public interface IVoucherRepository : IRepository<Voucher>
{
    Task<PagingResponse<Voucher>> SearchAsync(PagingRequest request);
    Task<Voucher?> GetByCodeAsync(string code);
    Task<bool> CodeExistsAsync(string code, int? exceptId = null);
}

using MoToSale.DTO.Common;
using MoToSale.DTO.Ordering;
using MoToSale.Entities.Ordering;
using MoToSale.Repository.EFCore;

namespace MoToSale.Repository.Ordering;

public interface IVoucherRepository : IRepository<Voucher>
{
    Task<PagingResponse<Voucher>> SearchAsync(PagingRequest request);
    Task<Voucher?> GetByCodeAsync(string code);
    Task<bool> CodeExistsAsync(string code, int? exceptId = null);

    // Lấy phạm vi (scope) của nhiều voucher cùng lúc, đã kèm tên đối tượng để hiển thị.
    // Trả về Dictionary: key = VoucherId, value = danh sách scope của voucher đó.
    Task<Dictionary<int, List<VoucherScopeDto>>> GetScopeMapAsync(IReadOnlyCollection<int> voucherIds);

    // Ghi đè phạm vi của 1 voucher: xoá scope cũ rồi thêm scope mới theo loại + danh sách Id.
    // scopeType = "All"/null/rỗng nghĩa là áp toàn đơn (không lưu dòng scope nào).
    Task ReplaceScopesAsync(int voucherId, string? scopeType, IReadOnlyCollection<int>? refIds);
}

using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;
public partial class ContentService
{
    public async Task<PagingResponse<ContactDto>> SearchContactsAsync(PagingRequest request, string? status, string? type)
    {
        var allContacts = await _contacts.GetAllAsync();
        IEnumerable<ContactRequest> query = allContacts;

        if (!string.IsNullOrWhiteSpace(status))
        {
            string normalizedStatus = NormalizeContactStatus(status);
            query = query.Where(contact => contact.ContactStatus == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            // FE cho nhập tự do -> khớp một phần, không phân biệt hoa thường.
            string keyword = type.Trim();
            query = query.Where(contact => contact.Type != null
                && contact.Type.Contains(keyword, StringComparison.OrdinalIgnoreCase));
        }

        var orderedContacts = query.OrderByDescending(contact => contact.Id).ToList();
        var items = orderedContacts
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(MapContactDto)
            .ToList();

        return new PagingResponse<ContactDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalItems = orderedContacts.Count,
        };
    }

    public async Task<ContactDto?> GetContactAsync(int id)
    {
        var contact = await _contacts.GetByIdAsync(id);

        if (contact == null)
        {
            return null;
        }

        return MapContactDto(contact);
    }

    public async Task<int> CreateContactAsync(CreateContactRequest request)
    {
        ValidateContactRequest(request);

        var contact = new ContactRequest
        {
            FullName = request.FullName.Trim(),
            Phone = request.Phone.Trim(),
            Email = request.Email,
            Subject = request.Subject,
            Body = request.Body ?? string.Empty,
            Type = string.IsNullOrWhiteSpace(request.Type) ? "Consultation" : request.Type,
            ProductId = request.ProductId,
            ContactStatus = NewContactStatus,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        _contacts.Add(contact);
        await _contacts.SaveChangesAsync();

        return contact.Id;
    }

    public async Task MarkContactProcessedAsync(int id)
    {
        var contact = await _contacts.GetByIdAsync(id);
        if (contact == null)
        {
            throw new ContentException("Không tìm thấy liên hệ.");
        }

        contact.ContactStatus = ProcessedContactStatus;
        contact.HandledAt = DateTime.UtcNow;
        contact.UpdatedDate = DateTime.UtcNow;

        _contacts.Update(contact);
        await _contacts.SaveChangesAsync();
    }
    private static void ValidateContactRequest(CreateContactRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ContentException("Họ tên là bắt buộc.");
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            throw new ContentException("Số điện thoại là bắt buộc.");
        }
    }

    private static string NormalizeContactStatus(string status)
    {
        if (string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            return NewContactStatus;
        }

        if (string.Equals(status, ProcessedContactStatus, StringComparison.OrdinalIgnoreCase))
        {
            return ProcessedContactStatus;
        }

        return NewContactStatus;
    }

    private static ContactDto MapContactDto(ContactRequest contact)
    {
        return new ContactDto(
            contact.Id,
            contact.FullName,
            contact.Phone,
            contact.Email,
            contact.Subject,
            contact.Body,
            contact.Type,
            contact.ProductId,
            contact.ContactStatus,
            contact.CreatedDate,
            contact.HandledAt);
    }
}

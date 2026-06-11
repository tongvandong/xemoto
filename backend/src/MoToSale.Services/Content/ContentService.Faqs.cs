using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Entities.Content;
using MoToSale.Repository.EFCore;

namespace MoToSale.Services.Content;
public partial class ContentService
{
    public async Task<List<FaqDto>> GetFaqsAsync()
    {
        var allFaqs = await _faqs.GetAllAsync();

        return allFaqs
            .OrderBy(faq => faq.SortOrder)
            .ThenBy(faq => faq.Id)
            .Select(MapFaqDto)
            .ToList();
    }

    public async Task<int> CreateFaqAsync(SaveFaqRequest request)
    {
        ValidateFaqRequest(request);

        var faq = new Faq
        {
            Question = request.Question.Trim(),
            Answer = request.Answer ?? string.Empty,
            Category = request.Category,
            SortOrder = request.SortOrder,
            CreatedDate = DateTime.UtcNow,
            Status = (int)EntityStatus.Active,
        };

        _faqs.Add(faq);
        await _faqs.SaveChangesAsync();

        return faq.Id;
    }

    public async Task UpdateFaqAsync(int id, SaveFaqRequest request)
    {
        ValidateFaqRequest(request);

        var faq = await _faqs.GetByIdAsync(id);
        if (faq == null)
        {
            throw new ContentException("Không tìm thấy FAQ.");
        }

        faq.Question = request.Question.Trim();
        faq.Answer = request.Answer ?? string.Empty;
        faq.Category = request.Category;
        faq.SortOrder = request.SortOrder;
        faq.Status = request.Status;
        faq.UpdatedDate = DateTime.UtcNow;

        _faqs.Update(faq);
        await _faqs.SaveChangesAsync();
    }

    public async Task DeleteFaqAsync(int id)
    {
        var faq = await _faqs.GetByIdAsync(id);
        if (faq == null)
        {
            throw new ContentException("Không tìm thấy FAQ.");
        }

        _faqs.Delete(faq);
        await _faqs.SaveChangesAsync();
    }
    private static void ValidateFaqRequest(SaveFaqRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Question))
        {
            throw new ContentException("Câu hỏi là bắt buộc.");
        }
    }
    private static FaqDto MapFaqDto(Faq faq)
    {
        return new FaqDto(faq.Id, faq.Question, faq.Answer, faq.Category, faq.SortOrder, faq.Status);
    }
}

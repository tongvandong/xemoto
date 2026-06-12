using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Content;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

public partial class ContentController
{
    [HttpGet("faq")]
    public async Task<IActionResult> Faqs([FromQuery] bool all = false)
    {
        List<FaqDto> faqs = await _content.GetFaqsAsync(all && User.IsInRole(RoleConstant.Admin) || all && User.IsInRole(RoleConstant.Staff));
        return Ok(new ItemsResponse<FaqDto> { Items = faqs });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("faq")]
    public async Task<IActionResult> CreateFaq(SaveFaqRequest request)
    {
        try
        {
            int id = await _content.CreateFaqAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("faq/{id:int}")]
    public async Task<IActionResult> UpdateFaq(int id, SaveFaqRequest request)
    {
        try
        {
            await _content.UpdateFaqAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("faq/{id:int}")]
    public async Task<IActionResult> DeleteFaq(int id)
    {
        try
        {
            await _content.DeleteFaqAsync(id);
            return Ok(new MessageResponse { Message = "Da xoa." });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}

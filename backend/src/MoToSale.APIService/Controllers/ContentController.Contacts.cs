using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

public partial class ContentController
{
    [HttpPost("contacts")]
    public async Task<IActionResult> CreateContact(CreateContactRequest request)
    {
        try
        {
            int id = await _content.CreateContactAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts([FromQuery] PagingRequest request, [FromQuery] string? status)
    {
        var result = await _content.SearchContactsAsync(request, status);
        return Ok(result);
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPatch("contacts/{id:int}/process")]
    public async Task<IActionResult> ProcessContact(int id)
    {
        try
        {
            await _content.MarkContactProcessedAsync(id);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}

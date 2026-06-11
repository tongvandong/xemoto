using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Content;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

public partial class ContentController
{
    [HttpGet("home-banners")]
    public async Task<IActionResult> Banners([FromQuery] bool all = false)
    {
        var banners = await _content.GetBannersAsync(all);
        return Ok(new { items = banners });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("home-banners")]
    public async Task<IActionResult> CreateBanner(SaveBannerRequest request)
    {
        try
        {
            int id = await _content.CreateBannerAsync(request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("home-banners/{id:int}")]
    public async Task<IActionResult> UpdateBanner(int id, SaveBannerRequest request)
    {
        try
        {
            await _content.UpdateBannerAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("home-banners/{id:int}")]
    public async Task<IActionResult> DeleteBanner(int id)
    {
        try
        {
            await _content.DeleteBannerAsync(id);
            return Ok(new MessageResponse { Message = "Da xoa." });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("home-banners/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadBannerImage([FromForm] UploadFileRequest request)
    {
        try
        {
            string url = await _storage.SaveAsync(request.File, "banners", HttpContext.RequestAborted);
            return Ok(new UrlResponse { Url = url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }
}

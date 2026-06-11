using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Models;
using MoToSale.APIService.Services;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/content")]
public class ContentController : ControllerBase
{
    private const string StaffRoles = $"{RoleConstant.Admin},{RoleConstant.Staff}";

    private readonly IContentService _content;
    private readonly IImageStorage _storage;

    public ContentController(IContentService content, IImageStorage storage)
    {
        _content = content;
        _storage = storage;
    }

    private int? CurrentUserId
    {
        get
        {
            string? userIdText = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdText, out int userId))
            {
                return userId;
            }

            return null;
        }
    }

    [HttpGet("posts/public")]
    public async Task<IActionResult> PublicPosts()
    {
        var posts = await _content.GetPublishedPostsAsync();
        return Ok(new { items = posts });
    }

    [Authorize(Roles = StaffRoles)]
    [HttpGet("posts")]
    public async Task<IActionResult> Posts([FromQuery] PagingRequest request, [FromQuery] string? status)
    {
        var result = await _content.SearchPostsAsync(request, status);
        return Ok(result);
    }

    [Authorize(Roles = StaffRoles)]
    [HttpGet("posts/{id:int}")]
    public async Task<IActionResult> Post(int id)
    {
        var post = await _content.GetPostAsync(id);

        if (post == null)
        {
            return NotFound();
        }

        return Ok(post);
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost(SavePostRequest request)
    {
        try
        {
            int id = await _content.CreatePostAsync(request, CurrentUserId);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("posts/{id:int}")]
    public async Task<IActionResult> UpdatePost(int id, SavePostRequest request)
    {
        try
        {
            await _content.UpdatePostAsync(id, request);
            return Ok(new IdResponse { Id = id });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("posts/{id:int}")]
    public async Task<IActionResult> DeletePost(int id)
    {
        try
        {
            await _content.DeletePostAsync(id);
            return Ok(new MessageResponse { Message = "Da xoa." });
        }
        catch (ContentException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("posts/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadPostImage([FromForm] UploadFileRequest request)
    {
        try
        {
            string url = await _storage.SaveAsync(request.File, "posts", HttpContext.RequestAborted);
            return Ok(new UrlResponse { Url = url });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new MessageResponse { Message = ex.Message });
        }
    }

    [HttpGet("faq")]
    public async Task<IActionResult> Faqs()
    {
        var faqs = await _content.GetFaqsAsync();
        return Ok(new { items = faqs });
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

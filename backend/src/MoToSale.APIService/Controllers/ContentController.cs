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

    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    // ===== Bài viết =====
    // Storefront: danh sách bài viết đã xuất bản (công khai)
    [HttpGet("posts/public")]
    public async Task<IActionResult> PublicPosts() => Ok(new { items = await _content.GetPublishedPostsAsync() });

    [Authorize(Roles = StaffRoles)]
    [HttpGet("posts")]
    public async Task<IActionResult> Posts([FromQuery] PagingRequest request, [FromQuery] string? status) => Ok(await _content.SearchPostsAsync(request, status));

    [Authorize(Roles = StaffRoles)]
    [HttpGet("posts/{id:int}")]
    public async Task<IActionResult> Post(int id) { var p = await _content.GetPostAsync(id); return p is null ? NotFound() : Ok(p); }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost(SavePostRequest request)
    { try { return Ok(new { id = await _content.CreatePostAsync(request, CurrentUserId) }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("posts/{id:int}")]
    public async Task<IActionResult> UpdatePost(int id, SavePostRequest request)
    { try { await _content.UpdatePostAsync(id, request); return Ok(new { id }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("posts/{id:int}")]
    public async Task<IActionResult> DeletePost(int id)
    { try { await _content.DeletePostAsync(id); return Ok(new { message = "Đã xóa." }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("posts/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadPostImage([FromForm] UploadFileRequest request)
    { try { return Ok(new { url = await _storage.SaveAsync(request.File, "posts", HttpContext.RequestAborted) }); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); } }

    // ===== FAQ =====
    [HttpGet("faq")]
    public async Task<IActionResult> Faqs() => Ok(new { items = await _content.GetFaqsAsync() });

    [Authorize(Roles = StaffRoles)]
    [HttpPost("faq")]
    public async Task<IActionResult> CreateFaq(SaveFaqRequest request)
    { try { return Ok(new { id = await _content.CreateFaqAsync(request) }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("faq/{id:int}")]
    public async Task<IActionResult> UpdateFaq(int id, SaveFaqRequest request)
    { try { await _content.UpdateFaqAsync(id, request); return Ok(new { id }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("faq/{id:int}")]
    public async Task<IActionResult> DeleteFaq(int id)
    { try { await _content.DeleteFaqAsync(id); return Ok(new { message = "Đã xóa." }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    // ===== Liên hệ =====
    // Storefront: khách gửi yêu cầu liên hệ (công khai)
    [HttpPost("contacts")]
    public async Task<IActionResult> CreateContact(CreateContactRequest request)
    { try { return Ok(new { id = await _content.CreateContactAsync(request) }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpGet("contacts")]
    public async Task<IActionResult> Contacts([FromQuery] PagingRequest request, [FromQuery] string? status) => Ok(await _content.SearchContactsAsync(request, status));

    [Authorize(Roles = StaffRoles)]
    [HttpPatch("contacts/{id:int}/process")]
    public async Task<IActionResult> ProcessContact(int id)
    { try { await _content.MarkContactProcessedAsync(id); return Ok(new { id }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    // ===== Banner trang chủ =====
    [HttpGet("home-banners")]
    public async Task<IActionResult> Banners([FromQuery] bool all = false) => Ok(new { items = await _content.GetBannersAsync(all) });

    [Authorize(Roles = StaffRoles)]
    [HttpPost("home-banners")]
    public async Task<IActionResult> CreateBanner(SaveBannerRequest request)
    { try { return Ok(new { id = await _content.CreateBannerAsync(request) }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpPut("home-banners/{id:int}")]
    public async Task<IActionResult> UpdateBanner(int id, SaveBannerRequest request)
    { try { await _content.UpdateBannerAsync(id, request); return Ok(new { id }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = RoleConstant.Admin)]
    [HttpDelete("home-banners/{id:int}")]
    public async Task<IActionResult> DeleteBanner(int id)
    { try { await _content.DeleteBannerAsync(id); return Ok(new { message = "Đã xóa." }); } catch (ContentException ex) { return BadRequest(new { message = ex.Message }); } }

    [Authorize(Roles = StaffRoles)]
    [HttpPost("home-banners/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadBannerImage([FromForm] UploadFileRequest request)
    { try { return Ok(new { url = await _storage.SaveAsync(request.File, "banners", HttpContext.RequestAborted) }); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); } }
}

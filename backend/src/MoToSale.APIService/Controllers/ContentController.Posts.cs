using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common;
using MoToSale.Common.Auth;
using MoToSale.DTO.Common;
using MoToSale.DTO.Content;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

public partial class ContentController
{
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
}

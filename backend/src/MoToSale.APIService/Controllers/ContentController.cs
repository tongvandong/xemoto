using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Uploads;
using MoToSale.Common.Auth;
using MoToSale.Services.Content;

namespace MoToSale.APIService.Controllers;

[ApiController]
[Route("api/content")]
public partial class ContentController : ControllerBase
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

}

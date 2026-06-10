using Microsoft.AspNetCore.Mvc;
using MoToSale.APIService.Controllers;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Repository.EFCore;

namespace MoToSale.Backend.Tests.Controllers;

public class OperationsControllerTests
{
    [Fact]
    public async Task SaveSettings_AcceptsEnglishDescription()
    {
        var f = new TestBackendFactory();
        await f.SeedCoreAsync();
        var controller = new OperationsController(new Repository<MoToSale.Entities.SystemConfig.Setting>(f.Db));

        var result = await controller.SaveSettings(new SettingsRequest
        {
            Items = [new SettingItem { Key = "store.openingHours", Value = "08:00-17:00", Description = "Business hours" }],
        });

        Assert.IsType<OkObjectResult>(result);
        var setting = Assert.Single(f.Db.Settings);
        Assert.Equal("Business hours", setting.Description);
    }
}

using Microsoft.EntityFrameworkCore;
using MoToSale.Backend.Tests.TestSupport;
using MoToSale.Entities.Identity;

namespace MoToSale.Backend.Tests.Schema;

public class AppDbContextAuditTests
{
    [Fact]
    public async Task SaveChanges_DoesNotWritePasswordHashToAuditJson()
    {
        var f = new TestBackendFactory();
        var user = new User
        {
            Id = 100,
            FullName = "Audit User",
            Email = "audit-user@test.local",
            PasswordHash = "first-secret-hash",
            CreatedDate = DateTime.UtcNow,
        };

        f.Db.Users.Add(user);
        await f.Db.SaveChangesAsync();

        user.FullName = "Audit User Updated";
        user.PasswordHash = "second-secret-hash";
        user.UpdatedDate = DateTime.UtcNow;
        await f.Db.SaveChangesAsync();

        var userAuditLogs = await f.Db.AuditLogs
            .Where(log => log.Entity == nameof(User))
            .ToListAsync();

        Assert.NotEmpty(userAuditLogs);
        foreach (var log in userAuditLogs)
        {
            Assert.DoesNotContain("PasswordHash", log.OldValueJson ?? string.Empty);
            Assert.DoesNotContain("PasswordHash", log.NewValueJson ?? string.Empty);
            Assert.DoesNotContain("first-secret-hash", log.OldValueJson ?? string.Empty);
            Assert.DoesNotContain("first-secret-hash", log.NewValueJson ?? string.Empty);
            Assert.DoesNotContain("second-secret-hash", log.OldValueJson ?? string.Empty);
            Assert.DoesNotContain("second-secret-hash", log.NewValueJson ?? string.Empty);
        }
    }
}

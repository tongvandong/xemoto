using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using MoToSale.Common;
using MoToSale.Entities.Audit;

namespace MoToSale.Repository;

public partial class AppDbContext
{
    private static readonly HashSet<string> AuditIgnoredProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "PasswordHash"
    };

    private void CaptureAuditLogs()
    {
        var now = DateTime.UtcNow;
        var changedEntries = ChangeTracker.Entries<BaseEntity>()
            .Where(entry => ShouldCreateAuditLog(entry))
            .ToList();

        foreach (var entry in changedEntries)
        {
            AuditLogs.Add(new AuditLog
            {
                Entity = entry.Metadata.ClrType.Name,
                EntityId = entry.Entity.Id.ToString(),
                Action = entry.State.ToString(),
                OldValueJson = BuildOldValueJson(entry),
                NewValueJson = BuildNewValueJson(entry),
                At = now,
                CreatedDate = now,
            });
        }
    }

    private static bool ShouldCreateAuditLog(EntityEntry<BaseEntity> entry)
    {
        if (entry.Entity is AuditLog)
        {
            return false;
        }

        return entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted;
    }

    private static string? BuildOldValueJson(EntityEntry<BaseEntity> entry)
    {
        if (entry.State == EntityState.Added)
        {
            return null;
        }

        var oldValues = entry.Properties
            .Where(property => ShouldSaveAuditProperty(property))
            .ToDictionary(property => property.Metadata.Name, property => property.OriginalValue);

        return JsonSerializer.Serialize(oldValues);
    }

    private static string? BuildNewValueJson(EntityEntry<BaseEntity> entry)
    {
        if (entry.State == EntityState.Deleted)
        {
            return null;
        }

        var newValues = entry.Properties
            .Where(property => ShouldSaveAuditProperty(property))
            .ToDictionary(property => property.Metadata.Name, property => property.CurrentValue);

        return JsonSerializer.Serialize(newValues);
    }

    private static bool ShouldSaveAuditProperty(PropertyEntry property)
    {
        return !AuditIgnoredProperties.Contains(property.Metadata.Name);
    }
}

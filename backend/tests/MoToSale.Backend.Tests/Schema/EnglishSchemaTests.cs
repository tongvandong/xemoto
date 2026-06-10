using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MoToSale.Backend.Tests.TestSupport;

namespace MoToSale.Backend.Tests.Schema;

public class EnglishSchemaTests
{
    private static readonly Regex EnglishIdentifier = new("^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.Compiled);

    [Fact]
    public void EntityTableAndColumnNames_AreAsciiEnglishIdentifiers()
    {
        var f = new TestBackendFactory();
        var model = f.Db.Model.GetEntityTypes();

        foreach (var entity in model)
        {
            Assert.Matches(EnglishIdentifier, entity.GetTableName()!);
            foreach (var property in entity.GetProperties())
            {
                Assert.Matches(EnglishIdentifier, property.GetColumnName());
            }
        }
    }
}

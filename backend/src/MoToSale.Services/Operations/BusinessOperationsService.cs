using MoToSale.Repository;

namespace MoToSale.Services.Operations;

public partial class BusinessOperationsService : IBusinessOperationsService
{
    private readonly AppDbContext _db;

    public BusinessOperationsService(AppDbContext db)
    {
        _db = db;
    }
}

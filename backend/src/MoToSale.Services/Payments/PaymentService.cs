using MoToSale.Common;
using MoToSale.DTO.Common;
using MoToSale.DTO.Payments;
using MoToSale.Entities.Operations;
using MoToSale.Entities.Ordering;
using MoToSale.Entities.Payments;
using MoToSale.Repository;
using MoToSale.Repository.Inventory;
using MoToSale.Repository.Ordering;
using MoToSale.Repository.Payments;

namespace MoToSale.Services.Payments;

public partial class PaymentService : IPaymentService
{
    private readonly IPaymentRepository _payments;
    private readonly IOrderRepository _orders;
    private readonly IReservationRepository _reservations;
    private readonly AppDbContext _db;

    public PaymentService(IPaymentRepository payments, IOrderRepository orders, IReservationRepository reservations, AppDbContext db)
    {
        _payments = payments;
        _orders = orders;
        _reservations = reservations;
        _db = db;
    }
}

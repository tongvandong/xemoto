using MoToSale.Repository.EFCore;

namespace MoToSale.Backend.Tests.TestSupport;

public sealed class NoOpUnitOfWork : IUnitOfWork
{
    public async Task ExecuteInTransactionAsync(Func<Task> action) => await action();

    public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action) => await action();
}

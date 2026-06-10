using System.Linq.Expressions;

namespace MoToSale.Repository.EFCore;

/// <summary>Repository generic định nghĩa CRUD cơ bản (theo khuôn BaseCore.Repository.EFCore).</summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<List<T>> GetAllAsync();
    Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate);
    void Add(T entity);
    void Update(T entity);
    void Delete(T entity);
    Task<int> SaveChangesAsync();
}

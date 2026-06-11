using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace MoToSale.Repository.EFCore;

/// <summary>
/// Cài đặt chung cho repository. Repo cụ thể kế thừa lớp này để dùng lại CRUD,
/// và bổ sung các phương thức truy vấn theo nghiệp vụ qua thuộc tính <see cref="Query"/>.
/// </summary>
public class Repository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext Context;
    protected readonly DbSet<T> Set;

    public Repository(AppDbContext context)
    {
        Context = context;
        Set = context.Set<T>();
    }

    /// <summary>IQueryable nội bộ cho repo cụ thể build truy vấn, không expose ra service.</summary>
    protected IQueryable<T> Query
    {
        get
        {
            return Set.AsQueryable();
        }
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        T? entity = await Set.FindAsync(id);
        return entity;
    }

    public virtual async Task<List<T>> GetAllAsync()
    {
        List<T> entities = await Set
            .AsNoTracking()
            .ToListAsync();

        return entities;
    }

    public virtual async Task<List<T>> FindAsync(Expression<Func<T, bool>> predicate)
    {
        List<T> entities = await Set
            .AsNoTracking()
            .Where(predicate)
            .ToListAsync();

        return entities;
    }

    public virtual async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate)
    {
        bool exists = await Set.AnyAsync(predicate);
        return exists;
    }

    public virtual void Add(T entity)
    {
        Set.Add(entity);
    }

    public virtual void Update(T entity)
    {
        Set.Update(entity);
    }

    public virtual void Delete(T entity)
    {
        Set.Remove(entity);
    }

    public async Task<int> SaveChangesAsync()
    {
        int affectedRows = await Context.SaveChangesAsync();
        return affectedRows;
    }
}

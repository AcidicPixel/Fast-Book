// File: Data/TripDbContext.cs
// ---------------------------------------------------------
// This is the bridge between our C# code and the PostgreSQL database.
// Entity Framework (EF) reads this file and figures out how to write the 
// actual SQL commands to save and retrieve our data.
// ---------------------------------------------------------
using Microsoft.EntityFrameworkCore;
using TripService.Model;

namespace TripService.Data;

public class TripDbContext : DbContext
{
    public TripDbContext(DbContextOptions<TripDbContext> options) : base(options)
    {
    }

    // This represents the physical table in the database
    public DbSet<Trip> Trips { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Define primary keys and column constraints here
        modelBuilder.Entity<Trip>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(100);
        });

    }
}
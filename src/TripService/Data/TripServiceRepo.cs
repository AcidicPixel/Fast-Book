// File: Data/TripServiceRepo.cs
// ---------------------------------------------------------
// This is the implementation of our interface contract. This is where the 
// actual database work happens. If we ever wanted to swap out our database 
// (e.g., from Postgres to SQL), we'd only have to change the code in this file!
// ---------------------------------------------------------
using Microsoft.EntityFrameworkCore;
using TripService.Model;

namespace TripService.Data;

public class TripServiceRepo(TripDbContext context) : ITripServiceRepo
{
    public async Task<bool> SaveChangesAsync()
    {
        return await context.SaveChangesAsync() >= 0;
    }

    public async Task<IEnumerable<Trip>> GetAllTripsAsync()
    {
        return await context.Trips
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<Trip?> GetTripByIdAsync(Guid id)
    {
        return await context.Trips
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public void CreateTrip(Trip trip)
    {
        if (trip == null) throw new ArgumentNullException(nameof(trip));
        trip.CreatedAt = DateTime.UtcNow;
        trip.Id = Guid.NewGuid();
        context.Trips.Add(trip);
    }

    public void DeleteTrip(Trip trip)
    {
        if (trip == null) throw new ArgumentNullException(nameof(trip));
        context.Trips.Remove(trip);
    }
}
// File: Data/SeedData.cs
// ---------------------------------------------------------
// This file acts as our "pantry" of dummy data. Instead of baking this 
// data directly into the database structure (migrations), we keep it here 
// as a simple list. Our startup script will grab this list and insert it 
// into the database when the app turns on.
// ---------------------------------------------------------
using TripService.Model;

namespace TripService.Data;

public static class SeedData
{
    public static List<Trip> GetPredefinedTrips()
    {
        return new List<Trip>
        {
            new Trip
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = "Weekend Getaway",
                Destination = "Paris, France",
                StartDate = DateTime.UtcNow.AddDays(10),
                EndDate = DateTime.UtcNow.AddDays(13),
                Price = 450.00m,
                Description = "A quick weekend trip to see the Eiffel Tower.",
                CreatedAt = DateTime.UtcNow
            },
            new Trip
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = "Alpine Adventure",
                Destination = "Swiss Alps",
                StartDate = DateTime.UtcNow.AddDays(30),
                EndDate = DateTime.UtcNow.AddDays(37),
                Price = 1200.00m,
                Description = "A week of skiing and hot chocolate.",
                CreatedAt = DateTime.UtcNow
            }
        };
    }
}
// File: Data/ITripServiceRepo.cs
// ---------------------------------------------------------
// This is an Interface (a contract). It lists all the actions we can perform 
// on trips (Get, Create, Delete), but it DOES NOT contain the code to do them. 
// It allows the rest of our app to ask for data without caring about the SQL details.
// ---------------------------------------------------------
using TripService.Model;

namespace TripService.Data;

public interface ITripServiceRepo
{
    Task<bool> SaveChangesAsync();
    Task<IEnumerable<Trip>> GetAllTripsAsync();
    Task<Trip?> GetTripByIdAsync(Guid id);
    void CreateTrip(Trip trip);
    void DeleteTrip(Trip trip);
}
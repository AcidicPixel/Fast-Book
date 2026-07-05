// File: Model/Trip.cs
// ---------------------------------------------------------
// This is your Data Model. Think of it as a blueprint for a table 
// in your database. Every instance of this class is one "row" in the database, 
// and every property (Id, Name, Price) is a "column".
// ---------------------------------------------------------
namespace TripService.Model;

public class Trip
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Price { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
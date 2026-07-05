// File: DTO/TripCardDto.cs
// ---------------------------------------------------------
// A DTO (Data Transfer Object) is a lightweight version of the Model.
// We don't always want to send the entire database row to the frontend 
// (e.g., maybe we don't need the full Description on the homepage). 
// This object is shaped specifically for what the user interface needs to see.
// ---------------------------------------------------------
namespace TripService.DTO;

public class TripCardDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationInDays { get; set; }
}
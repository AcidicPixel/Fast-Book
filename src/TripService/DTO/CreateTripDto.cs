// File: DTO/CreateTripDto.cs
// ---------------------------------------------------------
// When a user creates a trip, they send us data. We use Data Annotations 
// (like [Required] or [MaxLength]) to enforce rules before our code even runs. 
// If the frontend sends a trip without a name, the API will automatically 
// reject it with a "400 Bad Request" error. No messy "if" statements required!
// ---------------------------------------------------------
using System.ComponentModel.DataAnnotations;

namespace TripService.DTO;

public record CreateTripDto(
    [Required(ErrorMessage = "Every trip needs a name!")]
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters.")]
    string Name,

    [Required]
    [MaxLength(150)]
    string Destination,

    [Required]
    DateTime StartDate,

    [Required]
    DateTime EndDate,

    [Range(0.01, 100000.00, ErrorMessage = "Price must be greater than zero.")]
    decimal Price,

    [MaxLength(500, ErrorMessage = "Description is too long.")]
    string Description
);
// File: Controllers/TripController.cs
// ---------------------------------------------------------
// This is the entry point for the frontend! When your React/Vite app makes a network 
// request to "https://localhost:xxxx/api/trips", this file intercepts it. 
// It grabs data from the Repository, shapes it with AutoMapper, and sends it back as JSON.
//
// The [ProducesResponseType] tags don't change how the code runs, but they 
// are incredibly important. They generate a "Swagger" documentation page. 
// It tells the frontend: "If things go right, expect a 200 OK with a list 
// of trips. If things go wrong, expect a 400 Bad Request."
// ---------------------------------------------------------
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using TripService.Data;
using TripService.DTO;
using TripService.Model;

namespace TripService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TripController(ITripServiceRepo repo, IMapper mapper) : ControllerBase
{

    /// <summary>
    /// Retrieves all upcoming trips.
    /// </summary>
    /// <remarks>
    /// This endpoint fetches the complete list of trips from the database 
    /// and maps them into lightweight summary cards for the frontend UI.
    /// </remarks>
    /// <returns>A list of TripCardDto objects.</returns>
    /// <response code="200">Returns the list of trips successfully.</response>
    /// <response code="500">If the database or server encounters an unexpected error.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TripCardDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<TripCardDto>>> GetTrips()
    {
        var trips = await repo.GetAllTripsAsync();
        var tripCards = mapper.Map<IEnumerable<TripCardDto>>(trips);

        return Ok(tripCards);
    }

    /// <summary>
    /// Creates a new trip.
    /// </summary>
    /// <remarks>
    /// Automatically validates the incoming data (like ensuring the price is above 0). 
    /// The database will automatically generate a unique ID and CreatedAt timestamp.
    /// </remarks>
    /// <param name="tripInput">The details of the trip to create.</param>
    /// <returns>The newly created trip as a TripCardDto.</returns>
    /// <response code="201">Returns the newly created trip.</response>
    /// <response code="400">If the input data fails validation (e.g., missing name).</response>
    [HttpPost]
    [ProducesResponseType(typeof(TripCardDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TripCardDto>> CreateTrip([FromBody] CreateTripDto tripInput)
    {
        var tripModel = mapper.Map<Trip>(tripInput);

        repo.CreateTrip(tripModel);
        await repo.SaveChangesAsync();

        var tripCard = mapper.Map<TripCardDto>(tripModel);

        return CreatedAtAction(nameof(GetTrips), new { id = tripCard.Id }, tripCard);
    }

    /// <summary>
    /// Deletes a specific trip by its unique ID.
    /// </summary>
    /// <param name="id">The GUID of the trip to delete.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">If the trip was successfully deleted.</response>
    /// <response code="404">If no trip matching the provided ID could be found.</response>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteTrip(Guid id)
    {
        var trip = await repo.GetTripByIdAsync(id);
        if (trip == null)
        {
            return NotFound();
        }

        repo.DeleteTrip(trip);
        await repo.SaveChangesAsync();

        return NoContent();
    }
}
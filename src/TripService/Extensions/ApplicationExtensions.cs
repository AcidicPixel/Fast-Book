// File: Extensions/ApplicationExtensions.cs
// ---------------------------------------------------------
// EXPLANATION FOR BEGINNERS:
// Extension methods are a neat C# trick to add new features to existing classes 
// without modifying the original source code. Here, we are adding our own 
// custom "ConfigureDatabaseAsync" command to the standard WebApplication engine. 
// Think of this file as the "startup checklist" for our database.
// ---------------------------------------------------------
using Microsoft.EntityFrameworkCore;
using TripService.Data;

namespace TripService.Extensions;

public static class ApplicationExtensions
{
    public static async Task ConfigureDatabaseAsync(this WebApplication app)
    {
        // This creates a temporary "scope" to safely grab our database context
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TripDbContext>();

        // Step 1: Run the migrations (Create the tables if they don't exist)
        await RunMigrationsAsync(dbContext);

        // Step 2: Run our custom seed logic
        await SeedDataAsync(dbContext);
    }

    private static async Task RunMigrationsAsync(TripDbContext dbContext)
    {
        // The Execution Strategy ensures that if the database is temporarily 
        // unavailable while starting up (common in Docker/Aspire), it will retry.
        var strategy = dbContext.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await dbContext.Database.MigrateAsync();
        });
    }


    // ---------------------------------------------------------
    // When the app starts, we check if the Trips table is empty. 
    // If it is, we ask our SeedData file for the predefined list of trips, 
    // add them to the database context, and save them. 
    // ---------------------------------------------------------
    private static async Task SeedDataAsync(TripDbContext dbContext)
    {
        // Only insert data if the table is completely empty
        if (!await dbContext.Trips.AnyAsync())
        {
            // 1. Grab the list of dummy trips from our SeedData file
            var dummyTrips = SeedData.GetPredefinedTrips();

            // 2. Queue them up to be inserted into the database
            dbContext.Trips.AddRange(dummyTrips);

            // 3. Execute the SQL command to save them
            await dbContext.SaveChangesAsync();
        }
    }
}
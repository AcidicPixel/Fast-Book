// File: Program.cs
// ---------------------------------------------------------
// EXPLANATION FOR BEGINNERS:
// This is the absolute start of the program. Before the web server starts listening, 
// we have to "register" all our services, databases, and tools so the application 
// knows they exist. We wire up the Aspire database connection here.
// ---------------------------------------------------------
using TravelSite.ServiceDefaults;
using TripService.Data;
using TripService.Extensions;

namespace TripService;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // 1. Hook up the Postgres Database configured in the Aspire AppHost
        builder.AddNpgsqlDbContext<TripDbContext>("TripServiceDB");

        // 2. Hook up the Event Bus for future microservice communication
        builder.AddRabbitMqEventBus("eventbus");

        builder.AddServiceDefaults();

        builder.Services.AddControllers();
        builder.Services.AddOpenApi();

        // 3. Register AutoMapper so it can find our Profile mappings
        builder.Services.AddAutoMapper(cfg => { }, AppDomain.CurrentDomain.GetAssemblies());


        // 4. Register our Repository so the Controller can ask for it
        builder.Services.AddScoped<ITripServiceRepo, TripServiceRepo>();

        //SWAGGER
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFilename));
        });

        var app = builder.Build();

        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

        app.MapControllers();
        app.MapDefaultEndpoints();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            await app.ConfigureDatabaseAsync();

            app.MapOpenApi();

            app.UseSwagger(); // Generates the Swagger document
            app.UseSwaggerUI(); // Hosts the pretty webpage at /swagger
        }

        app.UseHttpsRedirection();

        app.Run();
    }
}
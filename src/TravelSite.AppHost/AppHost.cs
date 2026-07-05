// File: Program.cs (Inside the AppHost project)
// ==============================================================================
// Welcome to the AppHost! Think of this file as the "Conductor" of an orchestra.
// Instead of manually starting a database, starting an event bus, starting an API, 
// and starting a frontend one by one, we declare them all right here. 
// 
// When you press "Run" on this project, Aspire reads this script and spins up 
// everything in the correct order, wires them together (so they know each other's 
// URLs and passwords), and provides a beautiful dashboard to monitor them.
// ==============================================================================

using Projects;

var builder = DistributedApplication.CreateBuilder(args);

// ---------------------------------------------------------
// 1. DATABASE SETUP
// We tell Aspire to spin up a PostgreSQL database in a Docker container.
// We use the "pgvector" image (great for AI/vector search later) and map it to port 543.
// ---------------------------------------------------------
var postgres = builder.AddPostgres("postgres")
    .WithImage("ankane/pgvector")
    .WithImageTag("latest")
    .WithEndpoint(port: 543, targetPort: 544, name: "postgres-port")
    .WithLifetime(ContainerLifetime.Persistent); // Keeps data alive between restarts

// Inside that Postgres server, create a specific database just for trips.
var tripDb = postgres.AddDatabase("TripServiceDB");


// ---------------------------------------------------------
// 2. EVENT BUS SETUP
// RabbitMQ is a message broker. It allows our microservices to talk to each 
// other asynchronously (like leaving a voicemail instead of a live phone call).
// WHEN YOU ADD MORE SERVICES WE CAN TALK ABOUT THIS :))
// ---------------------------------------------------------
var rabbitMq = builder.AddRabbitMQ("eventbus")
    .WithLifetime(ContainerLifetime.Persistent);

var launchProfileName = ShouldUseHttpForEndpoints() ? "http" : "https";


// ---------------------------------------------------------
// 3. BACKEND SERVICES
// Here we register our actual C# web APIs. 
// We use .WithReference() to securely pass the database and event bus connection 
// strings directly into the API. .WaitFor() ensures the API doesn't crash trying 
// to connect to a database that is still booting up!
// ---------------------------------------------------------
var tripApi = builder.AddProject<Projects.TripService>("trip-service")
    .WithReference(rabbitMq).WaitFor(rabbitMq)
    .WithReference(tripDb).WaitFor(tripDb);


// ---------------------------------------------------------
// 4. FRONTEND SETUP
// We register our Vite/React frontend.
// ---------------------------------------------------------
var webfrontend = builder.AddViteApp("FrontEnd", "../FrontEnd")
    .WithExternalHttpEndpoints()
    .WithUrls(c => c.Urls.ForEach(u => u.DisplayText = $"Travel Site ({u.Endpoint?.EndpointName})"));


// ---------------------------------------------------------
// 5. API GATEWAY SETUP
// The Gateway is the "front door" for the frontend. The React app talks to the 
// Gateway, and the Gateway routes the traffic to the correct backend service (like TripService).
// ---------------------------------------------------------
var apiGateway = builder.AddProject<Projects.API_Gateway>("api-gateway", launchProfileName)
    .WithExternalHttpEndpoints()
    .WithUrls(c => c.Urls.ForEach(u => u.DisplayText = $"API Gateway ({u.Endpoint?.EndpointName})"))
    .WithReference(tripApi).WaitFor(tripApi)
    .WithEnvironment("FrontendUrl", webfrontend.GetEndpoint("http"));

// Finally, we tell the frontend where the API Gateway is so it can make network requests.
webfrontend
    .WithReference(apiGateway)
    .WaitFor(apiGateway);


// START THE ORCHESTRA!
builder.Build().Run();


// --- Helper Methods ---

static bool ShouldUseHttpForEndpoints()
{
    const string EnvVarName = "TRAVELSITE_USE_HTTP_ENDPOINTS";
    var envValue = Environment.GetEnvironmentVariable(EnvVarName);

    // Attempt to parse the environment variable value; return true if it's exactly "1".
    return int.TryParse(envValue, out int result) && result == 1;
}
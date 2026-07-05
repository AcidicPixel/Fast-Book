using API.Gateway;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.ServiceDiscovery;
using Ocelot.Values;
using TravelSite.ServiceDefaults;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var frontendUrl = builder.Configuration["FrontendUrl"];

builder.Services.AddAuthentication();


//builder.AddAppAuthetication();
builder.Configuration.AddJsonFile(
    builder.Environment.IsProduction() ? "ocelot.Production.json" : "ocelot.json",
    optional: false,
    reloadOnChange: true);

ServiceDiscoveryFinderDelegate serviceDiscoveryFinder = (provider, config, route)
    => new AspireServiceDiscoveryProvider(provider, config, route);

builder.Services.AddSingleton(serviceDiscoveryFinder);

builder.Services.AddOcelot(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            policy.WithOrigins(frontendUrl)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

//This is a custom middleware that catches any unhandled exceptions and returns a standardized error response, while also logging the exception details.
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

await app.UseOcelot();
app.Run();
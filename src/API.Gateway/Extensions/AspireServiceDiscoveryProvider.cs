using Ocelot.Configuration;
using Ocelot.ServiceDiscovery.Providers;
using Ocelot.Values;

namespace API.Gateway;

public class AspireServiceDiscoveryProvider : IServiceDiscoveryProvider
{
    private readonly IConfiguration _configuration;
    private readonly DownstreamRoute _downstreamRoute;

    public AspireServiceDiscoveryProvider(IServiceProvider serviceProvider, ServiceProviderConfiguration config, DownstreamRoute downstreamRoute)
    {
        // Grab IConfiguration from the DI container to read Aspire's injected URLs
        _configuration = serviceProvider.GetRequiredService<IConfiguration>();
        _downstreamRoute = downstreamRoute;
    }

    public Task<List<Service>> Get()
    {
        return GetAsync();
    }

    // Newer Ocelot versions call this
    public Task<List<Service>> GetAsync()
    {
        var services = new List<Service>();
        var serviceName = _downstreamRoute.ServiceName;

        if (string.IsNullOrEmpty(serviceName))
        {
            return Task.FromResult(services);
        }

        // Aspire formats injected service URLs like this in the IConfiguration:
        // services:{ServiceName}:https:0
        var httpsUrl = _configuration[$"services:{serviceName}:https:0"];
        var httpUrl = _configuration[$"services:{serviceName}:http:0"];

        // Prefer HTTPS, fallback to HTTP
        var targetUrl = httpsUrl ?? httpUrl;

        if (!string.IsNullOrEmpty(targetUrl) && Uri.TryCreate(targetUrl, UriKind.Absolute, out var uri))
        {
            services.Add(new Service(
                serviceName,
                new ServiceHostAndPort(uri.Host, uri.Port),
                string.Empty,
                string.Empty,
                new List<string>()
            ));
        }

        return Task.FromResult(services);
    }
}
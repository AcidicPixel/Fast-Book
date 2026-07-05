using System.Threading.Tasks;

namespace TravelSite.EventBus.Abstractions;

public interface IEventBus
{
    Task PublishAsync(IntegrationEvent @event);
}

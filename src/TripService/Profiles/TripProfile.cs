// File: Profiles/ServiceProfile.cs
// ---------------------------------------------------------
// AutoMapper is a tool that automatically copies data from one object to another.
// Instead of manually typing: dto.Name = trip.Name; dto.Price = trip.Price;
// this file tells the application how to translate a "Trip" into a "TripCardDto".
// We have two mappings:
// 1. Database Model -> UI Card (for getting data)
// 2. User Input -> Database Model (for saving data)
// ---------------------------------------------------------
using AutoMapper;
using TripService.Model;
using TripService.DTO;

namespace TripService.Profiles;

public class ServiceProfile : Profile
{
    public ServiceProfile()
    {
        // Outbound: Database -> UI
        CreateMap<Trip, TripCardDto>()
            .ForMember(dest => dest.DurationInDays, opt => opt.MapFrom(src => (src.EndDate - src.StartDate).Days));

        // Inbound: User Input -> Database
        CreateMap<CreateTripDto, Trip>()
            .ForMember(dest => dest.Id, opt => opt.Ignore()) // The DB will generate the ID
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore()); // We set this in the Repo
    }
}
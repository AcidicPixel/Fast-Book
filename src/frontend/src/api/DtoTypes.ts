// File: src/api/DtoTypes.ts
// ---------------------------------------------------------
// This file holds all our "Contracts". If the backend C# code sends us a TripCardDto,
// we define its exact shape here. This gives us autocomplete in our code editor
// and stops us from accidentally asking for a property that doesn't exist (like trip.Color).
// ---------------------------------------------------------

export interface TripCardDto {
    id: string;
    name: string;
    destination: string;
    price: number;
    durationInDays: number;
}

export interface CreateTripDto {
    name: string;
    destination: string;
    startDate: string; // ISO string format
    endDate: string;
    price: number;
    description?: string;
}
// File: src/api/services/tripService.ts
// ---------------------------------------------------------
// This is our catalogue of backend endpoints. The React pages will call 
// `tripService.getAll()` to return what our backend code did. If the backend URL 
// changes from '/api/trips' to '/api/v2/trips', we only update it in this one file.
// ---------------------------------------------------------
import { apiFetch } from '../HttpClient';
import type { TripCardDto, CreateTripDto } from '../DtoTypes';

// Note: These URLs hit your API Gateway (Ocelot) which routes them to the TripService container
const BASE_URL = '/api/trip';

export const tripService = {
    getAll: () => apiFetch<TripCardDto[]>(BASE_URL),

    getById: (id: string) => apiFetch<TripCardDto>(`${BASE_URL}/${id}`),

    create: (data: CreateTripDto) => apiFetch<TripCardDto>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    delete: (id: string) => apiFetch<void>(`${BASE_URL}/${id}`, {
        method: 'DELETE',
    }),
};
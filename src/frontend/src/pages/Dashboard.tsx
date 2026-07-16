// File: src/App.tsx
import { useEffect, useState } from 'react';
import { useApi } from '../api/useApi';
import { tripService } from '../api/services/tripService';
import { SearchBar } from '../components/SearchBar';
import type { CreateTripDto } from '../api/DtoTypes';
import '../App.css';

function Dashboard() {
    const {
        data: trips,
        loading,
        error,
        execute: fetchTrips,
        setData: setTrips
    } = useApi(tripService.getAll);

    const {
        loading: creating,
        error: createError,
        execute: createTrip
    } = useApi(tripService.create);

    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState<CreateTripDto>({
        name: '',
        destination: '',
        startDate: '',
        endDate: '',
        price: 0,
        description: ''
    });

    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Build payload EXACTLY matching backend DTO
        const payload: CreateTripDto = {
            name: form.name,
            destination: form.destination,
            startDate: form.startDate,   // ISO string
            endDate: form.endDate,       // ISO string
            price: form.price,
            description: form.description
        };

        try {
            const newTrip = await createTrip(payload);

            // Add new trip to UI
            setTrips(prev => (prev ? [...prev, newTrip] : [newTrip]));

            // Reset form
            setShowForm(false);
            setForm({
                name: '',
                destination: '',
                startDate: '',
                endDate: '',
                price: 0,
                description: ''
            });
        } catch {
            // Error handled by hook
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Aspire Getaways</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <SearchBar />

                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#0078ff',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        + Add Trip
                    </button>
                </div>
            </header>

            <main className="main-content">
                <h2>Your Upcoming Trips</h2>

                {loading && <p>Loading your adventures...</p>}

                {error && (
                    <div className="error-message">
                        <p>Oh no! We couldn't load the trips.</p>
                        <p>{error}</p>
                    </div>
                )}

                {showForm && (
                    <div
                        style={{
                            marginTop: '2rem',
                            padding: '2rem',
                            border: '1px solid #ddd',
                            borderRadius: '12px',
                            background: '#fafafa',
                            maxWidth: '500px'
                        }}
                    >
                        <h3>Create a New Trip</h3>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                name="name"
                                placeholder="Trip name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            <input
                                type="text"
                                name="destination"
                                placeholder="Destination"
                                value={form.destination}
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            <label style={{ fontSize: '14px', color: '#555' }}>Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={form.startDate}
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            <label style={{ fontSize: '14px', color: '#555' }}>End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={form.endDate}
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            <input
                                type="number"
                                name="price"
                                placeholder="Price (£)"
                                value={form.price}
                                onChange={handleChange}
                                required
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                            />

                            <textarea
                                name="description"
                                placeholder="Description (optional)"
                                value={form.description}
                                onChange={handleChange}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '80px' }}
                            />

                            {createError && (
                                <p style={{ color: 'red' }}>
                                    Could not create trip: {createError}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#0078ff',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {creating ? 'Creating...' : 'Create Trip'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#ccc',
                                        color: '#333',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div
                    className="trip-grid"
                    style={{
                        display: 'flex',
                        gap: '2rem',
                        flexWrap: 'wrap',
                        marginTop: '2rem'
                    }}
                >
                    {trips &&
                        trips.map((trip) => (
                            <div
                                key={trip.id}
                                className="trip-card"
                                style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    width: '300px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                }}
                            >
                                <h3 style={{ margin: '0 0 8px 0' }}>{trip.name}</h3>
                                <p style={{ color: '#717171', margin: '0 0 16px 0' }}>{trip.destination}</p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>£{trip.price.toFixed(2)}</strong>
                                    <span style={{ fontSize: '14px', color: '#717171' }}>
                                        {trip.durationInDays} days
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;


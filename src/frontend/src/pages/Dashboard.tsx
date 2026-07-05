// File: src/App.tsx
import { useEffect } from 'react';
import { useApi } from '../api/useApi';
import { tripService } from '../api/services/tripService';
import { SearchBar } from '../components/SearchBar';
import '../App.css';

function Dashboard() {
    // Bring in our generic hook, passing it the exact service method we want to use
    const { data: trips, loading, error, execute: fetchTrips } = useApi(tripService.getAll);

    // Fetch the data as soon as the component loads
    useEffect(() => {
        fetchTrips();
    }, [fetchTrips]);

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Aspire Getaways</h1>
                <SearchBar />
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

                <div className="trip-grid" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                    {trips && trips.map((trip) => (
                        <div key={trip.id} className="trip-card" style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px', width: '300px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: '0 0 8px 0' }}>{trip.name}</h3>
                            <p style={{ color: '#717171', margin: '0 0 16px 0' }}>{trip.destination}</p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>£{trip.price.toFixed(2)}</strong>
                                <span style={{ fontSize: '14px', color: '#717171' }}>{trip.durationInDays} days</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
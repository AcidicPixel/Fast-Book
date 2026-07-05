// File: src/api/HttpClient.ts
// ---------------------------------------------------------
// Instead of writing `fetch(...)` and checking for errors in every single component,
// we write it once here. Every API call will route through this function. 
// If we ever need to add authentication tokens later, we only have to add them here!
// ---------------------------------------------------------

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        // You can expand this to handle ProblemDetails from the backend
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // If it's a 204 No Content (like a Delete), don't try to parse JSON
    if (response.status === 204) {
        return null as unknown as T;
    }

    return response.json();
}
// File: src/api/useApi.ts
// ---------------------------------------------------------
// EXPLANATION FOR BEGINNERS:
// A "Hook" is a reusable piece of logic in React. This hook manages the 3 states
// of any network request: 
// 1. Is it loading? 
// 2. Did it error? 
// 3. What is the data?
// By using this, our UI components don't have to manually manage these variables.
// ---------------------------------------------------------
import { useCallback, useState } from 'react';

export function useApi<T, Args extends unknown[]>(apiFunction: (...args: Args) => Promise<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (...args: Args) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFunction(...args);
            setData(response);
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction]);

    return { data, setData, loading, error, execute };
}
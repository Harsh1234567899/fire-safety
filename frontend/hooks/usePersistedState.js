import { useState, useEffect, useCallback } from 'react';

/**
 * usePersistedState - like useState but persists to sessionStorage.
 * Data survives page refreshes but is cleared when the tab/browser is closed.
 *
 * @param {string} key - unique sessionStorage key
 * @param {*} defaultValue - fallback if nothing in storage
 * @returns [value, setValue, clearValue]
 */
const usePersistedState = (key, defaultValue) => {
    const [value, setValue] = useState(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch {
            // sessionStorage full or unavailable — ignore
        }
    }, [key, value]);

    const clearValue = useCallback(() => {
        sessionStorage.removeItem(key);
        setValue(defaultValue);
    }, [key, defaultValue]);

    return [value, setValue, clearValue];
};

export default usePersistedState;

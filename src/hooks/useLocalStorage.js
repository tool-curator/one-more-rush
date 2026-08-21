import { useState, useEffect, useCallback } from 'react';
import { getScopedKey, onScopeChange } from '../services/storageScopeService.js';

export function useLocalStorage(key, initialValue) {
  const readValue = useCallback(() => {
    try {
      const scopedKey = getScopedKey(key);
      const item = window.localStorage.getItem(scopedKey);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  useEffect(() => {
    // Read on key change
    setStoredValue(readValue());

    // Subscribe to scope changes (login / logout / account switch)
    const unsubscribe = onScopeChange(() => {
      setStoredValue(readValue());
    });

    return unsubscribe;
  }, [readValue]);

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      const scopedKey = getScopedKey(key);
      window.localStorage.setItem(scopedKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

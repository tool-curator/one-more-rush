import React from 'react';

/**
 * Creates a retryable React.lazy component.
 * 
 * Features:
 * 1. Automatic in-flight retry with exponential backoff on transient network failures.
 * 2. Generation keying (`retryGeneration`), which ensures that when a user clicks "TRY AGAIN",
 *    a brand-new React.lazy instance is created and mounted. This completely bypasses React's
 *    internal cached rejected promise without requiring a full page refresh.
 * 3. Preserves Vite static module analysis and dynamic code splitting chunks.
 */

const retryableCache = new Map();

export function getLazyComponentWithRetry(importKey, importFn, retryGeneration = 0) {
  const cacheKey = `${importKey}::gen_${retryGeneration}`;
  if (!retryableCache.has(cacheKey)) {
    retryableCache.set(
      cacheKey,
      React.lazy(() => {
        return new Promise((resolve, reject) => {
          const attempt = (retriesLeft, delay) => {
            importFn()
              .then(resolve)
              .catch((error) => {
                if (retriesLeft > 0) {
                  setTimeout(() => attempt(retriesLeft - 1, delay * 2), delay);
                } else {
                  console.warn(`[LazyWithRetry] Dynamic import failed for "${importKey}" (gen ${retryGeneration}):`, error);
                  reject(error);
                }
              });
          };
          attempt(2, 350);
        });
      })
    );
  }
  return retryableCache.get(cacheKey);
}

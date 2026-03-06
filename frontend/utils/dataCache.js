/**
 * Module-level data cache that persists across component unmount/remount cycles.
 * Unlike useRef or useState, this cache lives at the JS module level so it
 * survives React route changes.
 * 
 * Usage:
 *   import { dataCache } from '../utils/dataCache';
 *   
 *   // In useEffect:
 *   if (dataCache.has('settings')) {
 *       const cached = dataCache.get('settings');
 *       setState(cached);
 *       return;
 *   }
 *   fetchData().then(data => dataCache.set('settings', data));
 *   
 *   // On refresh button: dataCache.clear('settings'); refetch();
 */
const cache = new Map();

export const dataCache = {
    get: (key) => cache.get(key),
    set: (key, data) => cache.set(key, data),
    has: (key) => cache.has(key),
    clear: (key) => key ? cache.delete(key) : cache.clear(),
    clearAll: () => cache.clear(),
};

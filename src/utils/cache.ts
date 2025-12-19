// Simple in-memory cache with TTL
class SimpleCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  set(key: string, data: any, ttl: number) {
    const expiry = Date.now() + (ttl * 1000); // Convert seconds to milliseconds
    this.cache.set(key, { data, expiry });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();
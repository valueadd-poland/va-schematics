export class SchematicCache {
  private static instance: SchematicCache;
  private cacheOfCaches: { [key: string]: any } = {};

  static getInstance(): SchematicCache {
    if (!SchematicCache.instance) {
      SchematicCache.instance = new SchematicCache();
    }

    return SchematicCache.instance;
  }

  private constructor() {}

  clear(cacheName: string): void {
    this.cacheOfCaches[cacheName] = undefined;
  }

  clearAll(): void {
    this.cacheOfCaches = {};
  }

  read<T extends object>(cacheName: string): T | undefined {
    return this.cacheOfCaches[cacheName];
  }

  save(cacheName: string, value: any): void {
    this.cacheOfCaches[cacheName] = value;
  }
}

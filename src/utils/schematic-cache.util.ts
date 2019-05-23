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

  read<T extends object>(cacheName: string): T {
    if (this.cacheOfCaches[cacheName]) {
      return this.cacheOfCaches[cacheName];
    }

    this.cacheOfCaches[cacheName] = {};
    return this.cacheOfCaches[cacheName] as T;
  }

  save(cacheName: string, value: object): void {
    this.cacheOfCaches[cacheName] = value;
  }
}

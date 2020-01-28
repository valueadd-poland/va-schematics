import { Observable, of } from 'rxjs';

export class LocalStorageCrud {
  create<T extends { id: string }>(collection: string, entity: T): Observable<T> {
    if (!entity.id) {
      throw new Error(`Entity must have 'id' property.`);
    }

    const entities = this.getCollection<T>(collection);
    this.setCollection(collection, entities.concat(entity));

    return of(entity);
  }

  get<T extends { id: string }>(collection: string, id: string): Observable<T> {
    const entities = this.getCollection(collection);
    const found = entities.find(entity => entity.id === id);

    if (!found) {
      throw new Error(`Entity with id '${id}' not found in collection '${collection}.'`);
    }

    return of(found);
  }

  getAll<T extends { id: string }>(collection: string): Observable<T[]> {
    return of(this.getCollection(collection));
  }

  remove(collection: string, id: string): Observable<void> {
    const entities = this.getCollection(collection);
    this.setCollection(
      collection,
      entities.filter(entity => entity.id !== id)
    );

    return of();
  }

  update<T extends { id: string }>(collection: string, entity: Partial<T>): Observable<T> {
    if (!entity.id) {
      throw new Error(`Entity must have 'id' property.`);
    }

    const entities = this.getCollection(collection);
    const index = entities.findIndex(e => e.id === entity.id);

    if (index === -1) {
      throw new Error(`Entity with id '${entity.id} does not exist in '${collection}' collection.`);
    }

    entities[index] = {
      ...entities[index],
      ...entity
    };

    this.setCollection(collection, entities);

    return of(entities[index]);
  }

  private getCollection<T = any>(collection: string): T[] {
    return JSON.parse(localStorage.getItem(collection) || '[]');
  }

  private setCollection(collection: string, value: any): void {
    localStorage.setItem(collection, JSON.stringify(value));
  }
}

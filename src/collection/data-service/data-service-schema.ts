export enum CrudOperation {
  Create = 'create',
  Read = 'read',
  ReadCollection = 'readCollection',
  Update = 'update',
  Delete = 'delete'
}

export enum DataServiceBackend {
  None = 'none',
  Http = 'http',
  LocalStorage = 'localStorage'
}

export class DataServiceSchema {
  dataService: string;
  methodBackend: DataServiceBackend;
  skipFormat?: boolean;
}

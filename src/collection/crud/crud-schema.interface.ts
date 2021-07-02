import { DataServiceBackend } from '../data-service/data-service-schema';

export interface CrudSchema {
  actionsPrefix?: string;
  backend?: DataServiceBackend;
  dataService: string;
  entity: string;
  mapResponse?: string;
  operation: string[];
  responseType?: string;
  stateDir: string;
  /**
   * Specifies whether to use creator NgRx syntax.
   */
  creators?: boolean;
}

import { DataServiceBackend } from '../data-service/data-service-schema';

export interface CrudSchema {
  actionsPrefix?: string;
  backend?: DataServiceBackend;
  dataService: string;
  entity: string;
  isCollection?: boolean;
  mapResponse?: string;
  operation: string;
  responseType?: string;
  stateDir: string;
}

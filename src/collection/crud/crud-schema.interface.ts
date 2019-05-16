export interface CrudSchema {
  actionsPrefix?: string;
  dataService: string;
  entity: string;
  isCollection?: boolean;
  operation: string;
  stateDir: string;
  responseType?: string;
  mapResponse?: string;
}

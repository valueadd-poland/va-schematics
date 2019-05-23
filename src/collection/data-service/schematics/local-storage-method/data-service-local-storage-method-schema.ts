import { CrudOperation, DataServiceSchema } from '../../data-service-schema';

export class DataServiceLocalStorageMethodSchema extends DataServiceSchema {
  collection?: boolean;
  entity: string;
  methodName?: string;
  methodProperties?: string;
  methodReturnType?: string;
  operation: CrudOperation;
}

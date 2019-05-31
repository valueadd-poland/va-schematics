import { CrudOperation, DataServiceSchema } from '../../data-service-schema';

export class DataServiceHttpMethodSchema extends DataServiceSchema {
  collection?: boolean;
  entity: string;
  httpResponse: string;
  methodName?: string;
  methodProperties?: string;
  methodReturnType?: string;
  operation: CrudOperation;
  responseMap: string;
  skipTest?: boolean;
}

import { DataServiceSchema } from '../../data-service-schema';

export class DataServiceEmptyMethodSchema extends DataServiceSchema {
  methodName: string;
  methodProperties?: string;
  methodReturnType?: string;
  skipTests?: boolean;
}

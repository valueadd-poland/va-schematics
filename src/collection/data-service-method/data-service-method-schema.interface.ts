export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DataServiceMethodSchema {
  dataServiceFilePath: string;
  httpMethod: HttpMethod;
  name: string;
  properties?: string;
  responseType?: string;
  returnType?: string;
  mapResponse?: string;
}

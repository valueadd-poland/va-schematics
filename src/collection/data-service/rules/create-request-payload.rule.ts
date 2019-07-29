import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insertTypeImport } from '../../../utils/import.utils';
import { CrudOperation } from '../data-service-schema';
import { getRequestPayloadClass, getRequestPayloadPath } from '../utils/request-payload.utils';

function getRequestPayloadProperties(operation: CrudOperation, entity: string): string {
  switch (operation) {
    case CrudOperation.Update:
    case CrudOperation.Create: {
      return `data: ${entity};`;
    }

    case CrudOperation.Read:
    case CrudOperation.Delete: {
      return `id: string | number;`;
    }

    default:
      return '';
  }
}

function getRequestPayloadTemplate(
  operation: CrudOperation,
  requestPayload: string,
  entity: string
): string {
  const props = getRequestPayloadProperties(operation, entity);

  return `
  ${props === '' ? '// tslint:disable-next-line:no-empty-interface' : ''}
  export interface ${requestPayload} {
    ${props}
  }
`;
}

export function createRequestPayload(
  operation: CrudOperation,
  dataService: string,
  methodName: string,
  entity: string
): Rule {
  return (host: Tree, context: SchematicContext) => {
    const requestPayload = getRequestPayloadClass(methodName);
    const requestPayloadPath = getRequestPayloadPath(dataService, requestPayload);

    if (host.exists(requestPayloadPath)) {
      context.logger.warn(`${requestPayload} already exists.`);
      return host;
    }

    // Request payload does not exist, create it
    context.logger.info(`Creating a ${requestPayload}.`);
    host.create(requestPayloadPath, getRequestPayloadTemplate(operation, requestPayload, entity));
    if (operation === CrudOperation.Create || operation === CrudOperation.Update) {
      insertTypeImport(host, requestPayloadPath, entity);
    }

    return host;
  };
}

import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { addExportAstrix, insert } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { CrudOperation } from '../data-service-schema';
import {
  getRequestPayloadClass,
  getRequestPayloadFileName,
  getRequestPayloadPath,
  getRequestPayloadsBarrelPath
} from '../utils/request-payload.utils';

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
  }
}

function getRequestPayloadTemplate(
  operation: CrudOperation,
  requestPayload: string,
  entity: string
): string {
  const props = getRequestPayloadProperties(operation, entity);

  return `
  export interface ${requestPayload} {
    ${props}
  }
`;
}

function getRequestPayloadBarrelExportDeclarationTemplate(requestPayload: string): string {
  const fileName = getRequestPayloadFileName(requestPayload).slice(0, -3);
  return `export * from './${fileName}';\n`;
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
    const requestPayloadsBarrelPath = getRequestPayloadsBarrelPath(dataService);

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

    if (host.exists(requestPayloadsBarrelPath)) {
      context.logger.info(`Adding an export to request payloads barrel.`);
      insert(host, requestPayloadsBarrelPath, [
        addExportAstrix(
          host,
          requestPayloadsBarrelPath,
          `./${getRequestPayloadFileName(requestPayload).slice(0, -3)}`
        )
      ]);
    } else {
      // Barrel file does not exist, create it
      context.logger.info(`Creating a request payloads barrel.`);
      host.create(
        requestPayloadsBarrelPath,
        getRequestPayloadBarrelExportDeclarationTemplate(requestPayload)
      );
    }

    return host;
  };
}

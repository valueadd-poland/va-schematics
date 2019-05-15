import { normalize } from '@angular-devkit/core';
import {
  chain,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree
} from '@angular-devkit/schematics';
import { findDeclarationFileByName } from '../../utils/import.utils';
import { parseStateDir, StateFilePaths } from '../../utils/options-parsing.utils';
import { formatFiles } from '../../utils/rules/format-files';
import { CrudSchema } from './crud-schema.interface';
import { CrudOptions } from './index';
import { crudActions } from './rules/crud-actions.rule';
import { crudDataServiceMethods } from './rules/crud-data-service-methods.rule';
import { crudReducer } from './rules/crud-reducer.rule';

export interface CrudOptions {
  actionPrefix: string;
  dataServicePath: string;
  entity: {
    path: string;
    name: string;
  };
  isCollection: boolean;
  response: {
    create: {
      type: string;
      map: string;
    };
    read: {
      type: string;
      map: string;
    };
    update: {
      type: string;
      map: string;
    };
    delete: {
      type: string;
      map: string;
    };
  };
  stateDir: StateFilePaths;
  statePath: string;
  toGenerate: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

export function parseOptions(host: Tree, options: CrudSchema): CrudOptions {
  const {
    stateDir,
    operation,
    actionsPrefix,
    dataService,
    entity,
    isCollection,
    responseType,
    mapResponse
  } = options;

  const entityPath = findDeclarationFileByName(host, entity);

  if (!entityPath.length) {
    throw new SchematicsException(`Entity ${entity} not found in the project.`);
  }

  const dataServicePath = normalize(dataService);

  if (!host.get(dataServicePath)) {
    throw new SchematicsException(`File ${dataServicePath} not found.`);
  }

  const mapResponseParts: string[] = mapResponse ? mapResponse.split(',') : [];
  const responseTypeParts: string[] = responseType ? responseType.split(',') : [];
  const createMapResponse = mapResponseParts.find(mrp => mrp.startsWith('c:'));
  const readMapResponse = mapResponseParts.find(mrp => mrp.startsWith('r:'));
  const updateMapResponse = mapResponseParts.find(mrp => mrp.startsWith('u:'));
  const deleteMapResponse = mapResponseParts.find(mrp => mrp.startsWith('d:'));
  const createResponseType = responseTypeParts.find(rtp => rtp.startsWith('c:'));
  const readResponseType = responseTypeParts.find(rtp => rtp.startsWith('r:'));
  const updateResponseType = responseTypeParts.find(rtp => rtp.startsWith('u:'));
  const deleteResponseType = responseTypeParts.find(rtp => rtp.startsWith('d:'));

  return {
    response: {
      create: {
        type: responseTypeParts.length > 1 ? createResponseType || '' : responseType || '',
        map: mapResponseParts.length > 1 ? createMapResponse || '' : mapResponse || ''
      },
      read: {
        type: responseTypeParts.length > 1 ? readResponseType || '' : responseType || '',
        map: mapResponseParts.length > 1 ? readMapResponse || '' : mapResponse || ''
      },
      update: {
        type: responseTypeParts.length > 1 ? updateResponseType || '' : responseType || '',
        map: mapResponseParts.length > 1 ? updateMapResponse || '' : mapResponse || ''
      },
      delete: {
        type: responseTypeParts.length > 1 ? deleteResponseType || '' : responseType || '',
        map: mapResponseParts.length > 1 ? deleteMapResponse || '' : ''
      }
    },
    actionPrefix: actionsPrefix || entity,
    stateDir: parseStateDir(stateDir, host),
    toGenerate: {
      create: operation.includes('c'),
      read: operation.includes('r'),
      update: operation.includes('u'),
      delete: operation.includes('d')
    },
    dataServicePath,
    entity: {
      path: entityPath[0],
      name: entity
    },
    isCollection: !!isCollection,
    statePath: stateDir
  };
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function crud(options: CrudSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info('Parsing provided options.');
    const crudOptions = parseOptions(host, options);

    return chain([
      crudDataServiceMethods(crudOptions),
      crudActions(crudOptions),
      crudReducer(crudOptions),
      formatFiles()
    ])(host, context);
  };
}

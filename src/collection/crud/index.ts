import { normalize } from '@angular-devkit/core';
import {
  chain,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree
} from '@angular-devkit/schematics';
import * as ts from 'typescript';
import { findNode, findNodes } from '../../utils/ast.utils';
import { findDeclarationFileByName } from '../../utils/import.utils';
import { Names, names } from '../../utils/name.utils';
import { createActionAliasName } from '../../utils/naming.utils';
import { parseStateDir, StateFilePaths } from '../../utils/options-parsing.utils';
import { formatFiles } from '../../utils/rules/format-files';
import {
  findClassNameInFile,
  findDeclarationNodeByPartialName,
  findNamespaceName,
  readIntoSourceFile
} from '../../utils/ts.utils';
import { DataServiceBackend } from '../data-service/data-service-schema';
import { CrudSchema } from './crud-schema.interface';
import { crudActions } from './rules/crud-actions.rule';
import { crudDataServiceMethods } from './rules/crud-data-service-methods.rule';
import { crudEffects } from './rules/crud-effects.rule';
import { crudFacadeSpec } from './rules/crud-facade-spec.rule';
import { crudFacade } from './rules/crud-facade.rule';
import { crudReducer } from './rules/crud-reducer.rule';

export interface CrudGenerate {
  create: boolean;
  read: boolean;
  readCollection: boolean;
  update: boolean;
  delete: boolean;
}

export interface CrudOptions {
  actionPrefix: string;
  actionsImportName: string;
  dataService: {
    names: Names;
    path: string;
    backend: DataServiceBackend;
  };
  effects: {
    name: string;
  };
  entity: {
    path: string;
    name: string;
  };
  facade: {
    queryName: string;
  };
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
  statePartialName: string;
  statePath: string;
  toGenerate: CrudGenerate;
  creators: boolean;
}

// tslint:disable-next-line:cognitive-complexity
export function parseOptions(host: Tree, options: CrudSchema): CrudOptions {
  const {
    stateDir,
    operation,
    actionsPrefix,
    dataService,
    entity,
    responseType,
    mapResponse,
    backend
  } = options;

  const parsedStateDir = parseStateDir(stateDir, host);
  const entityPath = findDeclarationFileByName(host, entity);

  if (!entityPath.length) {
    throw new SchematicsException(`Entity ${entity} not found in the project.`);
  }

  const dataServicePath = normalize(dataService);

  if (!host.get(dataServicePath)) {
    throw new SchematicsException(`File ${dataServicePath} not found.`);
  }

  const reducerSourceFile = readIntoSourceFile(host, parsedStateDir.reducer);
  const statePartialNode = findDeclarationNodeByPartialName(reducerSourceFile, 'PartialState');

  if (!statePartialNode) {
    throw new SchematicsException(`PartialState not found in ${parsedStateDir.reducer}`);
  }
  const identifierNode = statePartialNode
    .getChildren()
    .find(n => n.kind === ts.SyntaxKind.Identifier) as ts.Identifier;
  const partialStateName = identifierNode.getText();

  const queryVariableStatementNode = findNodes(
    readIntoSourceFile(host, parsedStateDir.selectors),
    ts.SyntaxKind.VariableStatement
  )
    .map(n => findNode(n, ts.SyntaxKind.Identifier))
    .filter(n => (n ? n.getText().includes('Query') : false))[0];

  if (!queryVariableStatementNode) {
    throw new SchematicsException(
      `Query variable declaration not found in ${parsedStateDir.selectors}`
    );
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
    actionsImportName: options.creators
      ? createActionAliasName(parsedStateDir.actions)
      : findNamespaceName(host, parsedStateDir.actions),
    effects: {
      name: findClassNameInFile(host, parsedStateDir.effects)
    },
    facade: {
      queryName: queryVariableStatementNode.getText()
    },
    response: {
      create: {
        type:
          responseTypeParts.length > 1
            ? createResponseType
              ? createResponseType.substring(2)
              : ''
            : responseType || '',
        map:
          mapResponseParts.length > 1
            ? createMapResponse
              ? createMapResponse.substring(2)
              : ''
            : mapResponse || ''
      },
      read: {
        type:
          responseTypeParts.length > 1
            ? readResponseType
              ? readResponseType.substring(2)
              : ''
            : responseType || '',
        map:
          mapResponseParts.length > 1
            ? readMapResponse
              ? readMapResponse.substring(2)
              : ''
            : mapResponse || ''
      },
      update: {
        type:
          responseTypeParts.length > 1
            ? updateResponseType
              ? updateResponseType.substring(2)
              : ''
            : responseType || '',
        map:
          mapResponseParts.length > 1
            ? updateMapResponse
              ? updateMapResponse.substring(2)
              : ''
            : mapResponse || ''
      },
      delete: {
        type:
          responseTypeParts.length > 1
            ? deleteResponseType
              ? deleteResponseType.substring(2)
              : ''
            : responseType || '',
        map:
          mapResponseParts.length > 1
            ? deleteMapResponse
              ? deleteMapResponse.substring(2)
              : ''
            : ''
      }
    },
    actionPrefix: actionsPrefix || entity,
    stateDir: parsedStateDir,
    statePartialName: partialStateName,
    toGenerate: {
      create: operation.includes('Create'),
      read: operation.includes('Read'),
      readCollection: operation.includes('ReadCollection'),
      update: operation.includes('Update'),
      delete: operation.includes('Delete')
    },
    dataService: {
      names: names(findClassNameInFile(host, dataServicePath)),
      path: dataServicePath,
      backend: (backend as DataServiceBackend) || DataServiceBackend.Http
    },
    entity: {
      path: entityPath[0],
      name: entity
    },
    statePath: stateDir,
    creators: options.creators || false
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
      crudEffects(crudOptions),
      crudFacade(crudOptions),
      crudFacadeSpec(crudOptions),
      formatFiles()
    ])(host, context);
  };
}

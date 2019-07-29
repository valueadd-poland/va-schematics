import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { CrudOperation, DataServiceBackend } from '../../data-service/data-service-schema';
import { dataServiceHttpMethod } from '../../data-service/schematics/http-method/index';
import { dataServiceLocalStorageMethod } from '../../data-service/schematics/local-storage-method/index';
import { CrudOptions } from '../index';

function createDataServiceMethodRules(options: CrudOptions): Rule[] {
  const { toGenerate, response, dataService, entity } = options;
  const backend = options.dataService.backend;
  const rules: Rule[] = [];

  const baseConfig = {
    skipTest: false,
    skipFormat: true,
    methodBackend:
      backend === DataServiceBackend.Http
        ? DataServiceBackend.Http
        : DataServiceBackend.LocalStorage,
    entity: entity.name,
    collection: false,
    dataService: dataService.path
  };

  if (toGenerate.read) {
    rules.push(
      backend === DataServiceBackend.Http
        ? dataServiceHttpMethod({
            ...baseConfig,
            operation: CrudOperation.Read,
            httpResponse: response.read.type,
            responseMap: response.read.map
          })
        : dataServiceLocalStorageMethod({
            ...baseConfig,
            operation: CrudOperation.Read
          })
    );
  }

  if (toGenerate.readCollection) {
    const collectionResponseType = response.read.type.split('>');
    for (let i = collectionResponseType.length - 1; i >= 0; i--) {
      if (collectionResponseType[i] !== '') {
        collectionResponseType[i] += '[]';
        break;
      }
    }

    rules.push(
      backend === DataServiceBackend.Http
        ? dataServiceHttpMethod({
            ...baseConfig,
            collection: true,
            operation: CrudOperation.ReadCollection,
            httpResponse: collectionResponseType.join('>'),
            responseMap: response.read.map
          })
        : dataServiceLocalStorageMethod({
            ...baseConfig,
            collection: true,
            operation: CrudOperation.Read
          })
    );
  }

  if (toGenerate.create) {
    rules.push(
      backend === DataServiceBackend.Http
        ? dataServiceHttpMethod({
            ...baseConfig,
            operation: CrudOperation.Create,
            httpResponse: response.create.type,
            responseMap: response.create.map
          })
        : dataServiceLocalStorageMethod({
            ...baseConfig,
            operation: CrudOperation.Create
          })
    );
  }

  if (toGenerate.update) {
    rules.push(
      backend === DataServiceBackend.Http
        ? dataServiceHttpMethod({
            ...baseConfig,
            operation: CrudOperation.Update,
            httpResponse: response.update.type,
            responseMap: response.update.map
          })
        : dataServiceLocalStorageMethod({
            ...baseConfig,
            operation: CrudOperation.Update
          })
    );
  }

  if (toGenerate.delete) {
    rules.push(
      backend === DataServiceBackend.Http
        ? dataServiceHttpMethod({
            ...baseConfig,
            operation: CrudOperation.Delete,
            httpResponse: response.delete.type,
            responseMap: response.delete.map,
            methodReturnType: 'Observable<void>'
          })
        : dataServiceLocalStorageMethod({
            ...baseConfig,
            operation: CrudOperation.Delete,
            methodReturnType: 'Observable<null>'
          })
    );
  }

  return rules;
}

export function crudDataServiceMethods(options: CrudOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`Generating crud methods in data service.`);

    return chain(createDataServiceMethodRules(options))(host, context);
  };
}

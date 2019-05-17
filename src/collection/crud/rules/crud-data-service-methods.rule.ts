import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { dataServiceMethod } from '../../data-service-method';
import { CrudOptions } from '../index';

function createDataServiceMethodRules(options: CrudOptions): Rule[] {
  const { toGenerate, isCollection, entity, dataService, response } = options;
  const rules: Rule[] = [];

  if (toGenerate.read) {
    rules.push(
      dataServiceMethod({
        httpMethod: 'GET',
        properties: isCollection ? '' : 'id:string',
        mapResponse: response.read.map,
        name: `get${entity.name}${isCollection ? 's' : ''}`,
        dataServiceFilePath: dataService.path,
        returnType: entity.name,
        responseType: response.read.type,
        skipFormat: true
      })
    );
  }

  if (toGenerate.create) {
    rules.push(
      dataServiceMethod({
        httpMethod: 'POST',
        properties: `data:${entity.name}`,
        mapResponse: response.create.map,
        name: `create${entity.name}`,
        dataServiceFilePath: dataService.path,
        returnType: entity.name,
        responseType: response.create.type,
        skipFormat: true
      })
    );
  }

  if (toGenerate.update) {
    rules.push(
      dataServiceMethod({
        httpMethod: 'PUT',
        properties: `data:${entity.name}`,
        mapResponse: response.update.map,
        name: `update${entity.name}`,
        dataServiceFilePath: dataService.path,
        returnType: entity.name,
        responseType: response.update.type,
        skipFormat: true
      })
    );
  }

  if (toGenerate.delete) {
    rules.push(
      dataServiceMethod({
        httpMethod: 'DELETE',
        properties: `id:string`,
        mapResponse: response.delete.map,
        name: `remove${entity.name}`,
        dataServiceFilePath: dataService.path,
        returnType: entity.name,
        responseType: response.delete.type,
        skipFormat: true
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

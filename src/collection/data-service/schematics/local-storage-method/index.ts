import { normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NoopChange } from '@schematics/angular/utility/change';
import { insert, insertImport } from '../../../../utils/ast.utils';
import {
  getDefaultCrudMethodName,
  getDefaultCrudMethodProperties,
  getDefaultCrudMethodReturnType,
  getDefualtCrudMethodPropertyMapping,
  insertMethod,
  insertPropertyToDictionaryField
} from '../../../../utils/class.utils';
import { insertTypeImport } from '../../../../utils/import.utils';
import { toPropertyName } from '../../../../utils/name.utils';
import { parseTypedProperties } from '../../../../utils/options-parsing.utils';
import { formatFiles } from '../../../../utils/rules/format-files';
import { readIntoSourceFile } from '../../../../utils/ts.utils';
import { config } from '../../../config';
import { CrudOperation } from '../../data-service-schema';
import { createRequestPayload } from '../../rules/create-request-payload.rule';
import { getRequestPayloadClass } from '../../utils/request-payload.utils';
import { DataServiceLocalStorageMethodSchema } from './data-service-local-storage-method-schema';

export type Options = {
  [P in keyof DataServiceLocalStorageMethodSchema]-?: DataServiceLocalStorageMethodSchema[P];
} & {
  mapProperty: string;
};

function localStorageMethodBodyTemplate(options: Options): string {
  const { mapProperty, operation, entity } = options;
  const entityPropertyName = toPropertyName(entity);
  const methodProperties = parseTypedProperties(options.methodProperties || '');

  switch (operation) {
    case CrudOperation.Read: {
      return `
          return LocalStorageClient.get(this.collections.${entityPropertyName}${
        methodProperties.length ? ', ' + methodProperties[0].name + mapProperty : ''
      });
        `;
    }

    case CrudOperation.ReadCollection: {
      return `
          return LocalStorageClient.getAll(this.collections.${entityPropertyName}${
        methodProperties.length ? ', ' + methodProperties[0].name + mapProperty : ''
      });
        `;
    }

    case CrudOperation.Update: {
      return `return LocalStorageClient.update(this.collections.${entityPropertyName}${
        methodProperties.length ? ', ' + methodProperties[0].name + mapProperty : ''
      });`;
    }

    case CrudOperation.Create: {
      return `return LocalStorageClient.save(this.collections.${entityPropertyName}${
        methodProperties.length ? ', ' + methodProperties[0].name + mapProperty : ''
      });`;
    }

    case CrudOperation.Delete: {
      return `return LocalStorageClient.remove(this.collections.${entityPropertyName}${
        methodProperties.length ? ', ' + methodProperties[0].name + mapProperty : ''
      });`;
    }
  }
}

function parseSchema(schema: DataServiceLocalStorageMethodSchema): Options {
  const collection = schema.collection || false;
  const methodName = getDefaultCrudMethodName(schema.operation, schema.entity);
  const methodProperties = getDefaultCrudMethodProperties(methodName, schema.operation, collection);

  return {
    dataService: normalize(schema.dataService),
    methodBackend: schema.methodBackend,
    skipFormat: schema.skipFormat || false,
    collection: schema.collection || false,
    entity: schema.entity,
    methodName: schema.methodName || methodName,
    methodProperties: schema.methodProperties || methodProperties,
    methodReturnType:
      schema.methodReturnType || getDefaultCrudMethodReturnType(schema.entity, collection),
    operation: schema.operation,
    mapProperty: schema.methodProperties
      ? ''
      : getDefualtCrudMethodPropertyMapping(schema.operation)
  };
}

export function dataServiceLocalStorageMethod(options: DataServiceLocalStorageMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const parsedOptions = parseSchema(options);
    context.logger.info(
      `Creating a ${parsedOptions.operation} method named ${parsedOptions.methodName}.`
    );

    const sourceFile = readIntoSourceFile(host, parsedOptions.dataService);
    const entityPropertyName = toPropertyName(parsedOptions.entity);

    insert(host, parsedOptions.dataService, [
      insertPropertyToDictionaryField(
        host,
        parsedOptions.dataService,
        config.dataServiceMethod.collectionsField,
        `${entityPropertyName}: '${entityPropertyName}'`
      ),
      insertMethod(
        host,
        context,
        parsedOptions.dataService,
        parsedOptions,
        localStorageMethodBodyTemplate(parsedOptions)
      ),
      insertImport(sourceFile, parsedOptions.dataService, 'Observable', 'rxjs'),
      insertImport(sourceFile, parsedOptions.dataService, 'LocalStorageClient', '@valueadd/common'),
      parsedOptions.collection
        ? new NoopChange()
        : insertImport(
            sourceFile,
            parsedOptions.dataService,
            getRequestPayloadClass(parsedOptions.methodName),
            '../resources/request-payloads'
          )
    ]);
    insertTypeImport(host, parsedOptions.dataService, parsedOptions.entity);

    const rules: Rule[] = [];

    if (!parsedOptions.collection) {
      rules.push(
        createRequestPayload(
          parsedOptions.operation,
          parsedOptions.dataService,
          parsedOptions.methodName,
          parsedOptions.entity
        )
      );
    }

    return chain([...rules, formatFiles({ skipFormat: parsedOptions.skipFormat })])(host, context);
  };
}

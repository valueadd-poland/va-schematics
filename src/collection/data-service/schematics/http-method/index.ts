import { normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import {
  getDefaultCrudMethodName,
  getDefaultCrudMethodProperties,
  getDefaultCrudMethodReturnType,
  getDefualtCrudMethodPropertyMapping
} from '../../../../utils/class.utils';
import { formatFiles } from '../../../../utils/rules/format-files';
import { createRequestPayload } from '../../rules/create-request-payload.rule';
import { DataServiceHttpMethodSchema } from './data-service-http-method-schema';
import { httpMethodSpec } from './rules/http-method-spec.rule';
import { httpMethod } from './rules/http-method.rule';

export type Options = {
  [P in keyof DataServiceHttpMethodSchema]-?: DataServiceHttpMethodSchema[P]
} & {
  methodPropertyMapping: string;
};

function parseSchema(schema: DataServiceHttpMethodSchema): Options {
  const collection = schema.collection || false;
  const methodName = getDefaultCrudMethodName(schema.operation, schema.entity);
  const methodProperties = getDefaultCrudMethodProperties(methodName, schema.operation, collection);

  return {
    dataService: normalize(schema.dataService),
    methodBackend: schema.methodBackend,
    skipFormat: schema.skipFormat || false,
    collection,
    entity: schema.entity,
    methodName: schema.methodName || methodName,
    methodProperties: schema.methodProperties || methodProperties,
    methodReturnType:
      schema.methodReturnType || getDefaultCrudMethodReturnType(schema.entity, collection),
    operation: schema.operation,
    methodPropertyMapping: schema.methodProperties
      ? ''
      : getDefualtCrudMethodPropertyMapping(schema.operation),
    httpResponse: schema.httpResponse || 'any',
    responseMap: schema.responseMap || '',
    skipTest: schema.skipTest || false
  };
}

export function dataServiceHttpMethod(options: DataServiceHttpMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const parsedOptions = parseSchema(options);
    context.logger.info(
      `Creating a ${parsedOptions.operation} method named ${parsedOptions.methodName}.`
    );

    const rules: Rule[] = [httpMethod(parsedOptions), httpMethodSpec(parsedOptions)];

    rules.push(
      createRequestPayload(
        parsedOptions.operation,
        parsedOptions.dataService,
        parsedOptions.methodName,
        parsedOptions.entity
      )
    );

    return chain([...rules, formatFiles({ skipFormat: parsedOptions.skipFormat })])(host, context);
  };
}

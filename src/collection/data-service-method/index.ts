import { normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatFiles } from '../../utils/rules/format-files';
import { readIntoSourceFile } from '../../utils/ts.utils';
import { DataServiceMethodSchema } from './data-service-method-schema.interface';
import { addMethodSpec } from './rules/add-method-spec.rule';
import { addMethod } from './rules/add-method.rule';
import { updateConstructor } from './rules/update-constructor.rule';
import { updateEndpoints } from './rules/update-endpoints.rule';

function normalizeOptions(options: DataServiceMethodSchema): DataServiceMethodSchema {
  return {
    ...options,
    httpMethod: options.httpMethod.toUpperCase() as any,
    dataServiceFilePath: normalize(options.dataServiceFilePath)
  };
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function dataServiceMethod(options: DataServiceMethodSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    options = normalizeOptions(options);

    if (!host.get(options.dataServiceFilePath)) {
      throw new Error(`Data service does not exist (${options.dataServiceFilePath}).`);
    }

    const dataServiceSourceFile = readIntoSourceFile(host, options.dataServiceFilePath);

    return chain([
      updateEndpoints(dataServiceSourceFile, options),
      updateConstructor(options),
      addMethod(options),
      addMethodSpec(options),
      formatFiles()
    ])(host, context);
  };
}

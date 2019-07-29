import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { insert, insertImport } from '../../../../../utils/ast.utils';
import { insertMethod, insertPropertyToDictionaryField } from '../../../../../utils/class.utils';
import { insertConstructorArguments } from '../../../../../utils/constructor.utils';
import { insertTypeImport } from '../../../../../utils/import.utils';
import { toFileName } from '../../../../../utils/name.utils';
import { parseTypedProperties } from '../../../../../utils/options-parsing.utils';
import { readIntoSourceFile } from '../../../../../utils/ts.utils';
import { config } from '../../../../config';
import { CrudOperation } from '../../../data-service-schema';
import { importMethodTypes } from '../../../utils/import-method-types.util';
import { getRequestPayloadClass } from '../../../utils/request-payload.utils';
import { Options } from '../index';

function httpMethodBodyTemplate(options: Options): string {
  const { responseMap, methodName, methodPropertyMapping, operation, httpResponse } = options;
  const methodProperties = parseTypedProperties(options.methodProperties || '');
  const pipe = responseMap ? `.pipe(map(res => res.${responseMap}))` : '';
  const propertyMapping = `${
    methodProperties.length ? ', ' + methodProperties[0].name + methodPropertyMapping : ''
  }`;

  switch (operation) {
    case CrudOperation.Read:
    case CrudOperation.ReadCollection: {
      return `
          return this.http.get<${httpResponse}>(this.endpoints.${methodName})${pipe};
        `;
    }

    case CrudOperation.Update: {
      return `return this.http.put<${httpResponse}>(this.endpoints.${methodName}${propertyMapping})${pipe};`;
    }

    case CrudOperation.Create: {
      return `return this.http
      .post<${httpResponse}>(this.endpoints.${methodName}${propertyMapping})${pipe};`;
    }

    case CrudOperation.Delete: {
      return `return this.http
      .delete<${httpResponse}>(this.endpoints.${methodName})${pipe};`;
    }
  }
}

export function httpMethod(options: Options): Rule {
  return (host: Tree, context: SchematicContext) => {
    const sourceFile = readIntoSourceFile(host, options.dataService);

    insertConstructorArguments(host, options.dataService, [
      {
        accessModifier: 'private',
        name: 'http',
        type: 'HttpClient'
      }
    ]);
    insert(host, options.dataService, [
      insertPropertyToDictionaryField(
        host,
        options.dataService,
        config.dataServiceMethod.endpointsField,
        `${options.methodName}: ''`
      ),
      insertMethod(host, context, options.dataService, options, httpMethodBodyTemplate(options)),
      insertImport(sourceFile, options.dataService, 'Observable', 'rxjs'),
      insertImport(sourceFile, options.dataService, 'HttpClient', '@angular/common/http'),
      insertImport(sourceFile, options.dataService, 'map', 'rxjs/operators'),
      insertImport(
        sourceFile,
        options.dataService,
        getRequestPayloadClass(options.methodName),
        `../resources/request-payloads/${toFileName(options.methodName)}.request-payload`
      )
    ]);
    insertTypeImport(host, options.dataService, options.entity);
    importMethodTypes(host, options, options.dataService);
  };
}

import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange, NoopChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { getSourceNodes, insert, insertImport } from '../../../utils/ast.utils';
import { insertTypeImport } from '../../../utils/import.utils';
import { isBaseType, readIntoSourceFile } from '../../../utils/ts.utils';
import { DataServiceMethodSchema } from '../data-service-method-schema.interface';

export interface MethodProperty {
  name: string;
  type: string;
}

function parseMethodProperties(methodProperties: string): MethodProperty[] {
  const props = methodProperties ? methodProperties.split(',') : [];
  return props.map(prop => {
    const p = prop.split(':');
    return {
      name: p[0],
      type: p[1] || 'any'
    };
  });
}

function createMethodDefinition(options: DataServiceMethodSchema): string {
  const { name, httpMethod, mapResponse, properties, responseType, returnType } = options;
  const methodProperties = parseMethodProperties(properties || '');
  const methodPropertiesToInsert = methodProperties.map(mp => `${mp.name}: ${mp.type}`).join(', ');

  return `
${name}(${methodPropertiesToInsert}): Observable<${returnType || 'any'}> {
  return this.http.${httpMethod.toLowerCase()}<${responseType || 'any'}>(this.endpoints.${name}${
    httpMethod !== 'GET' && methodProperties.length
      ? ', {' +
        methodProperties.map(mp => (isBaseType(mp.type) ? mp.name : '...' + mp.name)).join(',') +
        '}'
      : ''
  })${mapResponse ? '.pipe(map(res => res.' + mapResponse + '))' : ''};
}
`;
}

function createMethodForInjection(options: DataServiceMethodSchema, nodes: ts.Node[]): Change {
  const { dataServiceFilePath } = options;
  const classNode = nodes.find(n => n.kind === ts.SyntaxKind.ClassKeyword);

  if (!classNode) {
    throw new SchematicsException(`expected class in ${dataServiceFilePath}`);
  }

  if (!classNode.parent) {
    throw new SchematicsException(`expected class in ${dataServiceFilePath} to have a parent node`);
  }

  let siblings = classNode.parent.getChildren();
  const classIndex = siblings.indexOf(classNode);

  siblings = siblings.slice(classIndex);

  const classIdentifierNode = siblings.find(n => n.kind === ts.SyntaxKind.Identifier);

  if (!classIdentifierNode) {
    throw new SchematicsException(`expected class in ${dataServiceFilePath} to have an identifier`);
  }

  const classDeclaration = nodes.find(
    n => n.kind === ts.SyntaxKind.ClassDeclaration
  ) as ts.ClassDeclaration;

  const toAdd = createMethodDefinition(options);
  return new InsertChange(dataServiceFilePath, classDeclaration.end - 1, toAdd);
}

function createImportsForTypes(host: Tree, options: DataServiceMethodSchema): void {
  const methodProperties = parseMethodProperties(options.properties || '');

  methodProperties.forEach(prop => {
    insertTypeImport(host, options.dataServiceFilePath, prop.type);
  });

  if (
    options.returnType &&
    methodProperties.findIndex(mp => mp.type === options.returnType) === -1
  ) {
    insertTypeImport(host, options.dataServiceFilePath, options.returnType);
  }
}

export function addMethod(options: DataServiceMethodSchema): Rule {
  return (host: Tree) => {
    const sourceFile = readIntoSourceFile(host, options.dataServiceFilePath);
    const nodes = getSourceNodes(sourceFile);

    insert(host, options.dataServiceFilePath, [
      createMethodForInjection(options, nodes),
      insertImport(sourceFile, options.dataServiceFilePath, 'Observable', 'rxjs'),
      options.mapResponse
        ? insertImport(sourceFile, options.dataServiceFilePath, 'map', 'rxjs/operators')
        : new NoopChange()
    ]);

    createImportsForTypes(host, options);

    return host;
  };
}

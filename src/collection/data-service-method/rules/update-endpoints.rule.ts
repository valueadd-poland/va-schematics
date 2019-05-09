import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { insert } from '../../../utils/ast.utils';
import {
  findDeclarationNodeByName,
  findDeclarationNodeByPartialName
} from '../../../utils/ts.utils';
import { config } from '../../config';
import { DataServiceMethodSchema } from '../data-service-method-schema.interface';

function generateEndpointsField(props = ''): string {
  return `readonly ${config.dataServiceMethod.endpointsField} = {\n${props}\n};`;
}

function generateEndpointsProperty(property: string): string {
  return `${property}: ''`;
}

export function updateEndpoints(sourceFile: ts.SourceFile, options: DataServiceMethodSchema): Rule {
  return (host: Tree) => {
    const endpoints = findDeclarationNodeByName<ts.VariableDeclaration>(
      sourceFile,
      config.dataServiceMethod.endpointsField
    );

    let change: InsertChange;
    let toAdd: string;
    if (endpoints) {
      const containsProps = endpoints.initializer!.end - endpoints.initializer!.getStart() > 5;
      toAdd = generateEndpointsProperty(options.name);
      change = new InsertChange(
        options.dataServiceFilePath,
        endpoints.initializer!.end - 1,
        containsProps ? ',' + toAdd : toAdd
      );
    } else {
      const serviceNode = findDeclarationNodeByPartialName<ts.ClassDeclaration>(
        sourceFile,
        'DataService'
      );
      if (!serviceNode) {
        throw new Error(
          `Data service class declaration not found in ${options.dataServiceFilePath}`
        );
      }
      toAdd = generateEndpointsField(generateEndpointsProperty(options.name));
      change = new InsertChange(
        options.dataServiceFilePath,
        serviceNode.members.pos,
        '\n' + toAdd + '\n'
      );
    }

    insert(host, options.dataServiceFilePath, [change]);

    return host;
  };
}

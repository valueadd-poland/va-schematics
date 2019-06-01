import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { getSourceNodes, insert } from '../../../utils/ast.utils';
import { names, toPropertyName } from '../../../utils/name.utils';
import {
  parsePropsToUpdate,
  parseStateDir,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { classify } from '../../../utils/string.utils';
import {
  findClassBodyInFile,
  findNamespaceName,
  readIntoSourceFile
} from '../../../utils/ts.utils';
import { ReducerSchema } from '../reducer-schema.interface';

function getSelectorTemplate(prop: StateProperty, queryName: string): string {
  return `${toPropertyName(prop.key)}$ = this.store.pipe(select(${queryName}.get${classify(
    prop.key
  )}));\n`;
}

function getMethodTemplate(
  actionNamespace: string,
  actionName: string,
  payload: string = ''
): string {
  const actionNames = names(actionName);
  return `\n\n${actionNames.propertyName}(${payload ? 'data: ' + payload : ''}): void {
    this.store.dispatch(new ${actionNamespace}.${actionNames.className}(${payload ? 'data' : ''}));
  }`;
}

export function updateFacade(options: ReducerSchema): Rule {
  return (host: Tree, context: SchematicContext) => {
    const stateDir = parseStateDir(options.stateDir, host);
    const namespace = findNamespaceName(host, stateDir.actions);
    const stateProperties = parsePropsToUpdate(options.propsToUpdate);
    const facadeClass = findClassBodyInFile(host, stateDir.facade);
    const queryDeclarations = getSourceNodes(readIntoSourceFile(host, stateDir.selectors))
      .filter(
        node =>
          node.kind === ts.SyntaxKind.VariableDeclaration &&
          (node as ts.VariableDeclaration).name.getText().includes('Query')
      )
      .map(node => (node as ts.VariableDeclaration).name.getText());
    const queryName = queryDeclarations[queryDeclarations.length - 1];

    if (!queryName) {
      return;
    }

    const selectorChanges: Change[] = [];
    const methodChanges: Change[] = [];

    stateProperties.forEach(prop => {
      methodChanges.push(
        new InsertChange(
          stateDir.facade,
          facadeClass.getEnd(),
          getMethodTemplate(namespace, options.actionName, prop.type)
        )
      );

      selectorChanges.push(
        new InsertChange(
          stateDir.facade,
          facadeClass.getStart(),
          getSelectorTemplate(prop, queryName)
        )
      );
    });

    insert(host, stateDir.facade, [...methodChanges, ...selectorChanges]);
  };
}

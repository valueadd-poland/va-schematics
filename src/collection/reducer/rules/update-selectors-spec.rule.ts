import { Rule, Tree } from '@angular-devkit/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { findNode, findNodes, insert } from '../../../utils/ast.utils';
import {
  parsePropsToUpdate,
  StateFilePaths,
  StateProperty
} from '../../../utils/options-parsing.utils';
import { classify } from '../../../utils/string.utils';
import { ReducerSchema } from '../reducer-schema.interface';

function generateSelectorSpecTemplate(
  prop: StateProperty,
  featureKey: string,
  queryName: string
): string {
  return `\nit('get${classify(prop.key)}() should return ${prop.key} value', () => {
      const result = ${queryName}.get${classify(prop.key)}(storeState);

      expect(result).toBe(storeState[${featureKey}].${prop.key});
    });\n`;
}

function createSelectorSpec(
  selectorsSpecSourceFile: ts.SourceFile,
  selectorsSpecPath: string,
  propsToUpdate: StateProperty[]
): InsertChange[] {
  const changes: InsertChange[] = [];
  const describeNodes = findNodes(selectorsSpecSourceFile, ts.SyntaxKind.Identifier)
    .filter(node => node.getText() === 'describe')
    .map(node => node.parent);
  const lastDescribeNode = describeNodes[describeNodes.length - 1];
  const block = findNode(lastDescribeNode, ts.SyntaxKind.Block);
  const featureKey = findNodes(selectorsSpecSourceFile, ts.SyntaxKind.Identifier)
    .filter(node => node.getText().includes('_FEATURE_KEY'))[0]
    .getText();
  const queryName = findNodes(selectorsSpecSourceFile, ts.SyntaxKind.Identifier)
    .filter(node => node.getText().includes('Query'))[0]
    .getText();

  propsToUpdate.forEach(prop => {
    changes.push(
      new InsertChange(
        selectorsSpecPath,
        block!.getEnd() - 1,
        generateSelectorSpecTemplate(prop, featureKey, queryName)
      )
    );
  });

  return changes;
}

export function updateSelectorsSpec(
  selectorsSpecSourceFile: ts.SourceFile,
  stateDir: StateFilePaths,
  options: ReducerSchema
): Rule {
  return (host: Tree) => {
    const stateProperties = parsePropsToUpdate(options.propsToUpdate);

    const changes = createSelectorSpec(
      selectorsSpecSourceFile,
      stateDir.selectorsSpec,
      stateProperties
    );

    insert(host, stateDir.selectorsSpec, changes);

    return host;
  };
}

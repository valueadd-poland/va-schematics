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

function generateSelectorTemplate(prop: StateProperty, featureSelectorName: string): string {
  return `const get${classify(prop.key)} = createSelector(
  ${featureSelectorName},
  state => state.${prop.key}
);\n\n`;
}

function createSelector(
  selectorsSourceFile: ts.SourceFile,
  selectorsPath: string,
  propsToUpdate: StateProperty[]
): InsertChange[] {
  const changes: InsertChange[] = [];
  const featureSelectorName = findNodes(selectorsSourceFile, ts.SyntaxKind.VariableDeclarationList)
    .filter((node: ts.VariableDeclarationList) => node.getText().includes('createFeatureSelector'))
    .map((node: ts.VariableDeclarationList) => findNode(node, ts.SyntaxKind.VariableDeclaration))
    .map((node: ts.VariableDeclaration) => node.name.getText())[0];
  const queryVariableStatementNode = findNodes(
    selectorsSourceFile,
    ts.SyntaxKind.VariableStatement
  ).filter((node: ts.VariableDeclarationList) => node.getText().includes('Query'))[0];

  const queryObjectLiteralExpressionNode = findNode<ts.ObjectLiteralExpression>(
    queryVariableStatementNode,
    ts.SyntaxKind.ObjectLiteralExpression
  );
  let leadingComma = !!queryObjectLiteralExpressionNode!.properties.length;
  propsToUpdate.forEach(prop => {
    if (
      !queryObjectLiteralExpressionNode!.properties.find(
        p => p.getText() === `get${classify(prop.key)}`
      )
    ) {
      changes.push(
        new InsertChange(
          selectorsPath,
          queryVariableStatementNode.getStart(),
          generateSelectorTemplate(prop, featureSelectorName)
        ),
        new InsertChange(
          selectorsPath,
          queryObjectLiteralExpressionNode!.getEnd() - 1,
          `${leadingComma ? ',' : ''}\nget${classify(prop.key)}`
        )
      );

      leadingComma = true;
    }
  });

  return changes;
}

export function updateSelectors(
  selectorsSourceFile: ts.SourceFile,
  stateDir: StateFilePaths,
  options: ReducerSchema
): Rule {
  return (host: Tree) => {
    const stateProperties = parsePropsToUpdate(options.propsToUpdate);

    const changes = createSelector(
      selectorsSourceFile,
      stateDir.selectors,
      stateProperties
    );

    insert(host, stateDir.selectors, changes);

    return host;
  };
}

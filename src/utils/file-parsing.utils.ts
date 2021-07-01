import * as ts from 'typescript';
import { findNode, getSourceNodes } from './ast.utils';
import { findDeclarationNodeByName } from './ts.utils';

export interface CommonReducerProperties {
  initialState: ts.VariableDeclaration;
  stateInterface: ts.InterfaceDeclaration;
}

export interface ParsedReducerWithSwitch extends CommonReducerProperties {
  reducerSwitchStatement: ts.SwitchStatement;
  reducerFunction: ts.FunctionDeclaration;
}

export interface ParsedReducerWithCreator extends CommonReducerProperties {
  reducerCreatorStatement: ts.CallExpression;
  reducerDeclaration: ts.VariableDeclaration;
}

export function parseReducerWithSwitch(sourceFile: ts.SourceFile): ParsedReducerWithSwitch {
  const nodes = getSourceNodes(sourceFile);
  const commonReducerProperties = getCommonReducerProperties(nodes, sourceFile);
  const reducerFunction = nodes
    .filter(node => node.kind === ts.SyntaxKind.FunctionDeclaration)
    .filter(
      node =>
        (node as ts.FunctionDeclaration as any).name.getText().toLowerCase().includes('reducer') ||
        (node as ts.VariableLikeDeclaration as any).name.getText().toLowerCase().includes('reducer')
    )[0];
  const reducerSwitchStatement = findNode(
    reducerFunction.getChildren().filter(node => node.kind === ts.SyntaxKind.Block)[0],
    ts.SyntaxKind.SwitchStatement
  );

  return {
    initialState: commonReducerProperties.initialState,
    reducerFunction: reducerFunction as ts.FunctionDeclaration,
    reducerSwitchStatement: reducerSwitchStatement as ts.SwitchStatement,
    stateInterface: commonReducerProperties.stateInterface
  };
}

export function parseReducerWithCreator(sourceFile: ts.SourceFile): ParsedReducerWithCreator {
  const nodes = getSourceNodes(sourceFile);
  const commonReducerProperties = getCommonReducerProperties(nodes, sourceFile);
  const reducerDeclaration = nodes
    .filter(node => node.kind === ts.SyntaxKind.VariableDeclaration)
    .filter(node => {
      return (node as ts.VariableDeclaration as any).name.escapedText
        .toLocaleLowerCase()
        .includes('reducer');
    })[0];
  const reducerCreatorStatement = nodes
    .filter(node => node.kind === ts.SyntaxKind.CallExpression)
    .filter(
      node => (node as ts.CallExpression as any).expression.escapedText === 'createReducer'
    )[0];

  return {
    initialState: commonReducerProperties.initialState,
    reducerDeclaration: reducerDeclaration as ts.VariableDeclaration,
    reducerCreatorStatement: reducerCreatorStatement as ts.CallExpression,
    stateInterface: commonReducerProperties.stateInterface
  };
}

function getCommonReducerProperties(
  nodes: ts.Node[],
  sourceFile: ts.SourceFile
): CommonReducerProperties {
  const initialState = findDeclarationNodeByName<ts.VariableDeclaration>(
    sourceFile,
    'initialState'
  );
  const stateInterface = nodes
    .filter(node => node.kind === ts.SyntaxKind.InterfaceDeclaration)
    .filter(node => {
      const name = (node as ts.InterfaceDeclaration).name.getText().toLowerCase();

      return name.includes('state') && !name.includes('partialstate');
    })[0];

  return {
    initialState: initialState as ts.VariableDeclaration,
    stateInterface: stateInterface as ts.InterfaceDeclaration
  };
}

export function getSpecPath(path: string): string {
  const p = path.split('.ts');
  p.pop();
  p.push('.spec.ts');
  return p.join('');
}

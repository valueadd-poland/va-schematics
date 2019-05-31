import * as ts from 'typescript';
import { findNode, getSourceNodes } from './ast.utils';
import { findDeclarationNodeByName } from './ts.utils';

export interface ParsedReducerFile {
  initialState: ts.VariableDeclaration;
  reducerFunction: ts.FunctionDeclaration;
  reducerSwitchStatement: ts.SwitchStatement;
  stateInterface: ts.InterfaceDeclaration;
}

export function parseReducerFile(sourceFile: ts.SourceFile): ParsedReducerFile {
  const nodes = getSourceNodes(sourceFile);
  const initialState = findDeclarationNodeByName<ts.VariableDeclaration>(
    sourceFile,
    'initialState'
  );
  const reducerFunction = nodes
    .filter(node => node.kind === ts.SyntaxKind.FunctionDeclaration)
    .filter(node =>
      ((node as ts.FunctionDeclaration) as any).name
        .getText()
        .toLowerCase()
        .includes('reducer')
    )[0];
  const stateInterface = nodes
    .filter(node => node.kind === ts.SyntaxKind.InterfaceDeclaration)
    .filter(node => {
      const name = (node as ts.InterfaceDeclaration).name.getText().toLowerCase();

      return name.includes('state') && !name.includes('partialstate');
    })[0];
  const reducerSwitchStatement = findNode(
    reducerFunction.getChildren().filter(node => node.kind === ts.SyntaxKind.Block)[0],
    ts.SyntaxKind.SwitchStatement
  );

  return {
    initialState: initialState as ts.VariableDeclaration,
    reducerFunction: reducerFunction as ts.FunctionDeclaration,
    reducerSwitchStatement: reducerSwitchStatement as ts.SwitchStatement,
    stateInterface: stateInterface as ts.InterfaceDeclaration
  };
}

export function getSpecPath(path: string): string {
  const p = path.split('.ts');
  p.pop();
  p.push('.spec.ts');
  return p.join('');
}

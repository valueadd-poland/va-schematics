import { SchematicsException, Tree } from '@angular-devkit/schematics';
import * as ts from 'typescript';

export function readIntoSourceFile(host: Tree, filePath: string): ts.SourceFile {
  const text = host.read(filePath);
  if (text === null) {
    throw new SchematicsException(`File ${filePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
}

export function showTree(node: ts.Node, indent: string = '    '): void {
  console.log(indent + ts.SyntaxKind[node.kind]);

  if (node.getChildCount() === 0) {
    console.log(indent + '    Text: ' + node.getText());
  }

  for (const child of node.getChildren()) {
    showTree(child, indent + '    ');
  }
}
